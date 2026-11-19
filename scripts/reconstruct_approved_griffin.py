"""CPU reconstruction of an approved isolated reference with official TripoSR weights.

This writes a DRAFT mesh, not an approved or animation-ready replacement.
The upstream repository and model are MIT licensed. No paid endpoint is used.
Dependencies: CPU torch, transformers, omegaconf, einops, trimesh, scikit-image, Pillow.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import time
import types

parser = argparse.ArgumentParser()
parser.add_argument('--triposr-root', required=True, type=Path)
parser.add_argument('--weights', required=True, type=Path)
parser.add_argument('--input', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--resolution', type=int, default=256)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(args.triposr_root))

import numpy as np
from PIL import Image
import torch
import trimesh
from skimage.measure import marching_cubes

torch.set_num_threads(8)
torch.set_num_interop_threads(1)
started = time.monotonic()


def progress(message):
    print(f'[{time.monotonic()-started:.1f}s] {message}', flush=True)


# Input alpha is already supplied; optional background removal is never called.
if 'rembg' not in sys.modules:
    sys.modules['rembg'] = types.ModuleType('rembg')

# Use the standard CPU marching-cubes implementation instead of a CUDA extension.
cpu_cubes = types.ModuleType('torchmcubes')


def cpu_marching_cubes(field, level):
    vertices, faces, _, _ = marching_cubes(field.detach().cpu().numpy(), level=level)
    # Upstream's helper reverses the extension's z/y/x convention afterwards.
    return (torch.from_numpy(vertices[:, [2, 1, 0]].copy()),
            torch.from_numpy(faces.astype(np.int64).copy()))


cpu_cubes.marching_cubes = cpu_marching_cubes
sys.modules['torchmcubes'] = cpu_cubes

from tsr.system import TSR
import tsr.models.tokenizers.image as image_tokenizer

# Same DINO config as upstream, predownloaded from the official model repository.
image_tokenizer.hf_hub_download = lambda **kwargs: str(args.weights / 'dino-config.json')

progress('Preparing the approved alpha-masked input')
image = Image.open(args.input).convert('RGBA')
alpha = np.asarray(image)[:, :, 3]
ys, xs = np.nonzero(alpha > 16)
if not len(xs):
    raise ValueError('Input must contain a visible alpha-masked object')
image = image.crop((int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)))
size = int(max(image.size) / .85)
canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
canvas.alpha_composite(image, ((size-image.width)//2, (size-image.height)//2))
canvas = canvas.resize((768, 768), Image.Resampling.LANCZOS)
rgba = np.asarray(canvas, dtype=np.float32) / 255
rgb = rgba[:, :, :3] * rgba[:, :, 3:4] + (1-rgba[:, :, 3:4]) * .5
condition = Image.fromarray(np.round(rgb*255).astype(np.uint8))
condition.save(args.output / 'conditioning.png')
source_hash = hashlib.sha256(args.input.read_bytes()).hexdigest()
progress('Loading the official CPU model')
model = TSR.from_pretrained(str(args.weights), config_name='config.yaml', weight_name='model.ckpt')
model.eval().to('cpu')
model.renderer.set_chunk_size(32768)
code_path = args.output / 'scene_code.pt'
metadata_path = args.output / 'reconstruction.json'
if code_path.exists() and metadata_path.exists() and json.loads(metadata_path.read_text()).get('input_sha256') == source_hash:
    scene_codes = torch.load(code_path, map_location='cpu', weights_only=True)
    progress('Reusing matching reconstructed scene code')
else:
    progress('Inferring geometry and appearance from the approved image')
    with torch.inference_mode():
        scene_codes = model([condition], device='cpu')
    torch.save(scene_codes, code_path)
    metadata_path.write_text(json.dumps({'input_sha256': source_hash, 'draft': True,
                                         'source': 'stabilityai/TripoSR', 'device': 'cpu'}))
progress(f'Extracting the draft surface at {args.resolution} voxels per axis')
with torch.inference_mode():
    mesh = model.extract_mesh(scene_codes, has_vertex_color=True, resolution=args.resolution)[0]
mesh.remove_unreferenced_vertices()
progress(f'Mesh extracted: {len(mesh.vertices)} vertices, {len(mesh.faces)} triangles')
# TripoSR uses z-up; the public glTF file must use glTF's y-up convention.
mesh.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2, [1, 0, 0]))
mesh.export(args.output / 'ALARM_Approved_Griffin_Draft_R11.glb')
metadata = json.loads(metadata_path.read_text())
metadata.update(resolution=args.resolution, vertices=len(mesh.vertices), triangles=len(mesh.faces),
                elapsed_seconds=round(time.monotonic()-started, 2), gltf_up_axis='Y',
                limitations=['Single-view reconstruction draft', 'No animation rig',
                             'Thin wings, hidden surfaces and anatomy require visual inspection'])
metadata_path.write_text(json.dumps(metadata, indent=2))
progress('Draft GLB saved; visual inspection is still required')
