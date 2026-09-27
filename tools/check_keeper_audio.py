# Author: Alex Picon <alexnpc@me.com>
"""Verify every prepared Grandma chapter plays without a generation request."""
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from tools.screenshot_apps import launch

ROOT=Path(__file__).resolve().parents[1]


def main():
    book=json.loads((ROOT/'apps/keeper/stories/lima/bread/book.json').read_text())
    assert book['prepared_audio']['chapters_per_language']==8
    for language in ['Original','Spanish']:
        for i,page in enumerate(book['pages']):
            clip=page['narrations'][f'{language}:lily']
            text=page['text'] if language=='Original' else book['translations']['Spanish']['pages'][i]['text']
            assert clip['text']==text and clip['provider']=='ElevenLabs'
            assert (ROOT/'apps/keeper'/clip['audio']).stat().st_size>1000
    with sync_playwright() as p:
        browser=launch(p);page=browser.new_page();calls=[];errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:calls.append(r.url) if '/api/keeper/voice/narrate' in r.url else None)
        page.goto('http://34.223.255.241:8888/keeper/?story=bread')
        expect(page.locator('#bookTitle')).to_have_text(book['title'])
        for language in ['Original','Spanish']:
            page.locator('#editionSelect').select_option(language)
            for i in range(8):
                page.locator(f'[data-chapter="{i}"]').click()
                expect(page.locator('#chapterAudio')).to_be_visible()
                expected=book['pages'][i]['narrations'][f'{language}:lily']['audio']
                assert page.locator('#chapterAudio').get_attribute('src')==expected
                page.wait_for_function('document.getElementById("chapterAudio").readyState>=2')
                page.locator('#chapterAudio').evaluate('(a)=>a.play()')
                page.wait_for_function('document.getElementById("chapterAudio").currentTime>0.05')
                page.locator('#chapterAudio').evaluate('(a)=>a.pause()')
            page.locator('[data-chapter="0"]').click();page.locator('#continuousReading').check()
            page.wait_for_function('Number.isFinite(document.getElementById("chapterAudio").duration)')
            page.locator('#chapterAudio').evaluate('(a)=>{a.currentTime=a.duration-0.08;return a.play();}')
            expect(page.locator('#pageCount')).to_have_text('2 / 8')
            page.locator('#chapterAudio').evaluate('(a)=>a.pause()');page.locator('#continuousReading').uncheck()
        assert not calls,calls
        assert not errors,errors
        print('PASS all 16 ElevenLabs tracks play on the public HTTP URL; both languages auto-advance without any narration API calls.')
        browser.close()


if __name__=='__main__':
    main()
