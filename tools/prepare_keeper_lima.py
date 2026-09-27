# Author: Alex Picon <alexnpc@me.com>
"""Illustrate and prepare opening narrations for the curated Lima collection."""
import asyncio
import base64
import hashlib
import io
import json
import sys
from pathlib import Path

import httpx
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
BASE='http://localhost:8888/api/keeper'
CACHE=Path('/tmp/keeper-lima-assets')


async def main():
    CACHE.mkdir(exist_ok=True)
    semaphore=asyncio.Semaphore(3)
    async with httpx.AsyncClient(timeout=210) as client:
        async def post(endpoint,payload):
            key=hashlib.sha256(json.dumps([endpoint,payload],sort_keys=True).encode()).hexdigest()
            path=CACHE/(key+'.json')
            if path.exists():return json.loads(path.read_text())
            async with semaphore:
                response=await client.post(BASE+endpoint,json=payload);response.raise_for_status();data=response.json();path.write_text(json.dumps(data));print('Prepared',endpoint,flush=True);return data
        async def book(slug):
            target=ROOT/'apps/keeper/stories/lima'/slug
            data=json.loads((target/'book.json').read_text())
            async def art(i,prompt):
                result=await post('/story/illustration',{'prompt':'Mature literary watercolor, sensitive social realism, warm paper, dignified adults, no cute cartoon style. Artistic interpretation, not a historical photograph or a portrait of an actual family. '+prompt})
                Image.open(io.BytesIO(base64.b64decode(result['image'].split(',',1)[1]))).save(target/f'scene-{i+1}.webp',quality=88)
            # Source is written recollection. Never synthesize it as an "original recording".
            async def reading(text,language):
                clip=await post('/voice/narrate',{'text':text,'voice':data['defaultVoice']})
                name=f'opening-{language.lower()}.mp3';(target/name).write_bytes(base64.b64decode(clip['audio'].split(',',1)[1]))
                return {**clip,'audio':f'stories/lima/{slug}/{name}','text':text,'prepared':True,'provenance':'Prepared reading voice · not a family recording'}
            translation=await post('/voice/translate',{'title':data['title'],'pages':[{'title':p['title'],'text':p['text']} for p in data['pages']],'language':'Spanish'})
            translation['prepared']=True
            narrations=await asyncio.gather(reading(data['pages'][0]['text'],'Original'),reading(translation['pages'][0]['text'],'Spanish'))
            if data.get('art_generation')!='bundled-imagegen':
                await asyncio.gather(*(art(i,prompt) for i,prompt in enumerate(data['art_prompts'])))
            latest=json.loads((target/'book.json').read_text())
            if [p['text'] for p in latest['pages']] != [p['text'] for p in data['pages']]:
                raise RuntimeError('Story text changed while preparing assets; retry the build.')
            data=latest
            data['translations']={'Spanish':translation};data['pages'][0]['narrations']={f'Original:{data["defaultVoice"]}':narrations[0],f'Spanish:{data["defaultVoice"]}':narrations[1]}
            (target/'book.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
            print('Complete',slug,flush=True)
        await asyncio.gather(*(book(slug) for slug in ['bread','port','care']))
    process=await asyncio.create_subprocess_exec(sys.executable,str(ROOT/'tools/prepare_keeper_narration.py'))
    if await process.wait():raise RuntimeError('Grandma narration build failed')


if __name__=='__main__':
    asyncio.run(main())
