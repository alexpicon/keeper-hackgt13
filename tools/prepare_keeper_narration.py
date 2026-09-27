# Author: Alex Picon <alexnpc@me.com>
"""Prebuild English/Spanish reading voices for every bundled storybook."""
import asyncio
import base64
import hashlib
import json
import os
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path('/tmp/keeper-complete-narration')
BASE = os.getenv('KEEPER_BASE_URL', 'http://localhost:8892').rstrip('/')
VOICES = {'Original': ('rachel', '0rEo3eAjssGDUCXHYENf', 'Grandma Rachel'),
          'Spanish': ('tina', 'lZmnvfWF4ko4J7F7QDtX', 'Abuela Tina')}


async def main():
    CACHE.mkdir(exist_ok=True)
    semaphore = asyncio.Semaphore(2)
    paths = sorted((ROOT/'apps/keeper/stories/lima').glob('*/book.json'))
    paths.append(ROOT/'apps/keeper/demo/book.json')
    async with httpx.AsyncClient(timeout=110) as client:
        for path in paths:
            book = json.loads(path.read_text())
            async def chapter(index, language):
                voice, voice_id, label = VOICES[language]
                page = book['pages'][index] if language == 'Original' else book['translations'][language]['pages'][index]
                text = page['text']; key = f'{language}:{voice}'
                digest = hashlib.sha256((voice_id+'|eleven_multilingual_v2|'+text).encode()).hexdigest()
                cached = CACHE/(digest+'.json')
                if cached.exists():
                    clip = json.loads(cached.read_text())
                else:
                    async with semaphore:
                        for attempt in range(3):
                            response = await client.post(BASE+'/api/keeper/voice/narrate', json={'text': text, 'voice': voice})
                            if response.is_success: break
                            if attempt == 2: response.raise_for_status()
                            await asyncio.sleep(2*(attempt+1))
                        clip = response.json()
                        if clip.get('voice_id') != voice_id: raise RuntimeError('Unexpected provider voice')
                        cached.write_text(json.dumps(clip))
                name = f'chapter-{index+1:02}-{voice}-{digest[:10]}.mp3'
                (path.parent/name).write_bytes(base64.b64decode(clip['audio'].split(',', 1)[1]))
                result = {**clip, 'audio': (path.parent/name).relative_to(ROOT/'apps/keeper').as_posix(),
                          'text': text, 'prepared': True,
                          'provenance': f'Prepared ElevenLabs reading · {label} · not a family recording'}
                print('Ready', path.parent.name, index+1, language, label, flush=True)
                return index, key, result
            clips = await asyncio.gather(*(chapter(i, lang) for i in range(len(book['pages'])) for lang in VOICES))
            latest = json.loads(path.read_text())
            for i, key, clip in clips:
                lang = key.split(':')[0]
                target = latest['pages'][i] if lang == 'Original' else latest['translations'][lang]['pages'][i]
                if target['text'] != clip['text']: raise RuntimeError('Story changed during audio build')
                latest['pages'][i].setdefault('narrations', {})[key] = clip
            latest['defaultVoice'] = 'rachel'
            latest['defaultVoices'] = {'Original': 'rachel', 'English': 'rachel', 'Spanish': 'tina'}
            latest['prepared_audio'] = {'provider': 'ElevenLabs', 'voices': latest['defaultVoices'],
                                       'voice_ids': {lang: value[1] for lang,value in VOICES.items()},
                                       'languages': list(VOICES), 'chapters_per_language': len(book['pages'])}
            path.write_text(json.dumps(latest, ensure_ascii=False, indent=2)+'\n')
            print('Published', path.parent.name, len(clips), 'chapter readings.', flush=True)


if __name__ == '__main__':
    asyncio.run(main())
