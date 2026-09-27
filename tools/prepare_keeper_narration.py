# Author: Alex Picon <alexnpc@me.com>
"""Prebuild all English and Spanish chapters with real ElevenLabs timing data."""
import asyncio
import base64
import hashlib
import json
from pathlib import Path

import httpx

ROOT=Path(__file__).resolve().parents[1]
CACHE=Path('/tmp/keeper-complete-narration')


async def main():
    CACHE.mkdir(exist_ok=True)
    path=ROOT/'apps/keeper/stories/lima/bread/book.json'
    book=json.loads(path.read_text())
    semaphore=asyncio.Semaphore(2)
    voice=book['defaultVoice']
    async with httpx.AsyncClient(timeout=100) as client:
        async def chapter(index,language):
            page=book['pages'][index] if language=='Original' else book['translations'][language]['pages'][index]
            text=page['text'];key=f'{language}:{voice}'
            previous=book['pages'][index].get('narrations',{}).get(key)
            if previous and previous.get('text')==text and (ROOT/'apps/keeper'/previous['audio']).is_file():
                return index,key,previous
            digest=hashlib.sha256((voice+'|'+text).encode()).hexdigest();cached=CACHE/(digest+'.json')
            if cached.exists():clip=json.loads(cached.read_text())
            else:
                async with semaphore:
                    response=await client.post('http://localhost:8888/api/keeper/voice/narrate',json={'text':text,'voice':voice})
                    response.raise_for_status();clip=response.json();cached.write_text(json.dumps(clip))
            name=f'chapter-{index+1:02}-{ "en" if language=="Original" else "es"}.mp3'
            (path.parent/name).write_bytes(base64.b64decode(clip['audio'].split(',',1)[1]))
            result={**clip,'audio':f'stories/lima/bread/{name}','text':text,'prepared':True,'provenance':'Prepared ElevenLabs reading voice · not a family recording'}
            print('Ready',index+1,language,flush=True)
            return index,key,result
        clips=await asyncio.gather(*(chapter(i,language) for i in range(len(book['pages'])) for language in ['Original','Spanish']))
        latest=json.loads(path.read_text())
        for i,key,clip in clips:
            language=key.split(':')[0]
            target=latest['pages'][i] if language=='Original' else latest['translations'][language]['pages'][i]
            if target['text']!=clip['text']:raise RuntimeError('Story changed during audio build')
            latest['pages'][i].setdefault('narrations',{})[key]=clip
        latest['prepared_audio']={'provider':'ElevenLabs','voice':voice,'languages':['Original','Spanish'],'chapters_per_language':len(book['pages'])}
        path.write_text(json.dumps(latest,ensure_ascii=False,indent=2))
        print('Published all 16 chapter readings.',flush=True)


if __name__=='__main__':
    asyncio.run(main())
