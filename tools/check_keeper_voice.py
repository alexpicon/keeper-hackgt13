# Author: Alex Picon <alexnpc@me.com>
"""Judge walkthrough + real ElevenLabs STT/TTS and grounded interview acceptance."""
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from tools.screenshot_apps import launch

OUT = Path('slides/keeper/img')


def capture(page, **kwargs):
    if not os.getenv('KEEPER_SKIP_CAPTURES'):
        page.screenshot(**kwargs)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = launch(p)
        page = browser.new_page(viewport={'width': 1440, 'height': 1050})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto('http://localhost:8888/keeper/?demo=adventure')
        expect(page.locator('#judgePanel')).to_be_visible()
        expect(page.locator('#chapterAudio')).to_be_visible()
        assert page.locator('[data-source-word]').count() > 50
        page.locator('#judgeAction').click()
        page.wait_for_function("document.getElementById('originalAudio').currentTime > 0.2")
        page.locator('[data-source-word="12"]').click()
        assert page.locator('#originalAudio').evaluate('(a)=>a.currentTime') > 2
        page.locator('#judgeNext').click()
        page.locator('#judgeAction').click()
        page.wait_for_function("document.querySelectorAll('.spoken-word.active').length > 0")
        capture(page,path=str(OUT/'app-listening.png'), full_page=True)
        page.locator('#chapterAudio').evaluate('(a)=>a.pause()')
        page.locator('#judgeNext').click()
        assert page.locator('.source-quote').get_attribute('open') is not None
        page.locator('#judgeNext').click()
        assert len(page.locator('#pageProse').inner_text()) > 500
        assert page.locator('#chapterAudio').get_attribute('src').endswith('-es.mp3')
        page.locator('#downloadBtn').click()
        expect(page.locator('#readerStatus')).to_contain_text('Review this translated edition')
        page.locator('#translationReviewed').check()
        page.locator('#reviewed').check()
        with page.expect_download() as info:
            page.locator('#downloadBtn').click()
        export = Path('/tmp/keeper-voice-export.html')
        info.value.save_as(export)
        html = export.read_text()
        assert html.count('<audio controls src="data:') == 9
        assert 'Edition: Spanish' in html and 'Fictional example source' in html
        assert 'demo/chapter-' not in html
        capture(page,path=str(OUT/'app-spanish.png'), full_page=True)
        page.locator('#editionSelect').select_option('Original')
        page.locator('#narratorVoice').select_option('lily')
        page.locator('#narrateBtn').click()
        page.wait_for_function("document.getElementById('chapterAudio').src.startsWith('data:')", timeout=100000)
        expect(page.locator('#voiceProvenance')).to_contain_text('generated for this page')
        page.locator('#chapterAudio').evaluate('(a)=>a.pause()')
        page.locator('#editPageBtn').click()
        page.locator('#pageEdit').fill('Elena remembers the orange peel. The family checked this sentence.')
        page.locator('#editPageBtn').click()
        expect(page.locator('#reviewed')).not_to_be_checked()
        page.locator('#editionSelect').select_option('Spanish')
        expect(page.locator('#chapterAudio')).to_be_hidden()
        expect(page.locator('#voiceStatus')).to_contain_text('Create this edition')
        print('PASS prepared judge tour, timestamp seek, synchronized highlighting, Spanish, reviewed export with 9 embedded audio clips, live Lily narration, edit invalidation.', flush=True)
        page.locator('#newBtn').click()
        page.locator('#person').fill('Grandpa')
        page.locator('#narrator').fill('Elena')
        page.locator('input[value=remembered]').check()
        page.locator('#audioUpload').set_input_files('apps/keeper/demo/grandpa-story.mp3')
        expect(page.locator('#transcribeStatus')).to_contain_text('loaded locally')
        page.locator('#transcribeBtn').click()
        expect(page.locator('#transcriptProposal')).to_be_visible(timeout=100000)
        assert 'orange' in page.locator('#proposedText').input_value().lower()
        page.locator('#acceptTranscriptBtn').click()
        expect(page.locator('#memoryText')).to_have_value(page.locator('#proposedText').input_value())
        page.locator('.optional-guide summary').click()
        page.locator('#followupBtn').click()
        expect(page.locator('#interviewStatus')).to_contain_text('Inspired by your words', timeout=70000)
        page.locator('#hearPromptBtn').click()
        expect(page.locator('#interviewAudio')).to_be_visible(timeout=70000)
        page.locator('#interviewAudio').evaluate('(a)=>a.pause()')
        capture(page,path=str(OUT/'app-capture.png'), full_page=True)
        print('PASS actual uploaded audio → Scribe → accepted transcript → grounded follow-up → ElevenLabs spoken question.', flush=True)
        page.locator('#homeBtn').click()
        capture(page,path=str(OUT/'app-desktop.png'), full_page=True)
        page.locator('#judgeBtn').click()
        expect(page.locator('#judgePanel')).to_be_visible()
        capture(page,path=str(OUT/'app-judge.png'), full_page=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        capture(page,path=str(OUT/'app-judge-mobile.png'), full_page=True)
        page.locator('#homeBtn').evaluate('(b)=>b.click()')
        capture(page,path=str(OUT/'app-mobile.png'), full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not errors, errors
        offline = browser.new_page()
        offline.goto(export.as_uri())
        assert offline.locator('audio').count() == 9
        assert offline.evaluate('[...document.images].every(i=>i.complete && i.naturalWidth>0)')
        print('PASS mobile overflow, offline exported book; no JavaScript errors.', flush=True)
        browser.close()


if __name__ == '__main__':
    main()
