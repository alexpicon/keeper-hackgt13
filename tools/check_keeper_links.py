# Author: Alex Picon <alexnpc@me.com>
"""Exercise real share URLs and history on the public HTTP host."""
from playwright.sync_api import expect, sync_playwright
from tools.screenshot_apps import launch

BASE='http://34.223.255.241:8888/keeper/'


def main():
    with sync_playwright() as p:
        browser=launch(p);page=browser.new_page();errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE);expect(page.locator('.family-book')).to_have_count(3)
        assert not page.evaluate('isSecureContext')
        page.locator('#startBtn').click();expect(page).to_have_url(BASE+'?story=bread')
        expect(page.locator('#bookTitle')).to_have_text('El pan que pudo traer')
        page.locator('#shareLinkBtn').click();expect(page.locator('#shareUrl')).to_have_value(BASE+'?story=bread')
        recipient=browser.new_context().new_page();recipient.goto(page.locator('#shareUrl').input_value());expect(recipient.locator('#bookTitle')).to_have_text('El pan que pudo traer')
        page.locator('#editionSelect').select_option('Spanish');expect(page).to_have_url(BASE+'?story=bread&lang=Spanish')
        page.locator('#shareLinkBtn').click();recipient.goto(page.locator('#shareUrl').input_value());expect(recipient.locator('#editionSelect')).to_have_value('Spanish')
        page.go_back();expect(page.locator('#home')).to_be_visible()
        page.go_forward();expect(page.locator('#bookTitle')).to_have_text('El pan que pudo traer');expect(page.locator('#editionSelect')).to_have_value('Spanish')
        page.locator('#keepBookBtn').click();expect(page.locator('#shelfCount')).to_have_text('1')
        expect(page.locator('#shareLinkBtn')).to_be_visible()
        page.locator('#editionSelect').select_option('Original');page.locator('#editPageBtn').click();page.locator('#pageEdit').fill('A private edit kept in this browser.');page.locator('#editPageBtn').click()
        expect(page.locator('#shareLinkBtn')).to_be_hidden();page.wait_for_function('new URLSearchParams(location.search).has("local")');assert 'story=' not in page.url
        page.reload();expect(page.locator('#pageProse')).to_have_text('A private edit kept in this browser.')
        page.locator('#homeBtn').click();expect(page).to_have_url(BASE)
        page.locator('[data-family-book="stories/lima/port/book.json"]').click();expect(page).to_have_url(BASE+'?story=port')
        page.reload();expect(page.locator('#bookTitle')).to_have_text('Las manos que se cuidaban')
        page.locator('#homeBtn').click();page.locator('#judgeBtn').click();expect(page).to_have_url(BASE+'?story=bread&demo=1')
        page.locator('#judgeExit').click();expect(page).to_have_url(BASE+'?story=bread')
        assert not errors,errors
        print('PASS public HTTP: story links, copy fallback, fresh-recipient opening, Spanish link, Back/Forward, UUID saving, private-edit isolation, reload, and judge URLs.')
        browser.close()


if __name__=='__main__':
    main()
