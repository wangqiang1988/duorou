#!/usr/bin/env python3
"""生成 PWA 图标：简单的多肉图标"""
import math
import os
from PIL import Image, ImageDraw

OUT = os.path.dirname(os.path.abspath(__file__))


def make_icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = int(size * (0.22 if maskable else 0.05))
    bg_size = size - 2 * pad
    cx = cy = size / 2

    # 背景圆形
    bg_color = (124, 154, 110, 255)  # leaf-500
    draw.ellipse(
        [pad, pad, size - pad, size - pad],
        fill=bg_color,
    )

    # 多肉：中心 + 5 层花瓣
    layers = [
        (0.34, 8, (168, 200, 145, 255)),   # 内
        (0.28, 8, (149, 188, 125, 255)),
        (0.22, 8, (132, 174, 105, 255)),
        (0.16, 8, (115, 158, 90, 255)),
        (0.10, 6, (100, 145, 78, 255)),   # 外
    ]

    petal_max = size * 0.40
    for ratio, count, color in layers:
        r = petal_max * (0.5 + ratio)
        for i in range(count):
            ang = (2 * math.pi / count) * i - math.pi / 2
            px = cx + r * math.cos(ang)
            py = cy + r * math.sin(ang)
            petal = size * 0.14
            draw.ellipse(
                [px - petal, py - petal, px + petal, py + petal],
                fill=color,
            )

    # 中心亮点
    core = size * 0.10
    draw.ellipse(
        [cx - core, cy - core, cx + core, cy + core],
        fill=(180, 215, 155, 255),
    )

    return img


# 生成三个图标
for size, name, maskable in [
    (192, 'icon-192.png', False),
    (512, 'icon-512.png', False),
    (512, 'icon-512-maskable.png', True),
]:
    img = make_icon(size, maskable)
    img.save(os.path.join(OUT, name), 'PNG', optimize=True)
    print(f'  → {name} ({size}x{size})')

# favicon 用 SVG（更小、矢量）
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#7c9a6e"/>
  <g fill="#a5bf8c">
    <ellipse cx="32" cy="14" rx="6" ry="9"/>
    <ellipse cx="32" cy="50" rx="6" ry="9"/>
    <ellipse cx="14" cy="32" rx="9" ry="6"/>
    <ellipse cx="50" cy="32" rx="9" ry="6"/>
    <ellipse cx="18" cy="18" rx="7" ry="7" transform="rotate(-45 18 18)"/>
    <ellipse cx="46" cy="18" rx="7" ry="7" transform="rotate(45 46 18)"/>
    <ellipse cx="18" cy="46" rx="7" ry="7" transform="rotate(45 18 46)"/>
    <ellipse cx="46" cy="46" rx="7" ry="7" transform="rotate(-45 46 46)"/>
  </g>
  <circle cx="32" cy="32" r="6" fill="#b4d79b"/>
</svg>'''
with open(os.path.join(OUT, 'favicon.svg'), 'w') as f:
    f.write(svg)
print('  → favicon.svg')

print('完成')