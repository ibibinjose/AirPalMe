import os
import shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
USER_DOWNLOAD_ICON = '/Users/bibinjose/Downloads/AirPal App Icon.jpeg'

BRAND_DIR = os.path.join(ROOT, 'public', 'brand')
PUBLIC_DIR = os.path.join(ROOT, 'public')
STORE_ICONS_DIR = os.path.join(ROOT, 'store', 'icons')
os.makedirs(BRAND_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(STORE_ICONS_DIR, exist_ok=True)

BRAND_BLUE = (0, 86, 251)
WHITE = (255, 255, 255)

def fill_corners_to_full_bleed(img, edge_color=(0, 86, 251)):
    """Fill the 4 outside white corners with edge blue for Apple HIG & Android adaptive icons."""
    filled = img.convert('RGB')
    w, h = filled.size
    
    # Flood-fill from each of the 4 outer corners
    def flood(start_x, start_y):
        visited = set()
        queue = [(start_x, start_y)]
        while queue:
            x, y = queue.pop(0)
            if (x, y) in visited:
                continue
            visited.add((x, y))
            p = filled.getpixel((x, y))
            # Outside background is white or light edge transition (not deep blue)
            is_deep_blue = (p[0] < 35 and p[1] < 125 and p[2] > 220)
            if not is_deep_blue:
                filled.putpixel((x, y), edge_color)
                for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                        queue.append((nx, ny))

    for cx, cy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        flood(cx, cy)
    return filled

def extract_white_symbol_alpha(filled_img):
    """Extract transparent alpha channel for the white emblem mark inside the icon."""
    w, h = filled_img.size
    alpha = Image.new('L', (w, h), 0)
    for y in range(h):
        for x in range(w):
            r, g, b = filled_img.getpixel((x, y))
            # White symbol has high red / green; blue background has low red (< 30)
            if r > 30:
                val = min(255, max(0, int(r * 255 / 235)))
                alpha.putpixel((x, y), val)
    return alpha

def main():
    if not os.path.exists(USER_DOWNLOAD_ICON):
        raise FileNotFoundError(f"Source icon not found at {USER_DOWNLOAD_ICON}")

    print(f"1. Loading source icon from {USER_DOWNLOAD_ICON}...")
    source_master = Image.open(USER_DOWNLOAD_ICON).convert('RGB')
    
    # Copy source master
    source_master.save(os.path.join(BRAND_DIR, 'airpal-master.jpg'), quality=96)
    source_master.save(os.path.join(BRAND_DIR, 'airpal-me-master.jpg'), quality=96)
    source_master.save(os.path.join(PUBLIC_DIR, 'icon-source.jpg'), quality=96)

    print("2. Generating full-bleed app icon (filling outer corner canvas with brand blue)...")
    full_bleed_master = fill_corners_to_full_bleed(source_master, BRAND_BLUE)
    
    # 1024x1024 master icon
    icon_1024 = full_bleed_master.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon_1024.save(os.path.join(BRAND_DIR, 'icon-1024.png'))
    icon_1024.save(os.path.join(BRAND_DIR, 'airpal-card.png'))
    icon_1024.save(os.path.join(BRAND_DIR, 'airpal-me-icon.png'))
    icon_1024.save(os.path.join(BRAND_DIR, 'airpal-me-card.png'))
    icon_1024.save(os.path.join(BRAND_DIR, 'logo-full.jpg'), quality=96)
    icon_1024.save(os.path.join(PUBLIC_DIR, 'logo.jpg'), quality=96)
    icon_1024.save(os.path.join(PUBLIC_DIR, 'icon-source.png'))

    print("3. Generating transparent emblem mark (white & blue variants)...")
    alpha_mask = extract_white_symbol_alpha(full_bleed_master)
    bbox = alpha_mask.getbbox()
    if bbox:
        cropped_alpha = alpha_mask.crop(bbox)
        # Pad nicely in a 512x512 square
        mark_512_white = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
        ratio = min(400 / cropped_alpha.width, 400 / cropped_alpha.height)
        mw, mh = int(cropped_alpha.width * ratio), int(cropped_alpha.height * ratio)
        scaled_alpha = cropped_alpha.resize((mw, mh), Image.Resampling.LANCZOS)
        
        # White mark
        white_solid = Image.new('RGB', (mw, mh), WHITE)
        white_solid.putalpha(scaled_alpha)
        mark_512_white.paste(white_solid, ((512 - mw) // 2, (512 - mh) // 2), white_solid)
        mark_512_white.save(os.path.join(BRAND_DIR, 'airpal-mark-white.png'))

        # Blue mark
        mark_512_blue = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
        blue_solid = Image.new('RGB', (mw, mh), BRAND_BLUE)
        blue_solid.putalpha(scaled_alpha)
        mark_512_blue.paste(blue_solid, ((512 - mw) // 2, (512 - mh) // 2), blue_solid)
        mark_512_blue.save(os.path.join(BRAND_DIR, 'airpal-mark.png'))
        mark_512_blue.save(os.path.join(PUBLIC_DIR, 'logo-mark.png'))

    print("4. Generating favicons and PWA icons...")
    icon_1024.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, 'icon-512.png'))
    icon_1024.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, 'icon.png'))
    icon_1024.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, 'icon-192.png'))
    icon_1024.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, 'apple-touch-icon.png'))
    
    # Favicons
    f32 = icon_1024.resize((32, 32), Image.Resampling.LANCZOS)
    f32.save(os.path.join(PUBLIC_DIR, 'favicon-32.png'))
    f16 = icon_1024.resize((16, 16), Image.Resampling.LANCZOS)
    f16.save(os.path.join(PUBLIC_DIR, 'favicon-16.png'))
    f32.save(os.path.join(PUBLIC_DIR, 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])

    # Store icons
    icon_1024.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(STORE_ICONS_DIR, 'icon-512-flat.png'))

    print("5. Updating iOS native app icons...")
    ios_me_path = os.path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
    icon_1024.save(ios_me_path)

    print("6. Updating Android native app icons...")
    android_sizes = {
        'mdpi': (48, 48),
        'hdpi': (72, 72),
        'xhdpi': (96, 96),
        'xxhdpi': (144, 144),
        'xxxhdpi': (192, 192),
    }

    # AirPal Me (main)
    for folder, size in android_sizes.items():
        dir_path = os.path.join(ROOT, f'android/app/src/main/res/mipmap-{folder}')
        if os.path.exists(dir_path):
            resized = icon_1024.resize(size, Image.Resampling.LANCZOS)
            resized.save(os.path.join(dir_path, 'ic_launcher.png'))
            resized.save(os.path.join(dir_path, 'ic_launcher_round.png'))

    print("Brand & App Icon assets successfully generated and installed!")

if __name__ == '__main__':
    main()
