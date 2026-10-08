"""Regression checks derived from the owner's updated SVG price sheet."""
from pathlib import Path
from html.parser import HTMLParser
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Text(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.parts = []
        self.feed(html)

    def handle_data(self, data):
        self.parts.append(data)


def normalized(html):
    return " ".join(" ".join(Text(html).parts).split())


class PricingTest(unittest.TestCase):
    def setUp(self):
        self.price = normalized((ROOT / "price.html").read_text(encoding="utf-8"))
        self.home = normalized((ROOT / "index.html").read_text(encoding="utf-8"))

    def test_photo_packages_match_on_both_pages(self):
        for page in (self.price, self.home):
            self.assertIn("Лайт 450 ₽", page)
            self.assertIn("Полный пакет 850 ₽", page)
        self.assertIn("Электронный вариант готовой фотографии 150 ₽", self.price)
        self.assertIn("Электронная версия уже готовой фотографии — 150 ₽", self.home)

    def test_new_video_services_from_svg(self):
        self.assertIn("Монтаж ролика до 3 минут 2000 ₽", self.price)
        self.assertIn("Музыкальное слайд-шоу с фото до 3 минут 1500 ₽", self.price)

    def test_digitization_uses_updated_hour_and_minute_rates(self):
        for service in ("Оцифровка видеокассеты", "Оцифровка аудиокассеты / аудио на катушке"):
            self.assertIn(f"{service} 700 ₽ за первый час, далее 10 ₽/мин.", self.price)
        self.assertIn("Сканирование фотоплёнки 500 ₽", self.price)
        self.assertIn("Оцифровка слайдов 60 ₽/кадр", self.price)

    def test_retired_dvd_transfer_is_not_listed(self):
        self.assertNotIn("Перенос файлов с DVD", self.price)
        self.assertIn("Запись / копирование DVD (до 700 МБ) 300 ₽", self.price)


if __name__ == "__main__":
    unittest.main()
