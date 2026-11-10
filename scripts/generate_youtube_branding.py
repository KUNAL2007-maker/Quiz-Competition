import os
import json
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

# Paths
REPO_ROOT = r'C:\Users\Priyanka\OneDrive\Desktop\Quiz-Competition'
ARTIFACT_DIR = r'C:\Users\Priyanka\.gemini\antigravity\brain\629ed097-9b0a-4e4b-b08c-5dc4258886fd'
OUTPUT_DIR = os.path.join(REPO_ROOT, 'public', 'branding', 'youtube')
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

OUTLINE_PATH = os.path.join(REPO_ROOT, '3d symbol', 'outline-v5.json')
with open(OUTLINE_PATH, 'r') as f:
    outline_data = json.load(f)

outer_raw = np.array(outline_data['outer'])
hole1_raw = np.array(outline_data['holes'][0])
hole2_raw = np.array(outline_data['holes'][1])

# Fonts
FONT_BOLD = r'C:\Windows\Fonts\bahnschrift.ttf'
FONT_MONO = r'C:\Windows\Fonts\consolab.ttf'
FONT_MONO_REG = r'C:\Windows\Fonts\consola.ttf'
FONT_SEGOE = r'C:\Windows\Fonts\segoeuib.ttf'

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

# Colors
C_BG = (13, 14, 12, 255)            # Deep obsidian black #0d0e0c
C_NEON = (141, 198, 63, 255)        # Signature Null Origin green #8dc63f
C_LIME_BRIGHT = (180, 235, 90, 255) # Bright lime #b4eb5a
C_LIME_HOVER = (164, 214, 94, 255)  # #a4d65e
C_CYAN = (0, 229, 255, 255)         # Tech cyan #00E5FF
C_WHITE = (245, 245, 242, 255)      # Off-white #f5f5f2
C_MUTED = (168, 168, 162, 255)      # Muted gray #a8a8a2
C_DARK_CARD = (27, 27, 25, 255)     # #1b1b19

def render_symbol_rgba(target_size=800, glow_color=(141, 198, 63), base_color=(180, 235, 90)):
    """Renders the exact Null Origin symbol with anti-aliasing and multi-stage neon glow."""
    SS = target_size * 3  # 3x supersampling
    center = SS / 2.0
    scale = SS * 0.33

    def to_px(pts):
        x = center + pts[:, 0] * scale
        y = center - pts[:, 1] * scale
        return list(zip(x, y))

    poly_outer = to_px(outer_raw)
    poly_h1 = to_px(hole1_raw)
    poly_h2 = to_px(hole2_raw)

    mask = Image.new('L', (SS, SS), 0)
    d = ImageDraw.Draw(mask)
    d.polygon(poly_outer, fill=255)
    d.polygon(poly_h1, fill=0)
    d.polygon(poly_h2, fill=0)

    # Downsample mask with Lanczos anti-aliasing
    clean_mask = mask.resize((target_size, target_size), Image.Resampling.LANCZOS)

    # Multi-stage glow
    # Layer 1: Wide diffused bloom
    wide_glow_mask = clean_mask.filter(ImageFilter.GaussianBlur(target_size * 0.05))
    wide_glow = Image.new('RGBA', (target_size, target_size), glow_color + (0,))
    wide_arr = np.array(wide_glow)
    wide_arr[:, :, 3] = (np.array(wide_glow_mask, dtype=float) * 0.45).astype(np.uint8)
    wide_glow = Image.fromarray(wide_arr)

    # Layer 2: Core intense neon halo
    core_glow_mask = clean_mask.filter(ImageFilter.GaussianBlur(target_size * 0.018))
    core_glow = Image.new('RGBA', (target_size, target_size), base_color + (0,))
    core_arr = np.array(core_glow)
    core_arr[:, :, 3] = (np.array(core_glow_mask, dtype=float) * 0.85).astype(np.uint8)
    core_glow = Image.fromarray(core_arr)

    # Layer 3: Solid metallic/gradient core
    # Create top-to-bottom vertical gradient
    grad = np.linspace(1.15, 0.85, target_size)[:, None]
    solid_arr = np.zeros((target_size, target_size, 4), dtype=np.uint8)
    for c in range(3):
        solid_arr[:, :, c] = np.clip(base_color[c] * grad, 0, 255).astype(np.uint8)
    solid_arr[:, :, 3] = np.array(clean_mask)
    solid = Image.fromarray(solid_arr)

    # Composite: Wide glow -> Core glow -> Solid core
    result = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    result = Image.alpha_composite(result, wide_glow)
    result = Image.alpha_composite(result, core_glow)
    result = Image.alpha_composite(result, solid)
    return result

def draw_hud_circle(d, cx, cy, r, color, width=1, dash_len=None):
    """Draws a smooth circular HUD ring, optionally dashed."""
    if dash_len is None:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=width)
        return
    # Draw dashed ring using arc segments
    circumference = 2 * math.pi * r
    num_dashes = int(circumference / (dash_len * 2))
    deg_per_dash = 360.0 / (num_dashes * 2)
    for i in range(num_dashes):
        start_deg = i * deg_per_dash * 2
        d.arc([cx - r, cy - r, cx + r, cy + r], start=start_deg, end=start_deg + deg_per_dash, fill=color, width=width)

def generate_avatar(output_path, dark_bg=True):
    """Generates 1024x1024 Circular YouTube Avatar."""
    SIZE = 1024
    im = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))

    if dark_bg:
        # Radial background gradient: #191c15 at center to #090a08 at corners
        y, x = np.ogrid[:SIZE, :SIZE]
        dist_from_center = np.sqrt((x - SIZE/2)**2 + (y - SIZE/2)**2)
        norm_dist = np.clip(dist_from_center / (SIZE * 0.707), 0, 1)

        # Gradient interpolation
        c_center = np.array([25, 29, 22], dtype=float)
        c_edge = np.array([10, 11, 9], dtype=float)
        bg_rgb = (c_center[None, None, :] * (1 - norm_dist[:, :, None]) +
                  c_edge[None, None, :] * norm_dist[:, :, None]).astype(np.uint8)

        bg_img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 255))
        bg_arr = np.array(bg_img)
        bg_arr[:, :, :3] = bg_rgb
        im = Image.fromarray(bg_arr)

    d = ImageDraw.Draw(im)
    cx, cy = SIZE // 2, SIZE // 2

    # Draw Subtle Cyber HUD concentric rings
    # Ring 1: YouTube circle boundary reference (r = 500)
    draw_hud_circle(d, cx, cy, 498, (141, 198, 63, 40), width=1)

    # Ring 2: Outer dashed telemetry ring (r = 465)
    draw_hud_circle(d, cx, cy, 465, (141, 198, 63, 140), width=2, dash_len=14)

    # Ring 3: Technical dial with degree ticks (r = 445)
    draw_hud_circle(d, cx, cy, 445, (168, 168, 162, 50), width=1)
    for deg in range(0, 360, 10):
        rad = math.radians(deg)
        r_inner = 437 if deg % 30 == 0 else 441
        r_outer = 445
        x1 = cx + r_inner * math.cos(rad)
        y1 = cy + r_inner * math.sin(rad)
        x2 = cx + r_outer * math.cos(rad)
        y2 = cy + r_outer * math.sin(rad)
        tick_col = (141, 198, 63, 200) if deg % 90 == 0 else (168, 168, 162, 90)
        d.line([(x1, y1), (x2, y2)], fill=tick_col, width=2 if deg % 90 == 0 else 1)

    # Ring 4: Inner glowing green bracket ring (r = 415)
    # 4 curved corner brackets
    for start_deg in [15, 105, 195, 285]:
        d.arc([cx - 415, cy - 415, cx + 415, cy + 415], start=start_deg, end=start_deg + 60, fill=(141, 198, 63, 180), width=3)

    # Degree telemetry labels
    font_mono_small = get_font(FONT_MONO, 14)
    font_mono_micro = get_font(FONT_MONO, 12)
    d.text((cx, cy - 482), '000°', font=font_mono_micro, fill=(141, 198, 63, 180), anchor='mm')
    d.text((cx + 482, cy), '090°', font=font_mono_micro, fill=(141, 198, 63, 180), anchor='mm')
    d.text((cx, cy + 482), '180°', font=font_mono_micro, fill=(141, 198, 63, 180), anchor='mm')
    d.text((cx - 482, cy), '270°', font=font_mono_micro, fill=(141, 198, 63, 180), anchor='mm')

    # Brand text along HUD ring
    d.text((cx - 380, cy - 380), 'NULL_ORIGIN // 0x00', font=font_mono_small, fill=(168, 168, 162, 130), anchor='lt')
    d.text((cx + 380, cy + 380), 'SEC_OPS.ACT', font=font_mono_small, fill=(141, 198, 63, 140), anchor='rb')

    # Render central symbol (size = 620px, sits well within radius 400px safe zone)
    symbol_img = render_symbol_rgba(target_size=620, glow_color=(141, 198, 63), base_color=(180, 235, 90))
    sx = cx - symbol_img.width // 2
    sy = cy - symbol_img.height // 2
    im.alpha_composite(symbol_img, (sx, sy))

    # Save PNG
    im.save(output_path, 'PNG', optimize=True)
    print(f'Saved Avatar: {output_path}')
    return im

def generate_banner(output_path):
    """Generates official 2560x1440 Master YouTube Channel Banner."""
    W, H = 2560, 1440
    # Safe area: 1546 x 423 centered
    SAFE_W, SAFE_H = 1546, 423
    SAFE_X1 = (W - SAFE_W) // 2  # 507
    SAFE_Y1 = (H - SAFE_H) // 2  # 508
    SAFE_X2 = SAFE_X1 + SAFE_W   # 2053
    SAFE_Y2 = SAFE_Y1 + SAFE_H   # 931

    im = Image.new('RGBA', (W, H), (13, 14, 12, 255))
    d = ImageDraw.Draw(im)

    # 1. Perspective Grid (Ceiling & Floor)
    # Floor grid (below Y=931)
    grid_col = (141, 198, 63, 25)
    for y_pos in [960, 1000, 1050, 1110, 1180, 1260, 1350]:
        d.line([(0, y_pos), (W, y_pos)], fill=grid_col, width=1)
    # Ceiling grid (above Y=508)
    for y_pos in [480, 440, 390, 330, 260, 180, 90]:
        d.line([(0, y_pos), (W, y_pos)], fill=grid_col, width=1)
    # Perspective vanishing lines radiating to horizon
    horizon_y = H // 2
    for x_pos in range(-600, W + 700, 120):
        # Top rays
        d.line([(x_pos, 0), (W // 2 + (x_pos - W // 2) * 0.45, horizon_y - 210)], fill=(141, 198, 63, 18), width=1)
        # Bottom rays
        d.line([(x_pos, H), (W // 2 + (x_pos - W // 2) * 0.45, horizon_y + 210)], fill=(141, 198, 63, 18), width=1)

    # 2. Ambient Volumetric Glow Blobs (TV & Desktop ambiance)
    glow_map = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_map)
    # Left safe zone glow (behind emblem)
    gd.ellipse([SAFE_X1 + 40, SAFE_Y1 + 10, SAFE_X1 + 440, SAFE_Y2 - 10], fill=(141, 198, 63, 75))
    # Top-right subtle cyan tech glow
    gd.ellipse([SAFE_X2 - 500, SAFE_Y1 - 100, SAFE_X2 + 300, SAFE_Y1 + 300], fill=(0, 229, 255, 30))
    glow_map = glow_map.filter(ImageFilter.GaussianBlur(90))
    im = Image.alpha_composite(im, glow_map)
    d = ImageDraw.Draw(im)

    # 3. Horizontal Cyber Safe-Area Subtle Backdrop
    card_bg = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card_bg)
    cd.rectangle([0, SAFE_Y1 - 2, W, SAFE_Y2 + 2], fill=(20, 22, 18, 120))
    # Safe area upper and lower neon hairline borders
    cd.line([(0, SAFE_Y1), (W, SAFE_Y1)], fill=(141, 198, 63, 60), width=1)
    cd.line([(0, SAFE_Y2), (W, SAFE_Y2)], fill=(141, 198, 63, 60), width=1)
    # Corner HUD accents on safe zone
    acc_len = 50
    cd.line([(SAFE_X1, SAFE_Y1), (SAFE_X1 + acc_len, SAFE_Y1)], fill=C_NEON, width=2)
    cd.line([(SAFE_X1, SAFE_Y1), (SAFE_X1, SAFE_Y1 + acc_len)], fill=C_NEON, width=2)
    cd.line([(SAFE_X2, SAFE_Y1), (SAFE_X2 - acc_len, SAFE_Y1)], fill=C_NEON, width=2)
    cd.line([(SAFE_X2, SAFE_Y1), (SAFE_X2, SAFE_Y1 + acc_len)], fill=C_NEON, width=2)
    cd.line([(SAFE_X1, SAFE_Y2), (SAFE_X1 + acc_len, SAFE_Y2)], fill=C_NEON, width=2)
    cd.line([(SAFE_X1, SAFE_Y2), (SAFE_X1, SAFE_Y2 - acc_len)], fill=C_NEON, width=2)
    cd.line([(SAFE_X2, SAFE_Y2), (SAFE_X2 - acc_len, SAFE_Y2)], fill=C_NEON, width=2)
    cd.line([(SAFE_X2, SAFE_Y2), (SAFE_X2, SAFE_Y2 - acc_len)], fill=C_NEON, width=2)
    im = Image.alpha_composite(im, card_bg)
    d = ImageDraw.Draw(im)

    # 4. Central Safe Area Content (Exact Placement for Mobile & Desktop)
    # Left: Glowing 3D Null Origin Emblem
    symbol_size = 310
    symbol_img = render_symbol_rgba(target_size=symbol_size, glow_color=(141, 198, 63), base_color=(180, 235, 90))
    sym_x = SAFE_X1 + 70
    sym_y = (SAFE_Y1 + SAFE_Y2) // 2 - symbol_size // 2
    im.alpha_composite(symbol_img, (sym_x, sym_y))

    # Tech Reticle Bracket around Symbol
    d.arc([sym_x - 15, sym_y - 15, sym_x + symbol_size + 15, sym_y + symbol_size + 15], start=120, end=240, fill=(141, 198, 63, 100), width=2)
    d.arc([sym_x - 15, sym_y - 15, sym_x + symbol_size + 15, sym_y + symbol_size + 15], start=300, end=60, fill=(141, 198, 63, 100), width=2)

    # Right Content Area:
    text_x = sym_x + symbol_size + 60
    base_y = SAFE_Y1 + 55

    # Top Kicker / System Status
    font_kicker = get_font(FONT_MONO, 18)
    d.ellipse([text_x, base_y + 4, text_x + 10, base_y + 14], fill=(141, 198, 63, 255))
    d.text((text_x + 22, base_y), 'NULL ORIGIN COMMAND NETWORK  //  PROTOCOL 0x00', font=font_kicker, fill=(141, 198, 63, 220))

    # Main Brand Header: "NULL ORIGIN"
    font_brand = get_font(FONT_BOLD, 108)
    # "NULL" in crisp white
    d.text((text_x, base_y + 30), 'NULL', font=font_brand, fill=C_WHITE)
    null_bbox = d.textbbox((text_x, base_y + 30), 'NULL', font=font_brand)
    origin_x = null_bbox[2] + 28
    # "ORIGIN" in vibrant cyber neon green
    d.text((origin_x, base_y + 30), 'ORIGIN', font=font_brand, fill=(141, 198, 63, 255))

    # Subtitle / Tagline
    tag_y = base_y + 160
    font_tag = get_font(FONT_SEGOE, 24)
    d.text((text_x, tag_y), 'CYBERSECURITY PLATFORM  ·  COMPETITIONS  ·  THREAT RESEARCH', font=font_tag, fill=(230, 230, 225, 230))

    # Feature Badges Pill Row
    badge_y = tag_y + 52
    font_badge = get_font(FONT_MONO, 16)
    badges = [
        ('LIVE TOURNAMENTS', (141, 198, 63)),
        ('LEADERBOARDS', (0, 229, 255)),
        ('VERIFIED CERTIFICATES', (141, 198, 63)),
        ('NULLORIGIN.LIVE', (245, 245, 242)),
    ]
    cur_bx = text_x
    for label, col in badges:
        tb = d.textbbox((cur_bx, badge_y), label, font=font_badge)
        pw, ph = tb[2] - tb[0], tb[3] - tb[1]
        pad_x, pad_y = 12, 6
        box_rect = [cur_bx - pad_x, badge_y - pad_y, cur_bx + pw + pad_x, badge_y + ph + pad_y]
        d.rectangle(box_rect, fill=(27, 27, 25, 200), outline=col + (140,), width=1)
        d.text((cur_bx, badge_y), label, font=font_badge, fill=col + (230,))
        cur_bx += pw + pad_x * 2 + 16

    # 5. Outer TV/Desktop Wings Content (Outside Safe Area)
    # Left wing tech data (X < 507)
    font_wing = get_font(FONT_MONO, 14)
    d.text((80, SAFE_Y1 + 80), 'NODE: ORIGIN_SEC\nLOC: ASIA_IN\nSTATUS: ONLINE\nUPTIME: 99.98%', font=font_wing, fill=(168, 168, 162, 70))
    d.rectangle([80, SAFE_Y1 + 175, 420, SAFE_Y1 + 176], fill=(141, 198, 63, 40))
    d.text((80, SAFE_Y1 + 190), 'HEX: 0x4E 0x55 0x4C 0x4C\nENC: AES-GCM-256', font=font_wing, fill=(141, 198, 63, 80))

    # Right wing tech data (X > 2053)
    d.text((SAFE_X2 + 80, SAFE_Y1 + 80), 'COMMAND IDENTIFIER: 0x00\nTELEMETRY: ACTIVE\nRANKINGS: CALIBRATED\nPROCTORING: LEVEL_3', font=font_wing, fill=(168, 168, 162, 70))
    d.rectangle([SAFE_X2 + 80, SAFE_Y1 + 175, W - 80, SAFE_Y1 + 176], fill=(0, 229, 255, 40))
    d.text((SAFE_X2 + 80, SAFE_Y1 + 190), 'SYS_CALL: EVALUATE_QUIZ\nINTEGRITY: 100% VERIFIED', font=font_wing, fill=(0, 229, 255, 80))

    # Save PNG
    im.save(output_path, 'PNG', optimize=True)
    print(f'Saved Banner: {output_path}')
    return im

def generate_banner_safezone_preview(banner_img, output_path):
    """Generates a visual guide overlay showing YouTube crop zones (TV, Desktop, Mobile)."""
    W, H = 2560, 1440
    SAFE_W, SAFE_H = 1546, 423
    SAFE_X1 = (W - SAFE_W) // 2
    SAFE_Y1 = (H - SAFE_H) // 2
    SAFE_X2 = SAFE_X1 + SAFE_W
    SAFE_Y2 = SAFE_Y1 + SAFE_H

    guide = banner_img.copy()
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)

    # Shaded mask for areas cut off on desktop/mobile
    # Top & bottom cut off on Desktop/Mobile:
    od.rectangle([0, 0, W, SAFE_Y1], fill=(0, 0, 0, 110))
    od.rectangle([0, SAFE_Y2, W, H], fill=(0, 0, 0, 110))
    # Sides cut off on Mobile (visible only on desktop):
    od.rectangle([0, SAFE_Y1, SAFE_X1, SAFE_Y2], fill=(0, 100, 255, 30))
    od.rectangle([SAFE_X2, SAFE_Y1, W, SAFE_Y2], fill=(0, 100, 255, 30))

    # Safe Area Outline (Mobile & Desktop text safe zone)
    od.rectangle([SAFE_X1, SAFE_Y1, SAFE_X2, SAFE_Y2], outline=(141, 198, 63, 255), width=3)
    # Desktop Banner Outline (2560 x 423)
    od.rectangle([0, SAFE_Y1, W, SAFE_Y2], outline=(0, 229, 255, 200), width=2)

    # Guide Labels
    font_lbl = get_font(FONT_MONO, 22)
    od.rectangle([SAFE_X1 + 10, SAFE_Y1 + 10, SAFE_X1 + 430, SAFE_Y1 + 45], fill=(0, 0, 0, 200), outline=(141, 198, 63, 255))
    od.text((SAFE_X1 + 20, SAFE_Y1 + 18), '✓ SAFE AREA (ALL DEVICES & MOBILE)', font=font_lbl, fill=(141, 198, 63, 255))

    od.rectangle([60, SAFE_Y1 + 10, 390, SAFE_Y1 + 45], fill=(0, 0, 0, 200), outline=(0, 229, 255, 255))
    od.text((70, SAFE_Y1 + 18), 'DESKTOP VISIBLE BAND', font=font_lbl, fill=(0, 229, 255, 255))

    od.rectangle([W // 2 - 160, 40, W // 2 + 160, 80], fill=(0, 0, 0, 200), outline=(255, 255, 255, 200))
    od.text((W // 2, 58), 'TV DISPLAY ZONE (2560 x 1440)', font=font_lbl, fill=(245, 245, 242, 255), anchor='mm')

    guide = Image.alpha_composite(guide, overlay)
    guide.save(output_path, 'PNG', optimize=True)
    print(f'Saved Safe Zone Preview: {output_path}')
    return guide

def main():
    print('Generating YouTube Assets...')
    # 1. Avatar Dark (1024x1024)
    av_dark_path = os.path.join(OUTPUT_DIR, 'null_origin_youtube_avatar_dark.png')
    generate_avatar(av_dark_path, dark_bg=True)
    # Copy to artifacts
    generate_avatar(os.path.join(ARTIFACT_DIR, 'null_origin_youtube_avatar_dark.png'), dark_bg=True)

    # 2. Avatar Transparent (1024x1024)
    av_trans_path = os.path.join(OUTPUT_DIR, 'null_origin_youtube_avatar_transparent.png')
    generate_avatar(av_trans_path, dark_bg=False)
    generate_avatar(os.path.join(ARTIFACT_DIR, 'null_origin_youtube_avatar_transparent.png'), dark_bg=False)

    # 3. Master Banner (2560x1440)
    banner_path = os.path.join(OUTPUT_DIR, 'null_origin_youtube_banner_2560x1440.png')
    banner_img = generate_banner(banner_path)
    banner_img.save(os.path.join(ARTIFACT_DIR, 'null_origin_youtube_banner_2560x1440.png'), 'PNG', optimize=True)

    # 4. Safe Zone Guide Preview
    guide_path = os.path.join(OUTPUT_DIR, 'null_origin_youtube_banner_safezone_preview.png')
    generate_banner_safezone_preview(banner_img, guide_path)
    generate_banner_safezone_preview(banner_img, os.path.join(ARTIFACT_DIR, 'null_origin_youtube_banner_safezone_preview.png'))

    # 5. Check if subagent AI assets exist and copy them to branding/youtube as 3D concepts
    sub_avatar = os.path.join(ARTIFACT_DIR, 'null_origin_avatar_clean_1794298056901.jpg')
    sub_banner = os.path.join(ARTIFACT_DIR, 'null_origin_channel_banner_1794298081046.jpg')
    if os.path.exists(sub_avatar):
        # Resize/save as alternative 3D render avatar
        im_sub = Image.open(sub_avatar)
        im_sub.save(os.path.join(OUTPUT_DIR, 'null_origin_youtube_avatar_3d_concept.jpg'), 'JPEG', quality=95)
    if os.path.exists(sub_banner):
        im_ban = Image.open(sub_banner)
        # Upscale AI banner to exact 2560x1440 so YouTube accepts it immediately
        im_ban_upscaled = im_ban.resize((2560, 1440), Image.Resampling.LANCZOS)
        im_ban_upscaled.save(os.path.join(OUTPUT_DIR, 'null_origin_youtube_banner_3d_concept_2560x1440.png'), 'PNG')
        im_ban_upscaled.save(os.path.join(ARTIFACT_DIR, 'null_origin_youtube_banner_3d_concept_2560x1440.png'), 'PNG')

    print('All YouTube Branding assets generated successfully!')

if __name__ == '__main__':
    main()
