#!/usr/bin/env python3
"""从 duorou.png 生成 PWA 图标。"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'duorou.png')


def main() -> None:
    img = Image.open(SRC).convert('RGBA')

    img.resize((192, 192), Image.LANCZOS).save(
        os.path.join(HERE, 'icon-192.png'), 'PNG', optimize=True
    )
    print('  -> icon-192.png (192x192)')

    img.resize((512, 512), Image.LANCZOS).save(
        os.path.join(HERE, 'icon-512.png'), 'PNG', optimize=True
    )
    print('  -> icon-512.png (512x512)')

    mask = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    inner = img.resize((int(512 * 0.8), int(512 * 0.8)), Image.LANCZOS)
    offset = (512 - inner.width) // 2
    mask.paste(inner, (offset, offset), inner)
    mask.save(os.path.join(HERE, 'icon-512-maskable.png'), 'PNG', optimize=True)
    print('  -> icon-512-maskable.png (512x512)')

    img.resize((64, 64), Image.LANCZOS).save(
        os.path.join(HERE, 'favicon.png'), 'PNG', optimize=True
    )
    print('  -> favicon.png (64x64)')


if __name__ == '__main__':
    main()