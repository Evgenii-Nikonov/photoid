"""Refresh static SEO metadata. Use --base-url only after the new HTTPS site works."""
import argparse
from html import escape
import json
from pathlib import Path
import re
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config/site.json"
PAGES = {
    "index.html": {
        "path": "",
        "title": "Фото на документы в Новосибирске от 450 ₽ — PHOTO ID",
        "description": "Фото на паспорт, загранпаспорт и визу в Новосибирске от 450 ₽. Ретушь и печать за 15–20 минут. PHOTO ID: 10-й Порт-Артурский переулок, 75.",
    },
    "price.html": {
        "path": "price.html",
        "title": "Цены на фото, печать и копии в Новосибирске — PHOTO ID",
        "description": "Актуальный прайс PHOTO ID в Новосибирске: фото на документы от 450 ₽, печать фото и документов, сканирование, ламинирование, полиграфия и сувениры.",
    },
}


def normalized_url(value):
    url = urlsplit(value)
    if url.scheme != "https" or not url.hostname or url.query or url.fragment or url.username or url.password or url.port:
        raise ValueError("base_url must be an HTTPS URL without credentials, port, query or fragment")
    host = url.hostname.encode("idna").decode("ascii")
    if not re.fullmatch(r"[a-z0-9.-]+", host) or not re.fullmatch(r"[A-Za-z0-9/_~.%+-]*", url.path) or ".." in url.path:
        raise ValueError("Use a valid public hostname and a simple site path")
    return f"https://{host}{url.path.rstrip('/')}/"


def structured_data(base, page, metadata):
    business = {
        "@type": "LocalBusiness", "@id": base + "#studio", "name": "PHOTO ID",
        "url": base, "telephone": "+79234968231", "logo": base + "images/logo.svg",
        "image": base + "images/social-cover.png",
        "address": {"@type": "PostalAddress", "streetAddress": "10-й Порт-Артурский переулок, 75", "addressLocality": "Новосибирск", "addressRegion": "Новосибирская область", "addressCountry": "RU"},
        "openingHours": ["Mo-Fr 10:00-20:00", "Sa-Su 10:00-19:00"],
        "areaServed": {"@type": "City", "name": "Новосибирск"},
        "sameAs": ["https://t.me/photoid1", "https://max.ru/u/f9LHodD0cOI4XO2QI0L5qk12dPuU03sgYtEx1xCn4u_5rWzCIyicQk673To"],
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Фото на документы", "itemListElement": [
            {"@type": "Offer", "name": name, "price": price, "priceCurrency": "RUB", "url": base + "price.html#document-prices", "itemOffered": {"@type": "Service", "name": "Фото на документы — " + name}}
            for name, price in [("Лайт", "450"), ("Полный пакет", "850")]
        ]},
    }
    graph = [business, {"@type": "WebSite", "@id": base + "#website", "url": base, "name": "PHOTO ID", "inLanguage": "ru-RU", "publisher": {"@id": base + "#studio"}},
             {"@type": "WebPage", "@id": page + "#webpage", "url": page, "name": metadata["title"], "description": metadata["description"], "inLanguage": "ru-RU", "isPartOf": {"@id": base + "#website"}, "about": {"@id": base + "#studio"}}]
    if metadata["path"]:
        graph.append({"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Главная", "item": base},
            {"@type": "ListItem", "position": 2, "name": "Цены на услуги", "item": page}
        ]})
    return {"@context": "https://schema.org", "@graph": graph}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url")
    parser.add_argument("--metrika-id")
    args = parser.parse_args()
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    base = normalized_url(args.base_url or config["base_url"])
    counter = args.metrika_id if args.metrika_id is not None else config["metrika_id"]
    if counter and (not re.fullmatch(r"[1-9]\d*", counter) or int(counter) > 9007199254740991):
        raise ValueError("Supply a real numeric Metrika ID or leave it empty")
    for name, metadata in PAGES.items():
        path = ROOT / name
        html = path.read_text(encoding="utf-8")
        html = re.sub(r"\s*<meta\s+name=\"description\"\s+content=\"[^\"]*\"\s*/>", "", html, count=1)
        html = re.sub(r"\s*<title>.*?</title>", "", html, count=1)
        html = re.sub(r"\s*<!-- SEO:start -->.*?<!-- SEO:end -->", "", html, flags=re.S)
        page = base + metadata["path"]
        lines = ["    <!-- SEO:start -->", f'    <title>{escape(metadata["title"])}</title>',
                 f'    <meta name="description" content="{escape(metadata["description"], quote=True)}" />',
                 f'    <link rel="canonical" href="{page}" />',
                 f'    <link rel="sitemap" type="application/xml" href="{base}sitemap.xml" />',
                 '    <meta property="og:type" content="website" />', '    <meta property="og:locale" content="ru_RU" />', '    <meta property="og:site_name" content="PHOTO ID" />',
                 f'    <meta property="og:title" content="{escape(metadata["title"], quote=True)}" />',
                 f'    <meta property="og:description" content="{escape(metadata["description"], quote=True)}" />',
                 f'    <meta property="og:url" content="{page}" />', f'    <meta property="og:image" content="{base}images/social-cover.png" />',
                 '    <meta property="og:image:width" content="1200" />', '    <meta property="og:image:height" content="630" />',
                 '    <meta property="og:image:alt" content="PHOTO ID — фото на документы в Новосибирске от 450 рублей" />',
                 '    <meta name="twitter:card" content="summary_large_image" />',
                 f'    <meta name="yandex-metrika-id" content="{counter}" />',
                 '    <script type="application/ld+json">', json.dumps(structured_data(base, page, metadata), ensure_ascii=False, indent=2), '    </script>', "    <!-- SEO:end -->"]
        html = html.replace('    <meta name="viewport" content="width=device-width, initial-scale=1.0" />', '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' + "\n".join(lines), 1)
        path.write_text(html, encoding="utf-8")
    ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
    ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    sitemap = ET.Element(ns + "urlset")
    for metadata in PAGES.values():
        ET.SubElement(ET.SubElement(sitemap, ns + "url"), ns + "loc").text = base + metadata["path"]
    ET.indent(sitemap, space="  ")
    ET.ElementTree(sitemap).write(ROOT / "sitemap.xml", encoding="utf-8", xml_declaration=True)
    config["base_url"] = base
    config["metrika_id"] = counter
    CONFIG.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Updated SEO, structured data and sitemap for", base)


if __name__ == "__main__":
    main()
