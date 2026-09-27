# Author: Alex Picon <alexnpc@me.com>
"""Capture a narrated walkthrough of the real app; prepared demo is labeled."""
import os
import json
import hashlib
import subprocess
import time
from pathlib import Path

import httpx
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WORK = Path('/tmp/keeper-pitch')
BASE = os.getenv('KEEPER_BASE_URL', 'http://localhost:8892').rstrip('/')
VOICE = 'rachel'
VOICE_ID = '0rEo3eAjssGDUCXHYENf'
OUT = ROOT / 'slides/keeper/keeper-demo.mp4'
SCRIPT = ['Our grandparents lived in a world we never got to see. Their stories deserve more than a forgotten audio '
 'file. Keeper turns family memories into illustrated books you can read, hear, and pass down. You can '
 'record someone you love, or preserve a story they told in their own perspective.',
 'The main book is Grandma’s telling. Her husband worked at the docks. Their four-year-old daughter thanked '
 'him for the bread, then asked for butter he could not afford. The family supplied these recollections in '
 'writing. Grandma narrates the book in first person, with a clearly labeled ElevenLabs reading voice, not a '
 'claimed original recording.',
 'Every chapter is short enough to read comfortably, with a different illustration for each scene. The story '
 'keeps the child’s innocence and the father’s love. The words stay in Grandma’s perspective. Source '
 'excerpts and adaptation notes remain available, so the family can review what was remembered and how it '
 'was shaped into a book.',
 'Her faith is specific to her life. She prayed to la Virgen del Carmen de la Legua in Callao, Peru, and '
 'found a large bill when the family needed help. The devotional illustration was checked against local '
 'references. Grandma’s conviction stays in her telling. Her grandchild’s different interpretation appears '
 'in a separate family note.',
 'Here is her telling in Spanish. Grok translates the edition and ElevenLabs supplies narrated reading with '
 'word highlighting. The original storyteller stays the same in both languages. All eight chapters are prebuilt in both languages. Prepared audio is '
 'labeled, and judges can regenerate narration or another edition live. Each translation has its own family '
 'review before sharing.',
 'After review, download the whole book. One HTML file keeps all eight illustrations, the chapters, source '
 'recollections, the family note, and any generated narration. It opens offline. A printed PDF keeps the '
 'words and pictures. Families can start with one story, and carry the person who told it into the next '
 'generation.']


def main():
    WORK.mkdir(exist_ok=True)
    durations = []
    # Personal audio is never used here. These clips narrate the product demo.
    import base64
    with httpx.Client(timeout=100) as client:
        for i, text in enumerate(SCRIPT):
            path = WORK / f'speech-{i}-{hashlib.sha256((VOICE_ID+'|'+text).encode()).hexdigest()[:8]}.mp3'
            if not path.exists():
                response = client.post(BASE+'/api/keeper/voice/narrate', json={'text': text, 'voice': VOICE})
                response.raise_for_status()
                if response.json().get('voice_id') != VOICE_ID: raise RuntimeError('Unexpected narration voice')
                path.write_bytes(base64.b64decode(response.json()['audio'].split(',', 1)[1]))
            duration = float(subprocess.check_output(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',str(path)]))
            duration = max(20, duration + .8)
            durations.append(duration)
            subprocess.run(['ffmpeg','-y','-v','error','-i',str(path),'-af','apad','-t',str(duration),'-ar','44100','-ac','2',str(WORK/f'part-{i}.wav')],check=True)
    (WORK/'audio.txt').write_text(''.join(f"file '{WORK}/part-{i}.wav'\n" for i in range(len(SCRIPT))))
    subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(WORK/'audio.txt'),str(WORK/'narration.wav')],check=True)
    print('Narration prepared; capturing the actual app for',round(sum(durations)),'seconds.',flush=True)
    with sync_playwright() as p:
        browser=p.chromium.launch(args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1280,'height':800},record_video_dir=str(WORK),record_video_size={'width':1280,'height':800})
        page=context.new_page()
        def segment(i, action):
            started=time.monotonic();action();page.wait_for_timeout(max(0,(durations[i]-(time.monotonic()-started))*1000))
            print('Captured scene',i+1,flush=True)
        segment(0,lambda:page.goto(BASE+'/keeper/'))
        def source():
            page.locator('#judgeBtn').click();expect(page.locator('#judgePanel')).to_be_visible()
            expect(page.locator('#narratorVoice')).to_have_value('rachel')
            expect(page.locator('#chapterAudio')).to_be_visible()
            page.locator('#judgeAction').click()
            page.wait_for_function('document.getElementById("chapterAudio").currentTime>0.1')
        segment(1,source)
        def listen():
            page.locator('#judgeNext').click();page.locator('#judgeAction').click()
        segment(2,listen)
        def faith():
            page.locator('#judgeNext').click();page.locator('#judgeAction').click()
        segment(3,faith)
        def spanish():
            page.locator('#judgeNext').click()
            expect(page.locator('#narratorVoice')).to_have_value('tina')
            expect(page.locator('#chapterAudio')).to_be_visible()
            page.locator('#judgeAction').click()
            page.wait_for_function('document.getElementById("chapterAudio").currentTime>0.1')
        segment(4,spanish)
        def export():
            page.locator('#judgeNext').click();page.locator('#shareLinkBtn').click();page.locator('#translationReviewed').check();page.locator('#reviewed').check()
            page.locator('.review-panel').scroll_into_view_if_needed()
            with page.expect_download() as download:page.locator('#downloadBtn').click()
            download.value.save_as(WORK/'example-book.html')
            if (WORK/'example-book.html').read_text().count('<audio controls src="data:') != 8: raise RuntimeError('Missing prepared export narration')
        segment(5,export)
        video=page.video;context.close();video_path=video.path();browser.close()
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(video_path),'-i',str(WORK/'narration.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','29','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-shortest','-metadata','artist=Alex Picon <alexnpc@me.com>','-metadata','comment=Keeper narrated walkthrough; reconstructed family telling; generated ElevenLabs reading voice','-movflags','+faststart',str(OUT)],check=True)
    if OUT.stat().st_size>10*1024*1024:
        raise RuntimeError('Video exceeds repository asset limit; recompress before committing.')
    print('Saved',OUT,'bytes',OUT.stat().st_size,flush=True)


if __name__=='__main__':
    main()
