import os
import shutil
from PIL import Image, ImageDraw

ROOT = '/Users/bibinjose/Projects/Codebase/Projects/AirPalMe'
USER_UPLOAD_DIR = '/Users/bibinjose/.gemini/antigravity-ide/brain/2134cabe-d1f7-434e-bd06-de54545d187f/.user_uploaded'

MEDIA_AIRPAL = os.path.join(USER_UPLOAD_DIR, 'media_1791550920950.jpg')
MEDIA_PASS = os.path.join(USER_UPLOAD_DIR, 'media_1791550920960.jpg')
MEDIA_ME = os.path.join(USER_UPLOAD_DIR, 'media_1791550920975.jpg')

BRAND_DIR = os.path.join(ROOT, 'public', 'brand')
PUBLIC_DIR = os.path.join(ROOT, 'public')
os.makedirs(BRAND_DIR, exist_ok=True)

BRAND_BLUE = (0, 84, 253)
WHITE = (255, 255, 255)

def create_transparent_logo(input_jpg_path):
    """Extract razor-sharp transparent PNG with anti-aliasing."""
    im = Image.open(input_jpg_path).convert('RGB')
    w, h = im.size
    r, g, b = im.split()
    hsv = im.convert('HSV')
    s = hsv.split()[1]

    r_bytes = r.tobytes()
    s_bytes = s.tobytes()
    alphas = bytearray(w * h)

    for i in range(w * h):
        rv = r_bytes[i]
        sv = s_bytes[i]
        if sv < 12 or rv >= 252:
            alphas[i] = 0
        elif rv <= 5:
            alphas[i] = 255
        else:
            alphas[i] = min(255, max(0, int((252 - rv) / 247.0 * 255)))

    alpha_img = Image.frombytes('L', (w, h), bytes(alphas))
    
    # Blue foreground
    blue_im = Image.new('RGB', (w, h), BRAND_BLUE)
    blue_im.putalpha(alpha_img)
    
    # White foreground
    white_im = Image.new('RGB', (w, h), WHITE)
    white_im.putalpha(alpha_img)

    bbox = alpha_img.getbbox()
    return blue_im.crop(bbox), white_im.crop(bbox), alpha_img

def create_padded_app_icon(cropped_transparent, target_size=(1024, 1024), scale_factor=0.82, bg_color=(255, 255, 255)):
    """Center logo on square background with Apple HIG safe padding."""
    icon = Image.new('RGB', target_size, bg_color)
    max_w = int(target_size[0] * scale_factor)
    max_h = int(target_size[1] * scale_factor)
    
    ratio = min(max_w / cropped_transparent.width, max_h / cropped_transparent.height)
    new_w = int(cropped_transparent.width * ratio)
    new_h = int(cropped_transparent.height * ratio)
    
    resized = cropped_transparent.resize((new_w, new_h), Image.Resampling.LANCZOS)
    x = (target_size[0] - new_w) // 2
    y = (target_size[1] - new_h) // 2
    
    icon.paste(resized, (x, y), resized)
    return icon

def main():
    print("1. Copying original masters...")
    shutil.copy(MEDIA_AIRPAL, os.path.join(BRAND_DIR, 'airpal-master.jpg'))
    shutil.copy(MEDIA_PASS, os.path.join(BRAND_DIR, 'airpal-pass-master.jpg'))
    shutil.copy(MEDIA_ME, os.path.join(BRAND_DIR, 'airpal-me-master.jpg'))
    
    print("2. Generating transparent and white logos...")
    airpal_blue, airpal_white, airpal_alpha = create_transparent_logo(MEDIA_AIRPAL)
    pass_blue, pass_white, _ = create_transparent_logo(MEDIA_PASS)
    me_blue, me_white, _ = create_transparent_logo(MEDIA_ME)

    airpal_blue.save(os.path.join(BRAND_DIR, 'airpal-logo.png'))
    airpal_white.save(os.path.join(BRAND_DIR, 'airpal-logo-white.png'))
    
    pass_blue.save(os.path.join(BRAND_DIR, 'airpal-pass-logo.png'))
    pass_white.save(os.path.join(BRAND_DIR, 'airpal-pass-logo-white.png'))
    
    me_blue.save(os.path.join(BRAND_DIR, 'airpal-me-logo.png'))
    me_white.save(os.path.join(BRAND_DIR, 'airpal-me-logo-white.png'))

    print("3. Generating square app icons (1024x1024)...")
    airpal_app_icon = create_padded_app_icon(airpal_blue, (1024, 1024), scale_factor=0.82)
    pass_app_icon = create_padded_app_icon(pass_blue, (1024, 1024), scale_factor=0.82)
    me_app_icon = create_padded_app_icon(me_blue, (1024, 1024), scale_factor=0.82)

    airpal_app_icon.save(os.path.join(BRAND_DIR, 'airpal-card.png'))
    pass_app_icon.save(os.path.join(BRAND_DIR, 'airpal-pass-card.png'))
    me_app_icon.save(os.path.join(BRAND_DIR, 'airpal-me-card.png'))

    airpal_app_icon.save(os.path.join(BRAND_DIR, 'icon-1024.png'))
    airpal_app_icon.save(os.path.join(BRAND_DIR, 'logo-full.jpg'), quality=95)
    airpal_app_icon.save(os.path.join(PUBLIC_DIR, 'logo.jpg'), quality=95)
    airpal_app_icon.save(os.path.join(PUBLIC_DIR, 'icon-source.png'))
    airpal_app_icon.save(os.path.join(PUBLIC_DIR, 'icon-source.jpg'), quality=95)

    # AirPal Me app icon is the primary app icon for the personal life app
    me_app_icon.save(os.path.join(BRAND_DIR, 'airpal-me-icon.png'))
    pass_app_icon.save(os.path.join(BRAND_DIR, 'airpal-pass-icon.png'))

    print("4. Generating emblem mark (waving 'A' + paper airplane soaring)...")
    # Extract 'A' and airplane from airpal_blue in original coordinates
    full_im = Image.new('RGB', (1024, 1024), BRAND_BLUE)
    full_im.putalpha(airpal_alpha)

    # Crop 'A' with waving hand:
    crop_a = full_im.crop((65, 350, 360, 660))
    a_bbox = crop_a.getbbox()
    crop_a = crop_a.crop(a_bbox)

    # Crop paper airplane:
    crop_plane = full_im.crop((660, 340, 805, 450))
    plane_bbox = crop_plane.getbbox()
    crop_plane = crop_plane.crop(plane_bbox)

    # Compose 512x512 emblem mark
    mark_512 = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    
    # Scale 'A' to height 340
    a_h = 340
    a_w = int(crop_a.width * (a_h / crop_a.height))
    scaled_a = crop_a.resize((a_w, a_h), Image.Resampling.LANCZOS)
    mark_512.paste(scaled_a, (45, 140), scaled_a)

    # Scale plane to width 160
    plane_w = 160
    plane_h = int(crop_plane.height * (plane_w / crop_plane.width))
    scaled_plane = crop_plane.resize((plane_w, plane_h), Image.Resampling.LANCZOS)
    mark_512.paste(scaled_plane, (300, 40), scaled_plane)

    # Trim and pad mark nicely in 512x512 square
    m_bbox = mark_512.getbbox()
    trimmed_mark = mark_512.crop(m_bbox)
    
    final_mark_512 = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    ratio = min(420 / trimmed_mark.width, 420 / trimmed_mark.height)
    m_w = int(trimmed_mark.width * ratio)
    m_h = int(trimmed_mark.height * ratio)
    resized_m = trimmed_mark.resize((m_w, m_h), Image.Resampling.LANCZOS)
    final_mark_512.paste(resized_m, ((512 - m_w) // 2, (512 - m_h) // 2), resized_m)

    final_mark_512.save(os.path.join(PUBLIC_DIR, 'logo-mark.png'))
    final_mark_512.save(os.path.join(BRAND_DIR, 'airpal-mark.png'))

    # White emblem mark
    mark_white_512 = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    r_m, g_m, b_m, a_m = final_mark_512.split()
    w_rgb = Image.new('RGB', (512, 512), WHITE)
    w_rgb.putalpha(a_m)
    w_rgb.save(os.path.join(BRAND_DIR, 'airpal-mark-white.png'))

    print("5. Generating favicons and PWA icons...")
    final_mark_512.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, 'icon-192.png'))
    final_mark_512.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, 'icon-512.png'))
    
    # Apple touch icon: on crisp white background with squircle-friendly padding
    apple_touch = Image.new('RGB', (180, 180), WHITE)
    m_140 = final_mark_512.resize((140, 140), Image.Resampling.LANCZOS)
    apple_touch.paste(m_140, (20, 20), m_140)
    apple_touch.save(os.path.join(PUBLIC_DIR, 'apple-touch-icon.png'))

    # Favicons
    f32 = final_mark_512.resize((32, 32), Image.Resampling.LANCZOS)
    f32.save(os.path.join(PUBLIC_DIR, 'favicon-32.png'))
    f16 = final_mark_512.resize((16, 16), Image.Resampling.LANCZOS)
    f16.save(os.path.join(PUBLIC_DIR, 'favicon-16.png'))
    
    # Favicon.ico
    f32.save(os.path.join(PUBLIC_DIR, 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32)])

    print("6. Updating iOS native app icons...")
    ios_me_path = os.path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
    ios_pass_path = os.path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon-Pass.appiconset/AppIcon-Pass-1024.png')
    
    me_app_icon.save(ios_me_path)
    pass_app_icon.save(ios_pass_path)

    print("7. Updating Android native app icons...")
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
            me_app_icon.resize(size, Image.Resampling.LANCZOS).save(os.path.join(dir_path, 'ic_launcher.png'))
            me_app_icon.resize(size, Image.Resampling.LANCZOS).save(os.path.join(dir_path, 'ic_launcher_round.png'))

    # AirPal Pass
    for folder, size in android_sizes.items():
        dir_path = os.path.join(ROOT, f'android/app/src/pass/res/mipmap-{folder}')
        if os.path.exists(dir_path):
            pass_app_icon.resize(size, Image.Resampling.LANCZOS).save(os.path.join(dir_path, 'ic_launcher.png'))
            pass_app_icon.resize(size, Image.Resampling.LANCZOS).save(os.path.join(dir_path, 'ic_launcher_round.png'))

    print("Brand assets successfully generated!")

if __name__ == '__main__':
    main()
