"""Build six review-only lowercase Cyrillic SVG wordmarks and paired favicons."""
from pathlib import Path
from io import BytesIO
import base64
import json
import xml.etree.ElementTree as ET
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parent
WORD = 'рцмаркет'
PREVIEW = Path('/Users/admin/.codex/visualizations/2026/09/07/01a07cbe-290a-7531-b916-5a6ee63943f1/rcmarket-vector-directions.html')

def font_shape(filename, weight, text):
    font = TTFont(ROOT / 'fonts' / filename)
    if 'fvar' in font:
        font = instantiateVariableFont(font, {'wght': weight})
    cmap = font.getBestCmap()
    assert all(ord(c) in cmap for c in text)
    stream = BytesIO()
    font.save(stream)
    hfont = hb.Font(hb.Face(stream.getvalue()))
    buffer = hb.Buffer()
    buffer.add_str(text)
    buffer.guess_segment_properties()
    hb.shape(hfont, buffer, {'kern': True})
    glyphs = font.getGlyphSet()
    order = font.getGlyphOrder()
    pen = SVGPathPen(glyphs)
    bounds = BoundsPen(glyphs)
    cursor = 0
    for info, pos in zip(buffer.glyph_infos, buffer.glyph_positions):
        assert info.codepoint != 0
        matrix = (1, 0, 0, -1, cursor + pos.x_offset, -pos.y_offset)
        glyphs[order[info.codepoint]].draw(TransformPen(pen, matrix))
        glyphs[order[info.codepoint]].draw(TransformPen(bounds, matrix))
        cursor += pos.x_advance
    x0, y0, x1, y1 = bounds.bounds
    scale = 96 / (y1-y0)
    width = (x1-x0)*scale+4
    inner = f'<g transform="translate(2 2) scale({scale:.7f}) translate({-x0} {-y0})"><path d="{pen.getCommands()}"/></g>'
    return inner, width, 100

def drawn_shape(mode, text):
    # Custom lowercase constructions: x-height 64, descenders to 86.
    angular = mode == 'cut'
    wedge = mode == 'wedge'
    weight = 11 if angular else (9 if wedge else 6)
    if len(text) == 1:
        weight = max(weight, 9)
    glyph = {
      'р': ('M0 86V0 M0 0H28L42 12V50L28 64H0' if angular else 'M0 86V0 M0 9Q9 0 24 0Q44 0 44 32Q44 64 24 64Q8 64 0 55', 44),
      'ц': ('M0 0V64H42V0 M42 64H49V81', 49),
      'м': ('M0 64V0L27 36L54 0V64', 54),
      'а': ('M40 0V64H48 M40 0H13L0 13V51L13 64H31L40 55' if angular else 'M42 64V0 M42 10Q32 0 21 0Q0 0 0 32Q0 64 21 64Q33 64 42 54', 48 if angular else 42),
      'к': ('M0 0V64 M41 0L0 32L43 64', 43),
      'е': ('M0 31H43V12L30 0H13L0 13V51L13 64H40' if angular else 'M0 31H44Q44 0 23 0Q0 0 0 32Q0 64 23 64Q37 64 44 56', 44),
      'т': ('M0 0H46 M23 0V64', 46)
    }
    cursor, parts = 0, []
    for char in text:
        d, width = glyph[char]
        parts.append(f'<g transform="translate({cursor} 0)"><path d="{d}" fill="none" stroke="currentColor" stroke-width="{weight}" stroke-linecap="butt" stroke-linejoin="miter"/>')
        if wedge:
            # Discrete triangular terminal flares, not hairline serifs.
            if char in 'рцмк':
                parts.append('<path d="M-9 0H9L0 10Z"/>')
            if char in 'мк':
                parts.append('<path d="M-9 64H9L0 54Z"/>')
            if char == 'т':
                parts.append('<path d="M15 64H31L23 57Z"/>')
        parts.append('</g>')
        cursor += width + (18 if angular else 15)
    width = cursor - (18 if angular else 15) + 20
    return '<g transform="translate(10 7)">' + ''.join(parts) + '</g>', width, 100

def svg_document(inner, width, height, color, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.4f} {height}" role="img" aria-label="{title}" fill="{color}" color="{color}"><title>{title}</title>{inner}</svg>\n'

variants = [
 ('01-yeseva', '01 · Характер', 'Yeseva One · шрифтовая основа', lambda t: font_shape('yeseva.ttf', 400, t)),
 ('02-manrope', '02 · Чистота', 'Manrope 600 · шрифтовая основа', lambda t: font_shape('manrope.ttf', 600, t)),
 ('03-unbounded', '03 · Широта', 'Unbounded 500 · шрифтовая основа', lambda t: font_shape('unbounded.ttf', 500, t)),
 ('04-geometric', '04 · Геометрия', 'Авторская конструкция · ровный штрих', lambda t: drawn_shape('line', t)),
 ('05-cut', '05 · Срез', 'Авторская конструкция · угловатые формы', lambda t: drawn_shape('cut', t)),
 ('06-wedge', '06 · Клин', 'Авторская конструкция · короткие засечки', lambda t: drawn_shape('wedge', t)),
]

manifest = []
template = (ROOT / 'preview.template.html').read_text()
for slug, label, note, shape in variants:
    inner, width, height = shape(WORD)
    for color, name in [('#111111', 'black'), ('#ffffff', 'white')]:
        svg = svg_document(inner, width, height, color, WORD)
        ET.fromstring(svg)
        assert '<text' not in svg and '<image' not in svg and 'font-family' not in svg
        target = ROOT / 'svg' / f'rcmarket-{slug}-{name}.svg'
        target.write_text(svg)
        template = template.replace('{{'+slug+'-'+name+'}}', 'data:image/svg+xml;base64,'+base64.b64encode(svg.encode()).decode())
    fin, fw, fh = shape('р')
    scale = min(20/fw, 24/fh)
    favicon = svg_document(f'<rect width="32" height="32" fill="#111111"/><g transform="translate({(32-fw*scale)/2:.5f} {(32-fh*scale)/2:.5f}) scale({scale:.7f})">{fin}</g>', 32, 32, '#ffffff', 'рцмаркет')
    (ROOT / 'favicon' / f'favicon-{slug}.svg').write_text(favicon)
    template = template.replace('{{'+slug+'-favicon}}', 'data:image/svg+xml;base64,'+base64.b64encode(favicon.encode()).decode())
    manifest.append({'slug': slug, 'label': label, 'note': note, 'aspectRatio': round(width/height, 3), 'word': WORD})
assert '{{' not in template
PREVIEW.write_text(template)
(ROOT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
print('Built 12 wordmark SVGs + 6 favicon SVGs; all path-based, lowercase Cyrillic')
