# Author: Alex Picon <alexnpc@me.com>
"""Capture screenshots of the running apps for their pitch decks.

For each app it saves, under ``slides/<app>/img/``:
``app-desktop.png`` (1440x900), ``app-mobile.png`` (390x844) and, when the app
has a "Judge demo" button, ``app-demo.png`` taken a few seconds into the demo.

Usage:
    uv run python tools/screenshot_apps.py            # every app
    uv run python tools/screenshot_apps.py gridlife   # just these apps
"""

import logging
import shutil
import sys
from pathlib import Path

from playwright.sync_api import Browser, Page, sync_playwright
from playwright.sync_api import Error as PlaywrightError

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "http://localhost:8888"
DESKTOP = {"width": 1440, "height": 900}
MOBILE = {"width": 390, "height": 844}
SETTLE_MS = 2500
DEMO_MS = 6000

logger = logging.getLogger(__name__)


def app_slugs() -> list[str]:
    """List the app folders that have an ``index.html``.

    Returns:
        Sorted app slugs.

    """
    return sorted(
        p.name for p in (ROOT / "apps").iterdir() if (p / "index.html").is_file()
    )


def launch(playwright_ctx: object) -> Browser:
    """Start headless Chromium, falling back to the system binary.

    Args:
        playwright_ctx: The object returned by ``sync_playwright().start()``.

    Returns:
        A launched browser.

    """
    chromium = playwright_ctx.chromium  # type: ignore[attr-defined]
    try:
        return chromium.launch()
    except PlaywrightError:
        system = shutil.which("chromium")
        if not system:
            raise
        logger.info("Using system Chromium at %s", system)
        return chromium.launch(executable_path=system)


def open_app(browser: Browser, slug: str, viewport: dict[str, int]) -> Page:
    """Open one app at a viewport size and let it settle.

    Args:
        browser: The running browser.
        slug: The app folder name.
        viewport: Width and height in CSS pixels.

    Returns:
        The loaded page.

    """
    page = browser.new_page(viewport=viewport, device_scale_factor=2)
    page.goto(f"{BASE_URL}/{slug}/", wait_until="networkidle", timeout=30_000)
    page.wait_for_timeout(SETTLE_MS)
    return page


def capture(browser: Browser, slug: str) -> list[Path]:
    """Save the desktop, mobile and (if available) demo screenshots of an app.

    Args:
        browser: The running browser.
        slug: The app folder name.

    Returns:
        The screenshot files written.

    """
    out = ROOT / "slides" / slug / "img"
    out.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    page = open_app(browser, slug, DESKTOP)
    page.screenshot(path=out / "app-desktop.png")
    written.append(out / "app-desktop.png")
    demo = page.get_by_role("button", name="Judge demo")
    if demo.count():
        demo.first.click()
        page.wait_for_timeout(DEMO_MS)
        page.screenshot(path=out / "app-demo.png")
        written.append(out / "app-demo.png")
    page.close()

    page = open_app(browser, slug, MOBILE)
    page.screenshot(path=out / "app-mobile.png")
    written.append(out / "app-mobile.png")
    page.close()
    return written


def main() -> None:
    """Capture screenshots for the requested apps (default: all)."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    slugs = sys.argv[1:] or app_slugs()
    with sync_playwright() as pw:
        browser = launch(pw)
        for slug in slugs:
            try:
                files = capture(browser, slug)
            except PlaywrightError:
                logger.exception("Could not capture %s", slug)
                continue
            logger.info("%s: %s", slug, ", ".join(f.name for f in files))
        browser.close()


if __name__ == "__main__":
    main()
