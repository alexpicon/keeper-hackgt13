# Author: Alex Picon <alexnpc@me.com>
"""Build a complete fictional grandpa story and its real AI storybook adaptation."""
import asyncio
import os
import base64
import hashlib
import io
import json
from pathlib import Path

import httpx
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'apps/keeper/demo'
CACHE = Path('/tmp/keeper-long-demo')
BASE = os.getenv('KEEPER_BASE_URL','http://localhost:8892').rstrip('/')+'/api/keeper'


async def main():
    CACHE.mkdir(exist_ok=True)
    memory = json.loads((OUT/'story-source.json').read_text())
    semaphore = asyncio.Semaphore(2)
    async with httpx.AsyncClient(timeout=210) as client:
        async def post(path, payload):
            digest = hashlib.sha256(json.dumps(["long-story-v2",path,payload],sort_keys=True).encode()).hexdigest()
            cache = CACHE / (digest+'.json')
            if cache.exists():
                return json.loads(cache.read_text())
            async with semaphore:
                response = await client.post(BASE+path,json=payload)
                response.raise_for_status()
                result = response.json()
                if path == '/story' and result.get('source') != 'ai':
                    raise RuntimeError('Story generation did not complete: '+result.get('notice',''))
                cache.write_text(json.dumps(result,ensure_ascii=False))
                print('Generated',path,flush=True)
                return result

        async def speech(text, name, voice='george'):
            result = await post('/voice/narrate',{'text':text,'voice':voice})
            (OUT/(name+'.mp3')).write_bytes(base64.b64decode(result['audio'].split(',',1)[1]))
            return {**result,'audio':'demo/'+name+'.mp3','text':text,'prepared':True}

        book, source = await asyncio.gather(post('/story',memory),speech(memory['text'],'grandpa-story'))
        print('Storybook:',len(book['pages']),'chapters,',sum(len(p['text'].split()) for p in book['pages']),'words',flush=True)
        transcript_path=CACHE/('grandpa-transcript-'+hashlib.sha256((OUT/'grandpa-story.mp3').read_bytes()).hexdigest()[:16]+'.json')
        if transcript_path.exists():
            transcript=json.loads(transcript_path.read_text())
        else:
            response=await client.post(BASE+'/voice/transcribe',files={'file':('grandpa-story.mp3',(OUT/'grandpa-story.mp3').read_bytes(),'audio/mpeg')})
            response.raise_for_status();transcript=response.json();transcript_path.write_text(json.dumps(transcript))
        spanish = await post('/voice/translate',{'title':book['title'],'pages':[{'title':p['title'],'text':p['text']} for p in book['pages']],'language':'Spanish'})
        spanish['prepared']=True
        async def chapter(i,page):
            english_audio,spanish_audio,art=await asyncio.gather(
                speech(page['text'],f'story-{i+1}-en','rachel'),
                speech(spanish['pages'][i]['text'],f'story-{i+1}-es','tina'),
                post('/story/illustration',{'prompt':page['illustration']}))
            name=f'story-{i+1}.webp'
            Image.open(io.BytesIO(base64.b64decode(art['image'].split(',',1)[1]))).save(OUT/name,quality=87)
            page.update(image='demo/'+name,narrations={'Original:rachel':english_audio,'Spanish:tina':spanish_audio})
            print('Prepared chapter',i+1,flush=True)
        await asyncio.gather(*(chapter(i,page) for i,page in enumerate(book['pages'])))
        book.update(id='example',demo=True,source='example',reviewed=False,defaultVoice='rachel',defaultVoices={'Original':'rachel','English':'rachel','Spanish':'tina'},memory=memory,
            audio=source['audio'],audioKind='generated-demo',transcript=transcript,translations={'Spanish':spanish},
            notice='Fictional demo: Grandpa tells a complete childhood story in an ElevenLabs-generated voice. This eight-chapter imaginative adaptation adds scenes, dialogue, and wonder; each chapter names its additions. The full original telling is preserved.')
        target=OUT/'book.json';temporary=OUT/'book.pending';temporary.write_text(json.dumps(book,ensure_ascii=False,indent=2));temporary.replace(target)
        print('Published complete storybook:',book['title'],flush=True)


if __name__=='__main__':
    asyncio.run(main())
    import subprocess, sys
    subprocess.run([sys.executable, str(ROOT/'tools/prepare_keeper_narration.py')], check=True)
