# Author: Alex Picon <alexnpc@me.com>
"""Regression checks for source preservation and failure behavior."""
import json
import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

from server.routers.keeper_story import router

app = FastAPI()
app.include_router(router)

MEMORY = {"name": "Grandpa", "narrator": "Elena", "perspective": "remembered", "chapter_length": "full",
          "text": "I think Grandpa grew oranges. I remember the smell on his hands."}
DRAFT = {"title": "The oranges", "pages": [
    {"title": f"Chapter {i+1}", "text": "Elena remembers the orange trees and the uncertain details of those long summer afternoons. " * 16,
     "quote": "I think Grandpa grew oranges.", "illustration": "Watercolor of oranges",
     "adaptation": "The afternoon atmosphere is an imaginative addition."}
    for i in range(8)], "question": "Would you like to tell another story?"}


class KeeperStoryTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch.dict('os.environ', {'XAI_API_KEY': ''})
    def test_unconfigured_preserves_exact_original(self):
        result = self.client.post('/api/keeper/story', json=MEMORY).json()
        self.assertEqual(result['source'], 'original')
        self.assertEqual(result['pages'][0]['text'], MEMORY['text'])

    def test_rejects_invalid_perspective_and_short_memory(self):
        self.assertEqual(self.client.post('/api/keeper/story', json={**MEMORY, 'perspective': 'impersonate'}).status_code, 422)
        self.assertEqual(self.client.post('/api/keeper/story', json={**MEMORY, 'text': 'hi'}).status_code, 422)

    def provider(self, content):
        response = httpx.Response(200, json={'choices': [{'message': {'content': json.dumps(content)}}]}, request=httpx.Request('POST', 'https://api.x.ai'))
        return patch('server.routers.keeper_story.httpx.AsyncClient.post', new=AsyncMock(return_value=response))

    @patch.dict('os.environ', {'XAI_API_KEY': 'test'})
    def test_accepts_grounded_draft(self):
        with self.provider(DRAFT):
            result = self.client.post('/api/keeper/story', json=MEMORY).json()
        self.assertEqual(result['source'], 'ai')
        self.assertIn(result['pages'][0]['quote'], MEMORY['text'])

    @patch.dict('os.environ', {'XAI_API_KEY': 'test'})
    def test_rejects_fabricated_source_quote(self):
        draft = {**DRAFT, 'pages': [{**DRAFT['pages'][0], 'quote': 'He moved to Paris in 1932.'}, *DRAFT['pages'][1:]]}
        with self.provider(draft):
            result = self.client.post('/api/keeper/story', json=MEMORY).json()
        self.assertEqual(result['source'], 'original')
        self.assertEqual(result['pages'][0]['text'], MEMORY['text'])

    @patch.dict('os.environ', {'XAI_API_KEY': 'test'})
    def test_timeout_preserves_memory(self):
        with patch('server.routers.keeper_story.httpx.AsyncClient.post', new=AsyncMock(side_effect=httpx.ReadTimeout('slow'))):
            result = self.client.post('/api/keeper/story', json=MEMORY).json()
        self.assertEqual(result['source'], 'original')

    @patch.dict('os.environ', {'XAI_API_KEY': 'test'})
    def test_bad_model_schema_preserves_memory(self):
        with self.provider({'title': 'Broken', 'pages': []}):
            result = self.client.post('/api/keeper/story', json=MEMORY).json()
        self.assertEqual(result['source'], 'original')

    @patch.dict('os.environ', {'XAI_API_KEY': 'test'})
    def test_short_summary_is_not_a_finished_storybook(self):
        short = {**DRAFT, 'pages': [{**p, 'text': 'A very short summary.'} for p in DRAFT['pages']]}
        with self.provider(short):
            result = self.client.post('/api/keeper/story', json=MEMORY).json()
        self.assertEqual(result['source'], 'original')
        self.assertEqual(result['pages'][0]['text'], MEMORY['text'])

    @patch.dict('os.environ', {'XAI_API_KEY': 'test'})
    def test_undersized_chapters_are_developed_without_changing_quotes(self):
        short = {**DRAFT, 'pages': [{**p, 'text': 'The first telling of this chapter was too brief.'} for p in DRAFT['pages']]}
        def response(data):
            return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps(data)}}]}, request=httpx.Request('POST', 'https://api.x.ai'))
        replies = [response(short)] + [response({'text': p['text'], 'adaptation': p['adaptation']}) for p in DRAFT['pages']]
        with patch('server.routers.keeper_story.httpx.AsyncClient.post', new=AsyncMock(side_effect=replies)):
            result = self.client.post('/api/keeper/story', json=MEMORY).json()
        self.assertEqual(result['source'], 'ai')
        self.assertEqual(len(result['pages']), 8)
        self.assertTrue(all(p['quote'] == DRAFT['pages'][0]['quote'] for p in result['pages']))
        self.assertGreaterEqual(sum(len(p['text'].split()) for p in result['pages']), 1400)

    @patch.dict('os.environ', {'XAI_API_KEY': 'test'})
    def test_twelve_chapters_are_supported(self):
        with self.provider({**DRAFT, 'pages': DRAFT['pages'] + DRAFT['pages'][:4]}):
            result = self.client.post('/api/keeper/story', json={**MEMORY, 'page_count': 12}).json()
        self.assertEqual(result['source'], 'ai')
        self.assertEqual(len(result['pages']), 12)

    @patch.dict('os.environ', {'XAI_API_KEY': 'test'})
    def test_imaginative_additions_must_be_disclosed(self):
        with self.provider({**DRAFT, 'pages': [{**p, 'adaptation': ''} for p in DRAFT['pages']]}):
            result = self.client.post('/api/keeper/story', json=MEMORY).json()
        self.assertEqual(result['source'], 'original')

    @patch.dict('os.environ', {'XAI_API_KEY': 'test'})
    def test_original_storyteller_is_separate_from_family_contributor(self):
        comment = 'To me it was coincidence.'
        payload = {**MEMORY, 'narrator': 'Grandma', 'source_provider': 'Her grandchild',
                   'narrative_voice': 'storyteller', 'text': MEMORY['text'] + ' ' + comment}
        with self.provider({**DRAFT, 'family_note': {'author': 'Grandma', 'text': comment}}):
            result = self.client.post('/api/keeper/story', json=payload).json()
        self.assertEqual(result['source'], 'ai')
        self.assertEqual(result['storyteller'], 'Grandma')
        self.assertEqual(result['source_provider'], 'Her grandchild')
        self.assertEqual(result['narrative_voice'], 'storyteller')
        self.assertEqual(result['family_note'], {'author': 'Her grandchild', 'text': comment})
        self.assertTrue(all(comment not in page['text'] for page in result['pages']))

    @patch.dict('os.environ', {'XAI_API_KEY': 'test'})
    def test_fabricated_family_opinion_is_rejected(self):
        with self.provider({**DRAFT, 'family_note': {'author': 'Grandchild', 'text': 'I never believed her.'}}):
            result = self.client.post('/api/keeper/story', json=MEMORY).json()
        self.assertEqual(result['source'], 'original')

    @patch.dict('os.environ', {'XAI_API_KEY': 'test'})
    def test_concise_chapters_are_default_and_not_expanded(self):
        pages = [{**p, 'text': 'I remember the orange trees and the people who cared for them. ' * 8} for p in DRAFT['pages']]
        payload = {k: v for k, v in MEMORY.items() if k != 'chapter_length'}
        with self.provider({**DRAFT, 'pages': pages}):
            result = self.client.post('/api/keeper/story', json=payload).json()
        self.assertEqual(result['source'], 'ai')
        self.assertEqual(result['chapter_length'], 'concise')
        self.assertTrue(all(60 <= len(p['text'].split()) <= 125 for p in result['pages']))

    @patch.dict('os.environ', {'XAI_API_KEY': ''})
    def test_unconfigured_illustration_is_explicit(self):
        self.assertEqual(self.client.post('/api/keeper/story/illustration', json={'prompt': 'An orange'}).status_code, 503)


if __name__ == '__main__':
    unittest.main()
