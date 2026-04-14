import qrcode
from PIL import Image, ImageDraw, ImageFont

qr = qrcode.QRCode(
    version=None,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=20, 
    border=4,
)
qr.add_data("DUMMY_TOKEN_123456789012345678901234567890")
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
qr_width, qr_height = img.size

print(f"QR Size: {qr_width}x{qr_height}")

new_width = qr_width + 500
new_img = Image.new('RGB', (new_width, qr_height), 'white')
new_img.paste(img, (0, 0))

draw = ImageDraw.Draw(new_img)
try:
    font_title = ImageFont.truetype("arialbd.ttf", 36)
    font_body = ImageFont.truetype("arial.ttf", 28)
except IOError:
    font_title = ImageFont.load_default()
    font_body = ImageFont.load_default()

text_x = qr_width + 20
text_y = qr_height // 2 - 80

draw.text((text_x, text_y), "EVENTO: SUPER CONCIERTO", fill="black", font=font_title)
draw.text((text_x, text_y + 50), "TIPO: AUTO-REGISTRO", fill="black", font=font_body)
draw.text((text_x, text_y + 90), "SERIAL: BAGFM-24ABR-001-0001", fill="black", font=font_body)
draw.text((text_x, text_y + 130), "SISTEMA BAGFM", fill=(100, 100, 100), font=font_body)

new_img.save("C:\\Users\\Admin\\Desktop\\bagfm\\qr_test.png")
print("Saved qr_test.png")
