# Author: Alex Picon <alexnpc@me.com>
"""Browser acceptance: real drafting, recording, recovery, export, mobile, and screenshots."""
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


OUT = Path('slides/keeper/img')
MEMORY = 'I remember Grandpa peeling oranges by the kitchen window. He tried to take the peel off in one long spiral. I would sit beside him and watch. Sometimes it broke and we would laugh. I do not remember how old I was. I remember the smell of orange on his hands.'


def check():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, permissions=['microphone'])
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto('http://localhost:8888/keeper/')
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / 'app-desktop.png'), full_page=True)
        page.get_by_role('button', name='Keep a memory of someone').click()
        assert page.locator('input[value=remembered]').is_checked()
        page.locator('#person').fill('Grandpa')
        page.locator('#narrator').fill('Elena')
        page.locator('#memoryText').fill(MEMORY)
        page.wait_for_function("document.getElementById('draftStatus').textContent.includes('Draft saved')")
        page.once('dialog', lambda d: d.accept())
        page.reload()
        page.locator('#resumeBtn').click()
        expect(page.locator('#memoryText')).to_have_value(MEMORY)
        page.locator('#recordBtn').click()
        page.wait_for_timeout(1400)
        page.locator('#recordBtn').click()
        page.wait_for_function("document.getElementById('recording').src.startsWith('data:')")
        assert not page.locator('#recording').is_hidden()
        page.screenshot(path=str(OUT / 'app-capture.png'), full_page=True)
        page.locator('#consent').check()
        page.locator('#makeBtn').click()
        page.locator('#reader').wait_for(state='visible', timeout=195000)
        assert 'FAMILY REVIEW' in page.locator('#bookSource').inner_text()
        assert 'Elena’s telling' in page.locator('#bookAttribution').inner_text()
        assert page.locator('#originalText').text_content() == MEMORY
        page.locator('#illustrateBtn').click()
        page.locator('.page-art img').wait_for(state='visible', timeout=120000)
        page.screenshot(path=str(OUT / 'app-generated.png'), full_page=True)
        page.locator('#downloadBtn').click()
        assert 'Please review' in page.locator('#readerStatus').inner_text()
        page.locator('#reviewed').check()
        with page.expect_download() as download:
            page.locator('#downloadBtn').click()
        export = Path('/tmp/keeper-browser-book.html')
        download.value.save_as(export)
        html = export.read_text()
        assert '<audio controls src="data:' in html
        assert '<img src="data:' in html
        assert MEMORY in html
        page.reload()
        page.locator('#shelfBtn').click()
        expect(page.locator('.shelf-card')).to_have_count(1)
        page.get_by_role('button', name='Open book →').click()
        expect(page.locator('#reviewed')).to_be_checked()
        page.locator('#editPageBtn').click()
        page.locator('#pageEdit').fill('Elena remembers the oranges, and the uncertainty about her age.')
        page.locator('#editPageBtn').click()
        expect(page.locator('#reviewed')).not_to_be_checked()
        page.locator('#homeBtn').click()
        page.locator('#judgeBtn').click()
        page.screenshot(path=str(OUT / 'app-demo.png'), full_page=True)
        page.locator('#nextPage').click()
        assert page.locator('#pageCount').inner_text().startswith('2 /')
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.locator('#homeBtn').evaluate('(el) => el.click()')
        page.screenshot(path=str(OUT / 'app-mobile.png'), full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not errors, errors
        print('PASS: remembered mode, draft recovery, fake-device recording, live AI draft and illustration, review gate, embedded audio/image export, persistence, page editing, mobile layout; zero JS errors.')
        browser.close()


if __name__ == '__main__':
    check()
