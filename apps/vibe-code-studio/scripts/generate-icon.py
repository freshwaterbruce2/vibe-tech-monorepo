
import struct

def create_icon(filename):
    # Create a 256x256 icon (simplified single image ICO)
    # Header: Reserved (2 bytes), Type (2 bytes, 1=ICON), Count (2 bytes, 1 image)
    header = struct.pack('<HHH', 0, 1, 1)

    width = 256
    height = 256
    # 0 means 256 for width/height in directory entry
    w_entry = 0
    h_entry = 0

    # Pixel data size: 256*256*4 (BGRA) + 40 (header)
    image_size = width * height * 4 + 40
    offset = 22 # 6 (header) + 16 (dir entry)

    # Directory entry
    directory = struct.pack('<BBBBHHII', w_entry, h_entry, 0, 0, 1, 32, image_size, offset)

    # Bitmap Info Header
    bmi = struct.pack('<IIIHHIIIIII', 40, width, height * 2, 1, 32, 0, 0, 0, 0, 0, 0)

    # Pixel data (BGRA) - Blue square with Alpha
    # 256*256 pixels
    row = b'\xFF\x00\x00\xFF' * width
    pixels = row * height

    with open(filename, 'wb') as f:
        f.write(header)
        f.write(directory)
        f.write(bmi)
        f.write(pixels)

if __name__ == '__main__':
    create_icon("c:\\dev\\apps\\vibe-code-studio\\build-resources\\icon.ico")
    print("Created 256x256 icon.ico")
