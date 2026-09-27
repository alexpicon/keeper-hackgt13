# Author: Alex Picon <alexnpc@me.com>
"""Verify the featured Grandma story and default judge walkthrough end to end."""
from pathlib import Path

from playwright.sync_api import expect, sync_playwright
from tools.screenshot_apps import launch

OUT=Path('slides/keeper/img')


def main():
    with sync_playwright() as p:
        browser=launch(p);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://localhost:8888/keeper/')
        expect(page.locator('.cover-bottom p')).to_have_text('El pan que pudo traer')
        assert 'chapter-02-carmen.webp' in page.locator('.book-cover img').get_attribute('src')
        page.wait_for_timeout(300);page.screenshot(path=str(OUT/'app-desktop.png'),full_page=True)
        page.locator('#startBtn').click();expect(page.locator('#bookTitle')).to_have_text('El pan que pudo traer')
        expect(page.locator('#bookAttribution')).to_contain_text('Grandma’s telling')
        expect(page.locator('#judgePanel')).to_be_hidden()
        page.goto('http://localhost:8888/keeper/?demo=1')
        expect(page.locator('#judgePanel')).to_be_visible();expect(page.locator('#judgeTitle')).to_have_text('Let Grandma tell her story.')
        expect(page.locator('#originalAudio')).to_be_hidden()
        page.locator('#judgeAction').click();page.wait_for_function('document.querySelectorAll(".spoken-word.active").length>0')
        page.screenshot(path=str(OUT/'app-listening.png'),full_page=True)
        page.locator('#judgeNext').click();expect(page.locator('#pageCount')).to_have_text('3 / 8');expect(page.locator('#pageProse')).to_contain_text('asked for butter')
        page.locator('#judgeNext').click();expect(page.locator('#pageCount')).to_have_text('7 / 8');expect(page.locator('#pageProse')).to_contain_text('Virgen del Carmen de la Legua')
        assert 'chapter-07-carmen.webp' in page.locator('.page-art img').get_attribute('src')
        page.screenshot(path=str(OUT/'app-lima-faith.png'),full_page=True)
        page.locator('#judgeNext').click();expect(page.locator('#editionSelect')).to_have_value('Spanish');expect(page.locator('#pageCount')).to_have_text('1 / 8')
        page.locator('#judgeAction').click();page.wait_for_function('document.getElementById("chapterAudio").currentTime>0.1')
        page.screenshot(path=str(OUT/'app-spanish.png'),full_page=True)
        page.locator('#judgeNext').click();expect(page.locator('#pageCount')).to_have_text('8 / 8')
        page.screenshot(path=str(OUT/'app-ending.png'),full_page=True)
        page.locator('#translationReviewed').check();page.locator('#reviewed').check()
        with page.expect_download() as d:page.locator('#downloadBtn').click()
        target=Path('/tmp/keeper-main-export.html');d.value.save_as(target);html=target.read_text()
        assert html.count('<figure>')==8 and html.count('<audio controls src="data:')==8
        assert 'Virgen del Carmen de la Legua' in html
        assert 'A separate family note' in html and 'coincidence' in html
        assert 'fictional-source.mp3' not in html
        page.locator('#homeBtn').click();page.locator('#judgeBtn').click();expect(page.locator('#judgeTitle')).to_have_text('Let Grandma tell her story.')
        page.screenshot(path=str(OUT/'app-judge.png'),full_page=True)
        page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(OUT/'app-judge-mobile.png'),full_page=True)
        page.locator('#homeBtn').evaluate('(b)=>b.click()');page.screenshot(path=str(OUT/'app-mobile.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not errors,errors
        print('PASS featured Grandma cover, primary CTA, default demo, all 5 judge steps, Carmen icon and name, Spanish playback, eight-image offline export, and mobile.')
        browser.close()


if __name__=='__main__':
    main()
