#!/usr/bin/env python3
"""从 icon.png 生成 PWA 图标。

约定：icon.png 是源图。若源图有透明边距或带圆角的非透明背景，
都会先做归一化（裁掉透明 bbox + 延伸背景色到画布四角），
避免 iOS 主屏图标因透明区域露出底色而出现「白边」。
"""
import os
from collections import Counter
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'icon.png')


def fit_to_canvas(img: Image.Image, target: int, safe_ratio: float = 1.0) -> Image.Image:
    """等比缩放到 target 边长居中放置，留 safe_ratio 安全边距（1.0 = 贴满）。

    透明画布用于不会出现在 iOS 主屏位置的图标（favicon / 192 / 512 / maskable），
    主屏用的 apple-touch-icon 另走 fill_canvas()。
    """
    canvas = Image.new('RGBA', (target, target), (0, 0, 0, 0))
    inner = int(target * safe_ratio)
    scale = inner / max(img.size)
    nw = int(round(img.size[0] * scale))
    nh = int(round(img.size[1] * scale))
    resized = img.resize((nw, nh), Image.LANCZOS)
    ox = (target - nw) // 2
    oy = (target - nh) // 2
    canvas.paste(resized, (ox, oy))
    return canvas


def fill_canvas(img: Image.Image, target: int = 1024) -> Image.Image:
    """把图填满正方形画布：先裁透明 bbox，再延伸背景色覆盖所有透明像素。

    适用于 iOS 主屏图标（apple-touch-icon）：必须 100% 不透明，
    否则透明区域会露出主屏壁纸底色，看起来就是「白边」。
    """
    bbox = img.getbbox()
    cropped = img.crop(bbox) if bbox else img
    cw, ch = cropped.size

    sample_h = max(2, ch // 16)
    top_strip = cropped.crop((0, 0, cw, sample_h))
    bottom_strip = cropped.crop((0, ch - sample_h, cw, ch))
    top_color = Counter(p for p in top_strip.getdata() if p[3] > 200).most_common(1)[0][0]
    bottom_color = Counter(p for p in bottom_strip.getdata() if p[3] > 200).most_common(1)[0][0]

    scaled = cropped.resize((target, target), Image.LANCZOS)

    bg = Image.new('RGBA', (target, target))
    for y in range(target):
        t = y / (target - 1)
        r = int(top_color[0] * (1 - t) + bottom_color[0] * t)
        g = int(top_color[1] * (1 - t) + bottom_color[1] * t)
        b = int(top_color[2] * (1 - t) + bottom_color[2] * t)
        for x in range(target):
            bg.putpixel((x, y), (r, g, b, 255))

    return Image.alpha_composite(bg, scaled)


def main() -> None:
    base = fill_canvas(Image.open(SRC).convert('RGBA'))
    print(f'  base filled: {base.size}')

    fit_to_canvas(base, 192).save(
        os.path.join(HERE, 'icon-192.png'), 'PNG', optimize=True
    )
    print('  -> icon-192.png (192x192)')

    fit_to_canvas(base, 512).save(
        os.path.join(HERE, 'icon-512.png'), 'PNG', optimize=True
    )
    print('  -> icon-512.png (512x512)')

    fit_to_canvas(base, 512, safe_ratio=0.85).save(
        os.path.join(HERE, 'icon-512-maskable.png'), 'PNG', optimize=True
    )
    print('  -> icon-512-maskable.png (512x512, 85% safe zone, transparent corners OK)')

    fit_to_canvas(base, 64).save(
        os.path.join(HERE, 'favicon.png'), 'PNG', optimize=True
    )
    print('  -> favicon.png (64x64)')

    fit_to_canvas(base, 180).save(
        os.path.join(HERE, 'apple-touch-icon-180x180.png'), 'PNG', optimize=True
    )
    print('  -> apple-touch-icon-180x180.png (180x180, full bleed — iOS crops corners)')


if __name__ == '__main__':
    main()