"""Generate web-sized copies; never modify original customer photographs."""
from pathlib import Path
from PIL import Image, ImageOps
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "images" / "optimized"
JOBS = [
    ("images/img/main baground/main-bg.png", "portrait", (480, 800)),
    ("images/before.jpg", "before", (960, 1600)),
    ("images/after.jpg", "after", (960, 1600)),
]
GALLERY = ["example1.jpg", "IMG_1281 (3).jpg", "IMG_2368.jpg", "IMG_2411.jpg",
           "IMG_7829.jpg", "IMG_9125.jpg", "IMG_9531.jpg", "IMG_9721-1 (2).jpg"]
JOBS += [(f"images/img/{name}", f"example-{i}", (480, 960))
         for i, name in enumerate(GALLERY, 1)]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report = []
    for source, name, widths in JOBS:
        path = ROOT / source
        with Image.open(path) as original:
            image = ImageOps.exif_transpose(original)
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
            for width in widths:
                height = round(image.height * width / image.width)
                target = OUT / f"{name}-{width}.webp"
                image.resize((width, height), Image.Resampling.LANCZOS).save(
                    target, "WEBP", quality=85, method=6
                )
                report.append({"source": source, "output": str(target.relative_to(ROOT)),
                               "width": width, "height": height, "bytes": target.stat().st_size})
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
