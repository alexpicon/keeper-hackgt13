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

# Static filenames are not content-hashed, so long-lived caching is only safe
# for binary media (images/audio/fonts). Code (.js/.css/.json) gets a short,
# must-revalidate cache so a deploy is picked up quickly without paying a
# full round-trip on every load. HTML is never cached (it's the entry point
# that references the current asset URLs).
LONG_CACHE_EXTS = {'.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
                   '.mp3', '.wav', '.m4a', '.ogg', '.flac', '.woff', '.woff2', '.ttf'}
SHORT_CACHE_EXTS = {'.js', '.css', '.json'}


class CachedStaticFiles(StaticFiles):
    """StaticFiles that adds a Cache-Control header based on file extension."""

    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        full_path = args[0] if args else kwargs.get('full_path')
        suffix = Path(str(full_path)).suffix.lower()
        if suffix in LONG_CACHE_EXTS:
            response.headers['cache-control'] = 'public, max-age=604800'
        elif suffix in SHORT_CACHE_EXTS:
            response.headers['cache-control'] = 'public, max-age=300, must-revalidate'
        else:
            response.headers['cache-control'] = 'no-cache'
        return response


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
apps_server.mount('/slides', CachedStaticFiles(directory=ROOT / 'slides', html=True), name='slides')
apps_server.mount('/', CachedStaticFiles(directory=ROOT / 'apps', html=True), name='apps')
