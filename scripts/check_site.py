"""Dependency-free static release checks for the two HTML pages."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
VOID = set("area base br col embed hr img input link meta param source track wbr".split())


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids = set()
        self.references = []
        self.errors = []
        self.stack = []
        self.h1 = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag not in VOID:
            self.stack.append(tag)
        if tag == "html" and attrs.get("lang") != "ru":
            self.errors.append("html lang must be ru")
        if tag == "h1":
            self.h1 += 1
        if "id" in attrs:
            if attrs["id"] in self.ids:
                self.errors.append(f"Duplicate ID: {attrs['id']}")
            self.ids.add(attrs["id"])
        if tag == "img":
            if "alt" not in attrs:
                self.errors.append("Image has no alt")
            if "width" not in attrs or "height" not in attrs:
                self.errors.append(f"Image has no dimensions: {attrs.get('src')}")
        if tag == "iframe" and not attrs.get("title"):
            self.errors.append("Iframe has no title")
        for key in ("src", "href", "poster", "data-src"):
            if attrs.get(key):
                self.references.append(attrs[key])
        for candidate in attrs.get("srcset", "").split(","):
            if candidate.strip():
                self.references.append(candidate.strip().split()[0])

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1] != tag:
            self.errors.append(f"Unbalanced closing tag: {tag}")
        else:
            self.stack.pop()


def main():
    pages = {}
    for name in ("index.html", "price.html"):
        parser = Page(ROOT / name)
        parser.feed(parser.path.read_text(encoding="utf-8"))
        if parser.stack:
            parser.errors.append(f"Unclosed tags: {parser.stack}")
        if parser.h1 != 1:
            parser.errors.append("Exactly one h1 required")
        pages[name] = parser
    for name, parser in pages.items():
        for reference in parser.references:
            url = urlsplit(reference)
            if url.scheme or url.netloc:
                continue
            target = parser.path.parent / unquote(url.path) if url.path else parser.path
            if not target.is_file():
                parser.errors.append(f"Missing file: {reference}")
            if url.fragment and target.name in pages and url.fragment not in pages[target.name].ids:
                parser.errors.append(f"Missing anchor: {reference}")
    # The existing SCSS source intentionally contains plain CSS and needs no build step.
    if (ROOT / "scss/style.scss").read_text(encoding="utf-8") != (ROOT / "css/style.css").read_text(encoding="utf-8"):
        pages["index.html"].errors.append("scss/style.scss and css/style.css have diverged")
    for stylesheet in (ROOT / "css").glob("*.css"):
        css = stylesheet.read_text(encoding="utf-8")
        for url in re.findall(r"url\([\"']?([^\)\"']+)", css):
            if not url.startswith(("data:", "http", "#")) and not (stylesheet.parent / url).is_file():
                pages["index.html"].errors.append(f"Missing CSS asset: {url}")
    errors = [f"{name}: {error}" for name, page in pages.items() for error in page.errors]
    if errors:
        print("\n".join(errors))
        return 1
    print("PASS: HTML structure, IDs, local assets, anchors, image dimensions and CSS/SCSS consistency")
    return 0


if __name__ == "__main__":
    sys.exit(main())
