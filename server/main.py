# Author: Alex Picon <alexnpc@me.com>
"""Standalone Keeper server."""
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env')
from server.routers.keeper_story import router as story_router
from server.routers.keeper_voice import router as voice_router
apps_server = FastAPI(title='Keeper')
apps_server.include_router(story_router)
apps_server.include_router(voice_router)
@apps_server.get('/', include_in_schema=False)
def home(request: Request):
    suffix = '?' + request.url.query if request.url.query else ''
    return RedirectResponse('/keeper/' + suffix)
@apps_server.get('/healthz')
def health():
    return {'status': 'ok', 'app': 'keeper'}
apps_server.mount('/slides', StaticFiles(directory=ROOT / 'slides', html=True), name='slides')
apps_server.mount('/', StaticFiles(directory=ROOT / 'apps', html=True), name='apps')
