"""生成 PWA 应用图标（frontend/public/icons/）。

用法：backend/.venv/Scripts/python.exe scripts/generate_icons.py
依赖：pillow（已在 requirements-dev.txt 中）
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BG_TOP, BG_BOTTOM = (43, 159, 239), (27, 127, 212)
SIZE = 512
FONT_PATH = r"C:\Windows\Fonts\msyhbd.ttc"
OUT_DIR = Path(__file__).resolve().parents[1] / "frontend" / "public" / "icons"


def gradient_fill(img: Image.Image) -> Image.Image:
    gradient = Image.new("RGBA", (SIZE, SIZE))
    for y in range(SIZE):
        ratio = y / (SIZE - 1)
        color = tuple(round(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * ratio) for i in range(3)) + (255,)
        gradient.paste(color, (0, y, SIZE, y + 1))
    img.paste(gradient, (0, 0), gradient)
    return img


def glyph(size: int, font_size: int) -> Image.Image:
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font = ImageFont.truetype(FONT_PATH, font_size)
    left, top, right, bottom = draw.textbbox((0, 0), "远", font=font)
    draw.text(((size - (right - left)) / 2 - left, (size - (bottom - top)) / 2 - top), "远", font=font, fill=(255, 255, 255, 255))
    return layer


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # 标准图标（圆角渐变 + 字形）
    base = gradient_fill(Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)))
    base.alpha_composite(glyph(SIZE, 300))
    base.save(OUT_DIR / "icon-512.png")
    base.resize((192, 192), Image.LANCZOS).save(OUT_DIR / "icon-192.png")
    # maskable：背景铺满无圆角，字形位于安全区内
    maskable = gradient_fill(Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)))
    maskable.alpha_composite(glyph(SIZE, 250))
    maskable.save(OUT_DIR / "maskable-512.png")
    # apple-touch-icon：iOS 不支持透明，直接方形
    apple = gradient_fill(Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)))
    apple.alpha_composite(glyph(SIZE, 300))
    apple.resize((180, 180), Image.LANCZOS).save(OUT_DIR / "apple-touch-icon-180.png")
    print("icons generated ->", OUT_DIR)


if __name__ == "__main__":
    main()
