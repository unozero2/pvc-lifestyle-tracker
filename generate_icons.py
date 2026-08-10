from PIL import Image, ImageDraw

BG = (37, 99, 235, 255)  # theme blue
LINE = (255, 255, 255, 255)


def draw_pulse(draw, w, h, margin_ratio):
    m = w * margin_ratio
    cx0, cx1 = m, w - m
    cy = h * 0.55
    amp = h * 0.16
    pts = [
        (cx0, cy),
        (cx0 + (cx1 - cx0) * 0.18, cy),
        (cx0 + (cx1 - cx0) * 0.28, cy - amp * 0.6),
        (cx0 + (cx1 - cx0) * 0.38, cy + amp * 2.1),
        (cx0 + (cx1 - cx0) * 0.48, cy - amp * 2.6),
        (cx0 + (cx1 - cx0) * 0.58, cy + amp * 0.4),
        (cx0 + (cx1 - cx0) * 0.68, cy),
        (cx1, cy),
    ]
    width = max(3, int(w * 0.045))
    draw.line(pts, fill=LINE, width=width, joint="curve")
    r = width * 1.3
    draw.ellipse([pts[0][0] - r, pts[0][1] - r, pts[0][0] + r, pts[0][1] + r], fill=LINE)
    draw.ellipse([pts[-1][0] - r, pts[-1][1] - r, pts[-1][0] + r, pts[-1][1] + r], fill=LINE)


def make_icon(size, path, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = size * (0.0 if maskable else 0.18)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)
    margin_ratio = 0.30 if maskable else 0.16
    draw_pulse(draw, size, size, margin_ratio)
    img.save(path, "PNG")


make_icon(192, "icons/icon-192.png", maskable=False)
make_icon(512, "icons/icon-512.png", maskable=False)
make_icon(192, "icons/icon-192-maskable.png", maskable=True)
make_icon(512, "icons/icon-512-maskable.png", maskable=True)
print("icons generated")
