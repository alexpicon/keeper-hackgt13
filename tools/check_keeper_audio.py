# Author: Alex Picon <alexnpc@me.com>
"""Verify every bundled reading plays with language defaults and zero TTS calls."""
import json
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.getenv('KEEPER_BASE_URL', 'http://localhost:8892').rstrip('/')
VOICES = {'Original': ('rachel','0rEo3eAjssGDUCXHYENf'), 'Spanish': ('tina','lZmnvfWF4ko4J7F7QDtX')}


def main():
    paths = sorted((ROOT/'apps/keeper/stories/lima').glob('*/book.json'))+[ROOT/'apps/keeper/demo/book.json']
    total = 0
    with sync_playwright() as p:
        browser=p.chromium.launch(args=['--no-sandbox']);page=browser.new_page();calls=[];errors=[]
        page.route('**/api/keeper/voice/narrate',lambda route:route.abort())
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:calls.append(r.url) if '/api/keeper/voice/narrate' in r.url else None)
        for path in paths:
            book=json.loads(path.read_text())
            assert book['prepared_audio']['chapters_per_language']==len(book['pages'])
            query='demo=adventure' if book.get('demo') else 'story='+path.parent.name
            page.goto(BASE+'/keeper/?'+query)
            expect(page.locator('#bookTitle')).to_have_text(book['title'])
            for language,(voice,voice_id) in VOICES.items():
                page.locator('#editionSelect').select_option(language)
                expect(page.locator('#narratorVoice')).to_have_value(voice)
                for i,chapter in enumerate(book['pages']):
                    clip=chapter['narrations'][f'{language}:{voice}']
                    text=chapter['text'] if language=='Original' else book['translations'][language]['pages'][i]['text']
                    assert clip['text']==text and clip['provider']=='ElevenLabs' and clip['voice_id']==voice_id
                    assert (ROOT/'apps/keeper'/clip['audio']).stat().st_size>1000
                    page.locator(f'[data-chapter="{i}"]').click()
                    expect(page.locator('#chapterAudio')).to_be_visible()
                    assert page.locator('#chapterAudio').get_attribute('src')==clip['audio']
                    page.wait_for_function('document.getElementById("chapterAudio").readyState>=2')
                    page.locator('#chapterAudio').evaluate('(a)=>a.play()')
                    page.wait_for_function('document.getElementById("chapterAudio").currentTime>0.05')
                    page.locator('#chapterAudio').evaluate('(a)=>a.pause()');total+=1
                page.locator('[data-chapter="0"]').click();page.locator('#continuousReading').check()
                page.wait_for_function('Number.isFinite(document.getElementById("chapterAudio").duration)')
                page.locator('#chapterAudio').evaluate('(a)=>{a.currentTime=a.duration-0.08;return a.play();}')
                expect(page.locator('#pageCount')).to_have_text('2 / 8')
                page.locator('#chapterAudio').evaluate('(a)=>a.pause()');page.locator('#continuousReading').uncheck()
            print('Verified',path.parent.name,'both voices and continuous playback.',flush=True)
        assert not calls,calls
        assert not errors,errors
        browser.close()
    print(f'PASS all {total} tracks play; language defaults and continuous playback work with zero narration API calls.')


if __name__=='__main__':main()
