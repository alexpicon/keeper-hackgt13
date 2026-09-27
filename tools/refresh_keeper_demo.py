# Author: Alex Picon <alexnpc@me.com>
"""Refresh deck screenshots from the running app and verify language defaults."""
import hashlib
import re
import json
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'slides/keeper/img'
BASE = os.getenv('KEEPER_BASE_URL', 'http://localhost:8892').rstrip('/')


def main():
    book = json.loads((ROOT/'apps/keeper/stories/lima/bread/book.json').read_text())
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--no-sandbox'])
        page = browser.new_page(viewport={'width':1440, 'height':1000})
        errors = [];page.on('pageerror', lambda e: errors.append(str(e)))
        def shot(name):
            page.evaluate('document.fonts.ready')
            page.locator('img:visible').evaluate_all('(images)=>Promise.all(images.map(i=>i.decode().catch(()=>{})))')
            page.screenshot(path=str(OUT/name), full_page=True)
        page.goto(BASE+'/keeper/', wait_until='networkidle');shot('app-desktop.png')
        page.locator('#familyCollection').scroll_into_view_if_needed();shot('app-lima-collection.png')
        page.locator('#newBtn').click()
        page.locator('#person').fill('Grandpa');page.locator('#narrator').fill('Grandma');page.locator('#sourceProvider').fill('A grandchild')
        page.locator('#memoryText').fill(book['memory']['text']);shot('app-capture.png')
        page.goto(BASE+'/keeper/?demo=1', wait_until='networkidle')
        expect(page.locator('#narratorVoice')).to_have_value('rachel');shot('app-judge.png')
        page.locator('#judgeAction').click();page.wait_for_function('document.querySelectorAll(".spoken-word.active").length>0');shot('app-listening.png')
        page.locator('#judgeNext').click();page.locator('#judgeNext').click();shot('app-lima-faith.png')
        page.locator('#judgeNext').click();expect(page.locator('#narratorVoice')).to_have_value('tina')
        page.locator('#judgeAction').click();page.wait_for_function('document.getElementById("chapterAudio").currentTime>0.1');shot('app-spanish.png')
        page.locator('#judgeNext').click();shot('app-ending.png')
        page.locator('#translationReviewed').check();page.locator('#reviewed').check()
        with page.expect_download() as download:page.locator('#downloadBtn').click()
        export=Path('/tmp/keeper-new-voices-export.html');download.value.save_as(export)
        text=export.read_text();assert text.count('<audio controls src="data:')==8
        page.locator('#editionSelect').select_option('Original');expect(page.locator('#narratorVoice')).to_have_value('rachel')
        # A manual alternative stays selected while paging, then language switches restore defaults.
        page.locator('#narratorVoice').select_option('lily');page.locator('[data-chapter="0"]').click();expect(page.locator('#narratorVoice')).to_have_value('lily')
        page.locator('#editionSelect').select_option('Spanish');expect(page.locator('#narratorVoice')).to_have_value('tina')
        page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');shot('app-judge-mobile.png')
        page.goto(BASE+'/keeper/',wait_until='networkidle');shot('app-mobile.png')
        page.set_viewport_size({'width':1440,'height':1000})
        for slug in ['port','care']:
            page.goto(BASE+'/keeper/?story='+slug,wait_until='networkidle');shot('app-'+slug+'-story.png')
        assert not errors, errors
        browser.close()
    deck=ROOT/'slides/keeper/index.html'
    def version(match):
        asset=match.group(1)
        digest=hashlib.sha256((deck.parent/asset).read_bytes()).hexdigest()[:12]
        return asset+'?v='+digest
    deck.write_text(re.sub(r'(img/[^\"?]+\.png|keeper-demo\.mp4)(?:\?v=[a-f0-9]+)?',version,deck.read_text()))
    print('Refreshed actual-app screenshots; verified default switches, read-along, manual alternatives, and Spanish offline export.')


if __name__=='__main__':main()
