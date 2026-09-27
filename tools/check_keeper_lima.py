# Author: Alex Picon <alexnpc@me.com>
"""Check sensitive-story provenance, collection reading, copy persistence, and export."""
import json
import hashlib
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from tools.screenshot_apps import launch

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'slides/keeper/img'


def main():
    books={slug:json.loads((ROOT/f'apps/keeper/stories/lima/{slug}/book.json').read_text()) for slug in ['bread','port','care']}
    for slug,b in books.items():
        assert len(b['pages'])==8
        assert all(80 <= len(p['text'].split()) <= 110 for p in b['pages'])
        assert len({p['image'] for p in b['pages']})==8
        assert len({hashlib.sha256((ROOT/'apps/keeper'/p['image']).read_bytes()).hexdigest() for p in b['pages']})==8
        assert b['memory']['chapter_length']=='concise'
        assert all(p['quote'] in b['memory']['text'] and p['adaptation'] for p in b['pages'])
        assert not b.get('audio'), 'Do not fabricate an original family recording'
        assert all((ROOT/'apps/keeper'/p['image']).is_file() for p in b['pages'])
    assert 'asked for butter' in books['bread']['pages'][2]['text']
    assert 'four' in books['bread']['pages'][1]['text']
    assert all('my grandfather' not in p['text'].lower() and 'my grandmother' not in p['text'].lower() for p in books['bread']['pages'])
    assert 'my husband' in books['bread']['pages'][0]['text'].lower()
    assert 'Virgen del Carmen de la Legua' in books['bread']['pages'][4]['text']
    assert 'Callao' in books['bread']['pages'][4]['text']
    assert all('Guadalupe' not in p['text'] for p in books['bread']['pages'])
    assert books['bread']['memory']['narrator']=='Grandma'
    assert len({p['image'] for p in books['bread']['pages']})==8
    assert len({hashlib.sha256((ROOT/'apps/keeper'/p['image']).read_bytes()).hexdigest() for p in books['bread']['pages']})==8
    assert books['bread']['visual_revision']=='chapter-scenes-carmen-v2'
    assert 'Virgen del Carmen de la Legua' in books['bread']['translations']['Spanish']['pages'][4]['text']
    assert books['bread']['memory']['chapter_length']=='concise'
    assert all('coincidence' not in p['text'].lower() for p in books['bread']['pages'])
    assert 'coincidence' in books['bread']['family_note']['text']
    assert 'Virgen del Carmen de la Legua' in books['bread']['pages'][6]['text']
    assert books['port']['provenance']['kind']=='inspired-fiction'
    assert books['care']['provenance']['kind']=='inspired-fiction'
    with sync_playwright() as p:
        browser=launch(p);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://localhost:8888/keeper/')
        expect(page.locator('.family-book')).to_have_count(3)
        page.wait_for_function('[...document.querySelectorAll(".family-book img")].every(i=>i.complete&&i.naturalWidth>0)')
        page.screenshot(path=str(OUT/'app-desktop.png'),full_page=True)
        page.locator('#familyCollection').screenshot(path=str(OUT/'app-lima-collection.png'))
        page.locator('[data-family-book="stories/lima/bread/book.json"]').click()
        expect(page.locator('#bookTitle')).to_have_text('El pan que pudo traer')
        expect(page.locator('#bookSource')).to_have_text('GRANDMA’S TELLING · FAMILY RECONSTRUCTION')
        expect(page.locator('#originalAudio')).to_be_hidden()
        assert 'not a family recording' in page.locator('#voiceProvenance').inner_text()
        page.locator('[data-chapter="2"]').click()
        expect(page.locator('#pageProse')).to_contain_text('asked for butter')
        page.locator('[data-chapter="6"]').click()
        expect(page.locator('#pageProse')).to_contain_text('Virgen del Carmen de la Legua')
        expect(page.locator('#pageProse')).not_to_contain_text('coincidence')
        expect(page.locator('#familyNote')).to_contain_text('coincidence')
        expect(page.locator('#familyNoteAuthor')).to_have_text('Her grandchild')
        expect(page.locator('#bookAttribution')).to_contain_text('Grandma’s telling')
        page.screenshot(path=str(OUT/'app-lima-faith.png'),full_page=True)
        page.locator('#keepBookBtn').click()
        expect(page.locator('#shelfCount')).to_have_text('1')
        page.reload();page.locator('#shelfBtn').click();expect(page.locator('.shelf-card')).to_have_count(1)
        page.get_by_role('button',name='Open book →').click();expect(page.locator('#bookSource')).to_have_text('GRANDMA’S TELLING · FAMILY RECONSTRUCTION')
        page.locator('#editionSelect').select_option('Spanish');expect(page.locator('#pageProse')).to_have_text(books['bread']['translations']['Spanish']['pages'][0]['text'])
        page.locator('#translationReviewed').check();page.locator('#reviewed').check()
        with page.expect_download() as download:page.locator('#downloadBtn').click()
        target=Path('/tmp/keeper-lima-book.html');download.value.save_as(target);html=target.read_text()
        assert 'GRANDMA’S TELLING · FAMILY RECONSTRUCTION' in html
        assert 'verified single-day chronology' in html
        assert 'A separate family note' in html
        assert 'Her grandchild' in html
        assert html.count('<audio controls src="data:')==8
        assert 'This is the narrator’s voice, not a generated voice.' not in html
        for slug in ['port','care']:
            page.goto(f'http://localhost:8888/keeper/?story={slug}')
            expect(page.locator('#bookSource')).to_have_text('FICTION INSPIRED BY FAMILY THEMES')
            expect(page.locator('#chapterList button')).to_have_count(8)
            seen=set()
            for chapter in range(8):
                page.locator(f'[data-chapter="{chapter}"]').click()
                page.wait_for_function('document.querySelector(".page-art img").complete && document.querySelector(".page-art img").naturalWidth>0')
                seen.add(page.locator('.page-art img').get_attribute('src'))
                assert 80<=len(page.locator('#pageProse').inner_text().split())<=110
            assert len(seen)==8
            page.locator('[data-chapter="1"]').click()
            page.screenshot(path=str(OUT/f'app-{slug}-story.png'),full_page=True)
        page.goto('http://localhost:8888/keeper/?story=bread');expect(page.locator('#bookTitle')).to_have_text('El pan que pudo traer')
        page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.locator('#homeBtn').evaluate('(b)=>b.click()');page.screenshot(path=str(OUT/'app-mobile.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.set_viewport_size({'width':1440,'height':1000});page.locator('#newBtn').click();expect(page.locator('#storyTone')).to_have_value('match');expect(page.locator('#narrativeVoice')).to_have_value('storyteller');page.screenshot(path=str(OUT/'app-capture.png'),full_page=True)
        assert not errors,errors
        print('PASS three adult family books, 24 chapters, butter/age/faith details, exact source anchors, fiction labels, written-source boundary, copy persistence, Spanish export, direct links, and mobile.')
        browser.close()


if __name__=='__main__':
    main()
