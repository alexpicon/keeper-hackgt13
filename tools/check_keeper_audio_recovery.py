# Author: Alex Picon <alexnpc@me.com>
"""Old browser copies recover matching prepared audio without overwriting edits."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
BASE='http://localhost:8892'

def main():
    original=json.loads((ROOT/'apps/keeper/stories/lima/bread/book.json').read_text())
    with sync_playwright() as p:
        browser=p.chromium.launch(args=['--no-sandbox'])
        for edited in [False,True]:
            page=browser.new_page();calls=[]
            page.route('**/api/keeper/voice/narrate',lambda r:(calls.append(r.request.url),r.abort()))
            page.goto(BASE+'/keeper/')
            old=json.loads(json.dumps(original));old.update(id='old-copy',curated=False,public_story_slug='bread',created='2026-09-27',private_changes=edited)
            for chapter in old['pages']:chapter['narrations']={}
            if edited:old['pages'][0]['text']='My private edit must remain unchanged.'
            page.evaluate('''book=>new Promise((resolve,reject)=>{const r=indexedDB.open('keeper-family-stories',2);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('books','readwrite');tx.objectStore('books').put(book);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=reject;};})''',old)
            page.goto(BASE+'/keeper/?local=old-copy')
            expect(page.locator('#narratorVoice')).to_have_value('rachel')
            if edited:
                expect(page.locator('#pageProse')).to_have_text(old['pages'][0]['text'])
                page.wait_for_timeout(700);expect(page.locator('#chapterAudio')).to_be_hidden()
                page.locator('[data-chapter="1"]').click()
            expect(page.locator('#chapterAudio')).to_be_visible()
            expect(page.locator('#narrateBtn')).to_have_text('Play narration ▶')
            page.locator('#narrateBtn').click();page.wait_for_function('document.getElementById("chapterAudio").currentTime>0.05')
            page.locator('#editionSelect').select_option('Spanish');expect(page.locator('#narratorVoice')).to_have_value('tina');expect(page.locator('#chapterAudio')).to_be_visible()
            page.locator('#narrateBtn').click();page.wait_for_function('document.getElementById("chapterAudio").currentTime>0.05')
            assert not calls,calls
            page.reload()
            if edited:
                expect(page.locator('#pageProse')).to_have_text(old['pages'][0]['text'])
                expect(page.locator('#chapterAudio')).to_be_hidden()
                page.locator('[data-chapter="1"]').click()
            expect(page.locator('#chapterAudio')).to_be_visible()
            print('PASS saved-copy recovery, persistence and zero TTS calls; private edit:',edited)
            page.close()
        browser.close()

if __name__=='__main__':main()
