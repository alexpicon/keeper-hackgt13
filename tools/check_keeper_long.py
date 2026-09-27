# Author: Alex Picon <alexnpc@me.com>
"""Verify the full-story input and long, imaginative, navigable demo book."""
import json
from pathlib import Path

from playwright.sync_api import expect, sync_playwright
from tools.screenshot_apps import launch

OUT=Path('slides/keeper/img')


def main():
    book=json.loads(Path('apps/keeper/demo/book.json').read_text())
    assert book['memory']['perspective']=='own'
    assert len(book['memory']['text'].split())>=500
    assert len(book['pages'])==8
    assert sum(len(p['text'].split()) for p in book['pages'])>=1400
    assert all(p['quote'] in book['memory']['text'] and p['adaptation'] for p in book['pages'])
    assert len({p['image'] for p in book['pages']})==8
    with sync_playwright() as p:
        browser=launch(p);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://localhost:8888/keeper/');page.wait_for_timeout(500);page.screenshot(path=str(OUT/'app-desktop.png'),full_page=True)
        page.locator('#newBtn').click();expect(page.locator('#capture')).to_be_visible()
        expect(page.locator('.optional-guide')).not_to_have_attribute('open','')
        expect(page.locator('#recordBtn')).to_contain_text('Start telling your story')
        expect(page.locator('#storyLength')).to_have_value('8');expect(page.locator('#storyStyle')).to_have_value('imaginative')
        page.locator('#storyLength').select_option('12');page.locator('#person').fill('Grandpa');page.locator('#narrator').fill('Grandpa');page.locator('#memoryText').fill(book['memory']['text']);page.wait_for_timeout(400)
        page.screenshot(path=str(OUT/'app-capture.png'),full_page=True)
        page.locator('#homeBtn').click();page.goto('http://localhost:8888/keeper/?demo=adventure');expect(page.locator('#judgePanel')).to_be_visible()
        expect(page.locator('#chapterList button')).to_have_count(8);expect(page.locator('#bookAttribution')).to_contain_text('Told by Grandpa')
        page.screenshot(path=str(OUT/'app-judge.png'),full_page=True)
        page.locator('#judgeNext').click();page.locator('#judgeAction').click();page.wait_for_function('document.querySelectorAll(".spoken-word.active").length>0')
        page.screenshot(path=str(OUT/'app-listening.png'),full_page=True)
        page.locator('[data-chapter="7"]').click();expect(page.locator('#pageCount')).to_have_text('8 / 8')
        expect(page.locator('#pageProse')).to_have_text(book['pages'][7]['text'])
        page.locator('.source-quote summary').click();expect(page.locator('.source-quote')).to_contain_text(book['pages'][7]['adaptation'])
        page.screenshot(path=str(OUT/'app-ending.png'),full_page=True)
        page.locator('#editionSelect').select_option('Spanish');expect(page.locator('#pageProse')).to_have_text(book['translations']['Spanish']['pages'][7]['text'])
        page.locator('[data-chapter="0"]').click();page.screenshot(path=str(OUT/'app-spanish.png'),full_page=True)
        page.locator('#translationReviewed').check();page.locator('#reviewed').check()
        with page.expect_download() as d:page.locator('#downloadBtn').click()
        export=Path('/tmp/keeper-long-book.html');d.value.save_as(export);html=export.read_text();assert html.count('<audio controls src="data:')==9;assert book['pages'][0]['adaptation'] in html;assert 'demo/story-' not in html
        page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(OUT/'app-judge-mobile.png'),full_page=True)
        page.locator('#homeBtn').evaluate('(b)=>b.click()');page.screenshot(path=str(OUT/'app-mobile.png'),full_page=True)
        assert not errors,errors
        print('PASS complete first-person source, 8 chapters/1400+ words, 8 images, optional prompts, length/style controls, chapter navigation, adaptation disclosures, Spanish, 9 embedded audio clips, and mobile.')
        browser.close()


if __name__=='__main__':
    main()
