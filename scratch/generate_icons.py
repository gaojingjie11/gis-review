import os
from PIL import Image, ImageDraw

def create_gradient_icon(size):
    # Create an image with RGBA mode
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a rounded rectangle for the background with a smooth vertical pink gradient
    # Color range: #FF8E9E (255, 142, 158) to #FF5E7E (255, 94, 126)
    for y in range(size):
        r = int(255 - (255 - 255) * (y / size))
        g = int(142 - (142 - 94) * (y / size))
        b = int(158 - (158 - 126) * (y / size))
        
        # Mask with a rounded corner shape
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
        
    # Create mask for rounded corners
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    corner_radius = int(size * 0.22) # 22% corner radius for super-ellipse look (iOS style)
    mask_draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], corner_radius, fill=255)
    
    # Apply rounded corners mask
    gradient_img = Image.new("RGBA", (size, size))
    gradient_img.paste(img, (0, 0), mask=mask)
    
    # Draw logo symbol in the center: stylized letter "G"
    logo_draw = ImageDraw.Draw(gradient_img)
    center = size / 2
    radius = size * 0.26
    width = int(size * 0.08)
    
    # Draw arc for "G"
    logo_draw.arc(
        [center - radius, center - radius, center + radius, center + radius],
        start=45,
        end=315,
        fill=(255, 255, 255, 255),
        width=width
    )
    
    # Draw the crossbar for "G"
    logo_draw.line(
        [center, center, center + radius, center],
        fill=(255, 255, 255, 255),
        width=width
    )
    
    # Draw small vertical tick for crossbar
    logo_draw.line(
        [center + radius - width/2, center, center + radius - width/2, center + radius * 0.4],
        fill=(255, 255, 255, 255),
        width=width
    )
    
    return gradient_img

def main():
    public_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
    os.makedirs(public_dir, exist_ok=True)
    
    # Generate 192x192 PNG
    icon_192 = create_gradient_icon(192)
    icon_192.save(os.path.join(public_dir, "pwa-192x192.png"), "PNG")
    print("Generated public/pwa-192x192.png successfully.")
    
    # Generate 512x512 PNG
    icon_512 = create_gradient_icon(512)
    icon_512.save(os.path.join(public_dir, "pwa-512x512.png"), "PNG")
    print("Generated public/pwa-512x512.png successfully.")

if __name__ == "__main__":
    main()
