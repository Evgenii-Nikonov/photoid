"""SEO consistency and domain migration regression checks, without network requests."""
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class Metadata(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.tags = []
        self.title = ""
        self.json_text = ""
        self.capture = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if tag == "title": self.capture = "title"
        elif tag == "script" and attrs.get("type") == "application/ld+json": self.capture = "json_text"

    def handle_endtag(self, tag):
        if tag in ("title", "script"): self.capture = None

    def handle_data(self, data):
        if self.capture: setattr(self, self.capture, getattr(self, self.capture) + data)

    def values(self, tag, key, value, output):
        return [attrs.get(output) for name, attrs in self.tags if name == tag and attrs.get(key) == value]


class SEOTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((ROOT / "config/site.json").read_text(encoding="utf-8"))
        self.base = self.config["base_url"]
        self.pages = {name: Metadata((ROOT / name).read_text(encoding="utf-8")) for name in ["index.html", "price.html"]}

    def test_unique_metadata_and_canonical(self):
        self.assertNotEqual(self.pages["index.html"].title, self.pages["price.html"].title)
        for name, page in self.pages.items():
            expected = self.base + ("price.html" if name == "price.html" else "")
            self.assertEqual(page.values("link", "rel", "canonical", "href"), [expected])
            self.assertEqual(page.values("meta", "property", "og:url", "content"), [expected])
            self.assertEqual(len(page.values("meta", "name", "description", "content")), 1)
            self.assertIn("Новосибирске", page.title)
            self.assertTrue(25 < len(page.title) < 80)
            for _, attrs in page.tags:
                if attrs.get("name") == "robots": self.assertNotIn("noindex", attrs.get("content", ""))

    def test_real_business_and_visible_offers(self):
        for name, page in self.pages.items():
            graph = json.loads(page.json_text)["@graph"]
            studio = next(node for node in graph if node["@type"] == "LocalBusiness")
            self.assertEqual(studio["telephone"], "+79234968231")
            self.assertEqual(studio["openingHours"], ["Mo-Fr 10:00-20:00", "Sa-Su 10:00-19:00"])
            self.assertEqual(studio["address"]["streetAddress"], "10-й Порт-Артурский переулок, 75")
            self.assertNotIn("aggregateRating", studio)
            self.assertNotIn("review", studio)
            html = (ROOT / name).read_text(encoding="utf-8")
            for offer in studio["hasOfferCatalog"]["itemListElement"]:
                self.assertIn(offer["name"], html)
                self.assertIn(offer["price"] + " ₽", html)
                self.assertEqual(offer["priceCurrency"], "RUB")

    def test_sitemap_canonical_only(self):
        tree = ET.parse(ROOT / "sitemap.xml")
        urls = [element.text for element in tree.findall(".//{*}loc")]
        self.assertEqual(urls, [self.base, self.base + "price.html"])
        self.assertTrue(all(not urlsplit(url).query and not urlsplit(url).fragment for url in urls))

    def test_social_cover_dimensions(self):
        cover = (ROOT / "images/social-cover.png").read_bytes()
        self.assertEqual(cover[:8], b"\x89PNG\r\n\x1a\n")
        self.assertEqual(struct.unpack(">II", cover[16:24]), (1200, 630))

    def test_counter_is_consistent_and_not_invented(self):
        for page in self.pages.values():
            self.assertEqual(page.values("meta", "name", "yandex-metrika-id", "content"), [self.config["metrika_id"]])

    def test_generator_is_idempotent_and_updates_domain(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "scripts").mkdir()
            (root / "config").mkdir()
            for name in ["index.html", "price.html", "config/site.json", "scripts/update_seo.py"]:
                shutil.copyfile(ROOT / name, root / name)
            command = [sys.executable, str(root / "scripts/update_seo.py")]
            subprocess.run(command, check=True, capture_output=True)
            before = (root / "index.html").read_bytes()
            subprocess.run(command, check=True, capture_output=True)
            self.assertEqual(before, (root / "index.html").read_bytes())
            planned = self.config["planned_domain"]
            subprocess.run(command + ["--base-url", planned], check=True, capture_output=True)
            for name in ["index.html", "price.html"]:
                html = (root / name).read_text(encoding="utf-8")
                self.assertIn(planned + "images/social-cover.png", html)
                self.assertNotIn(self.base, html)
            self.assertIn(planned, (root / "sitemap.xml").read_text(encoding="utf-8"))

    def test_unsafe_base_urls_rejected(self):
        spec = importlib.util.spec_from_file_location("seo", ROOT / "scripts/update_seo.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        for value in ["http://example.com/", "https://name:password@example.com/", "https://example.com/?campaign=1", 'https://example.com/"onclick=x', "https://example.com/../"]:
            with self.subTest(value=value), self.assertRaises(ValueError): module.normalized_url(value)


if __name__ == "__main__": unittest.main()
