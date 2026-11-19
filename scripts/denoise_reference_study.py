"""Optional standard render denoising with Intel's official OIDN command-line tool.

The renderer's PNG is preserved. Only the Monte Carlo noise is filtered.
Usage: python3 scripts/denoise_reference_study.py --oidn /path/to/oidnDenoise
"""
from pathlib import Path
import argparse
import subprocess
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--oidn', required=True, type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent / 'studies'
source = root / 'ALARM_3D_Look_Study_R10.png'
pixels = np.asarray(Image.open(source).convert('RGB'), dtype=np.float32) / 255
height, width, _ = pixels.shape
intermediate = root / 'render-color.pfm'
filtered = root / 'render-denoised.pfm'
with intermediate.open('wb') as stream:
    stream.write(f'PF\n{width} {height}\n-1.0\n'.encode('ascii'))
    stream.write(np.flipud(pixels).astype('<f4').tobytes())
subprocess.run([str(args.oidn), '--ldr', str(intermediate), '--srgb', '-o', str(filtered),
                '--device', 'cpu', '--threads', '8'], check=True)
with filtered.open('rb') as stream:
    assert stream.readline().strip() == b'PF'
    out_width, out_height = map(int, stream.readline().split())
    endian = '<' if float(stream.readline()) < 0 else '>'
    data = np.frombuffer(stream.read(), dtype=endian + 'f4').reshape(out_height, out_width, 3)
    data = np.flipud(data)
destination = root / 'ALARM_3D_Look_Study_R10_Clean.png'
Image.fromarray(np.round(np.clip(data, 0, 1) * 255).astype(np.uint8)).save(destination)
print(destination)
