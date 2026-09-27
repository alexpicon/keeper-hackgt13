# Author: Alex Picon <alexnpc@me.com>
"""Voice and edition boundaries: source preservation, payload limits, and failures."""
import json
import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from server.routers.keeper_voice import router

app = FastAPI()
app.include_router(router)


class KeeperVoiceTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.keys = patch.dict('os.environ', {'ELEVENLABS_API_KEY': 'test', 'XAI_API_KEY': 'test'})
        self.keys.start()
        self.addCleanup(self.keys.stop)

    def provider(self, data, status=200):
        response = httpx.Response(status, json=data, request=httpx.Request('POST', 'https://provider.invalid'))
        return patch('server.routers.keeper_voice.httpx.AsyncClient.post', new=AsyncMock(return_value=response))

    def test_narration_returns_private_audio_and_timing(self):
        with self.provider({'audio_base64': 'YXVkaW8=', 'alignment': {'characters': ['H']}}):
            response = self.client.post('/api/keeper/voice/narrate', json={'text': 'Hello'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['cache-control'], 'no-store')
        self.assertEqual(response.json()['kind'], 'generated-narration')
        self.assertTrue(response.json()['audio'].startswith('data:audio/mpeg;base64,'))

    def test_voice_allowlist_and_length_limit(self):
        for payload in [{'text': 'Hello', 'voice': '../../other'}, {'text': 'x' * 5001}]:
            self.assertEqual(self.client.post('/api/keeper/voice/narrate', json=payload).status_code, 422)

    def test_missing_key_is_explicit(self):
        with patch.dict('os.environ', {'ELEVENLABS_API_KEY': ''}):
            self.assertEqual(self.client.post('/api/keeper/voice/narrate', json={'text': 'Hello'}).status_code, 503)

    def test_transcript_preserves_words_and_normalizes_browser_mime(self):
        with self.provider({'text': 'I think maybe.', 'language_code': 'eng', 'words': [{'text': 'think', 'type': 'word', 'start': 1, 'end': 2, 'speaker_id': 'speaker_0'}]}):
            response = self.client.post('/api/keeper/voice/transcribe', files={'file': ('a.webm', b'audio', 'audio/webm;codecs=opus')})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['text'], 'I think maybe.')
        self.assertEqual(response.json()['words'][0]['start'], 1)
        self.assertEqual(response.headers['cache-control'], 'no-store')

    def test_rejects_oversized_and_non_audio_uploads(self):
        with patch('server.routers.keeper_voice.MAX_AUDIO', 10):
            self.assertEqual(self.client.post('/api/keeper/voice/transcribe', files={'file': ('a.mp3', b'12345678901', 'audio/mpeg')}).status_code, 413)
        self.assertEqual(self.client.post('/api/keeper/voice/transcribe', files={'file': ('a.html', b'html', 'text/html')}).status_code, 415)
        self.assertEqual(self.client.post('/api/keeper/voice/transcribe', files={'file': ('a.mp3', b'', 'audio/mpeg')}).status_code, 422)

    def test_upstream_error_does_not_expose_response(self):
        with self.provider({'detail': 'secret credentials'}, 401):
            response = self.client.post('/api/keeper/voice/narrate', json={'text': 'Hello'})
        self.assertEqual(response.status_code, 502)
        self.assertNotIn('secret', response.text)

    def grok(self, data):
        return patch('server.routers.keeper_voice.grok_json', new=AsyncMock(return_value=data))

    def test_interview_requires_exact_source_anchor(self):
        for anchor, expected in [('Grandpa', 200), ('Paris', 502), ('', 502)]:
            with self.grok({'question': 'What do you remember?', 'anchor': anchor}):
                response = self.client.post('/api/keeper/voice/interview', json={'text': 'I remember Grandpa peeling an orange.'})
            self.assertEqual(response.status_code, expected)

    def test_translation_supports_a_twelve_chapter_book(self):
        pages = [{'title': f'Chapter {i}', 'text': 'One complete storybook chapter.'} for i in range(12)]
        with self.grok({'title': 'Story', 'pages': pages}):
            response = self.client.post('/api/keeper/voice/translate', json={'language': 'English', 'title': 'Story', 'pages': pages})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()['pages']), 12)

    def test_translation_preserves_page_count_and_requires_review(self):
        payload = {'language': 'Spanish', 'title': 'Hello', 'pages': [{'title': 'Memory', 'text': 'I think he grew oranges by the kitchen window.'}]}
        with self.grok({'title': 'Hola', 'pages': [{'title': 'Recuerdo', 'text': 'Creo que cultivaba naranjas.'}]}):
            response = self.client.post('/api/keeper/voice/translate', json=payload)
        self.assertFalse(response.json()['reviewed'])
        with self.grok({'title': 'Hola', 'pages': [{'title': 'Recuerdo', 'text': payload['pages'][0]['text']}]}):
            self.assertEqual(self.client.post('/api/keeper/voice/translate', json=payload).status_code, 502)
        with self.grok({'title': 'Hola', 'pages': []}):
            self.assertEqual(self.client.post('/api/keeper/voice/translate', json=payload).status_code, 502)
        with self.grok({'title': 'Hola', 'pages': payload['pages'] * 2}):
            self.assertEqual(self.client.post('/api/keeper/voice/translate', json=payload).status_code, 502)


if __name__ == '__main__':
    unittest.main()
