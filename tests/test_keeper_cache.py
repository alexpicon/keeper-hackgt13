# Author: Alex Picon <alexnpc@me.com>
"""Cache-Control headers on static assets vs. API responses."""
import unittest

from fastapi.testclient import TestClient

from server.main import apps_server


class KeeperCacheTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(apps_server)

    def test_css_gets_short_revalidated_cache(self):
        response = self.client.get('/keeper/story.css')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get('cache-control'), 'public, max-age=300, must-revalidate')

    def test_js_gets_short_revalidated_cache(self):
        response = self.client.get('/keeper/js/story.js')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get('cache-control'), 'public, max-age=300, must-revalidate')

    def test_image_gets_long_cache(self):
        response = self.client.get('/keeper/stories/lima/bread/chapter-02-carmen.webp')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get('cache-control'), 'public, max-age=604800')

    def test_html_is_not_cached(self):
        response = self.client.get('/keeper/index.html')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get('cache-control'), 'no-cache')

    def test_api_response_has_no_static_cache_control(self):
        response = self.client.get('/api/keeper/story/status')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(response.headers.get('cache-control'), {
            'public, max-age=604800',
            'public, max-age=300, must-revalidate',
        })


if __name__ == '__main__':
    unittest.main()
