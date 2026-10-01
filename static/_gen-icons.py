#!/usr/bin/env python3
"""从 icon.png 生成 PWA 图标。

约定：icon.png 应当是「已裁剪透明边距、内容填满画布」的源图。
如果源图含透明边距，会先做一次裁剪 + 重新填充满画布的预处理，
以避免 iOS 主屏图标因透明区域露出底色而出现「白边」。
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'icon.png')


def fit_to_canvas(img: Image.Image, target: int, safe_ratio: float = 1.0) -> Image.Image:
    """把图等比缩放到 target 边长，再按 safe_ratio 留安全边距居中放置。

    safe_ratio=1.0 表示贴满；0.85 = 留 7.5% 安全边距（防 iOS 圆角裁切）。
    """
    canvas = Image.new('RGBA', (target, target), (0, 0, 0, 0))
    if safe_ratio >= 1.0:
        resized = img.resize((target, target), Image.LANCZOS)
        canvas.paste(resized, (0, 0))
        return canvas

    inner = int(target * safe_ratio)
    scale = inner / max(img.size)
    nw, nh = int(round(img.size[0] * scale)), int(round(img.size[1] * scale))
    resized = img.resize((nw, nh), Image.LANCZOS)
    ox = (target - nw) // 2
    oy = (target - nh) // 2
    canvas.paste(resized, (ox, oy))
    return canvas


def normalize_source(src_path: str, target: int = 1024) -> Image.Image:
    """加载源图，裁掉透明边距，等比缩放到正方形画布（贴满）。"""
    img = Image.open(src_path).convert('RGBA')
    bbox = img.getbbox()
    if bbox:
        cropped = img.crop(bbox)
    else:
        cropped = img
    return fit_to_canvas(cropped, target, safe_ratio=1.0)


def main() -> None:
    base = normalize_source(SRC)
    print(f'  base normalized: {base.size}')

    base.resize((192, 192), Image.LANCZOS).save(
        os.path.join(HERE, 'icon-192.png'), 'PNG', optimize=True
    )
    print('  -> icon-192.png (192x192)')

    base.resize((512, 512), Image.LANCZOS).save(
        os.path.join(HERE, 'icon-512.png'), 'PNG', optimize=True
    )
    print('  -> icon-512.png (512x512)')

    fit_to_canvas(base, 512, safe_ratio=0.85).save(
        os.path.join(HERE, 'icon-512-maskable.png'), 'PNG', optimize=True
    )
    print('  -> icon-512-maskable.png (512x512, 85% safe zone)')

    base.resize((64, 64), Image.LANCZOS).save(
        os.path.join(HERE, 'favicon.png'), 'PNG', optimize=True
    )
    print('  -> favicon.png (64x64)')

    fit_to_canvas(base, 180, safe_ratio=0.92).save(
        os.path.join(HERE, 'apple-touch-icon-180x180.png'), 'PNG', optimize=True
    )
    print('  -> apple-touch-icon-180x180.png (180x180, 92% safe zone)')


if __name__ == '__main__':
    main()