"""Refine the authored rig's insect wings without changing its 16 animation clips.

Run with Python + numpy/scipy. The input GLB is retained as the source asset.
New vertices inherit skin weights from the nearest authored membrane vertex.
"""
from pathlib import Path
import json
import math
import struct
import numpy as np
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / 'alarm/models/griffin-r06.glb').read_bytes()
json_size = struct.unpack_from('<I', source, 12)[0]
gltf = json.loads(source[20:20 + json_size])
binary = bytearray(source[28 + json_size:])
components = {5121: 'u1', 5123: '<u2', 5125: '<u4', 5126: '<f4'}
sizes = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def read(index):
    accessor = gltf['accessors'][index]
    view = gltf['bufferViews'][accessor['bufferView']]
    return np.frombuffer(binary, dtype=components[accessor['componentType']],
                         offset=view.get('byteOffset', 0) + accessor.get('byteOffset', 0),
                         count=accessor['count'] * sizes[accessor['type']]).copy().reshape(-1, sizes[accessor['type']])


membrane = next(n for n in gltf['nodes'] if n.get('name') == 'ALARM_R03_Ince_Kanat_Zarlari')
veins = next(n for n in gltf['nodes'] if n.get('name') == 'ALARM_R03_Kanat_Damar_Agi')
old = gltf['meshes'][membrane['mesh']]['primitives'][0]['attributes']
reference = read(old['POSITION'])
tree = cKDTree(reference)
old_joints, old_weights = read(old['JOINTS_0']), read(old['WEIGHTS_0'])


def append_accessor(array, kind, component, bounds=False):
    array = np.asarray(array, dtype=components[component])
    while len(binary) % 4:
        binary.append(0)
    start = len(binary)
    binary.extend(array.tobytes())
    view = len(gltf['bufferViews'])
    gltf['bufferViews'].append({'buffer': 0, 'byteOffset': start, 'byteLength': array.nbytes})
    accessor = {'bufferView': view, 'componentType': component, 'count': len(array), 'type': kind}
    if bounds:
        accessor.update(min=array.min(axis=0).tolist(), max=array.max(axis=0).tolist())
    index = len(gltf['accessors'])
    gltf['accessors'].append(accessor)
    return index


def primitive(vertices, faces, material):
    positions = np.asarray(vertices, dtype=np.float32)
    triangles = np.asarray(faces, dtype=np.uint32)
    normals = np.zeros_like(positions)
    a, b, c = positions[triangles[:, 0]], positions[triangles[:, 1]], positions[triangles[:, 2]]
    face_normals = np.cross(b - a, c - a)
    for column in range(3):
        np.add.at(normals, triangles[:, column], face_normals)
    normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-9)
    _, nearest = tree.query(positions)
    attributes = {
        'POSITION': append_accessor(positions, 'VEC3', 5126, True),
        'NORMAL': append_accessor(normals, 'VEC3', 5126),
        'JOINTS_0': append_accessor(old_joints[nearest], 'VEC4', 5123),
        'WEIGHTS_0': append_accessor(old_weights[nearest], 'VEC4', 5126),
    }
    return {'attributes': attributes, 'indices': append_accessor(triangles.reshape(-1, 1), 'SCALAR', 5125), 'material': material}


def upper(t, v, side):
    # A broad rounded tegmen, with camber and a firm leading edge.
    width = .64 * math.sin(math.pi * t) ** .52
    chord = v * width
    camber = .12 * (1 - v * v) * math.sin(math.pi * t)
    return np.array([side * (.25 + 1.25 * t + .23 * chord + camber),
                     3.44 + 1.74 * t + .12 * math.sin(math.pi * t) - .74 * chord,
                     1.84 - 2.65 * t - .62 * chord])


def lower(t, v, side):
    # Radial folds distinguish the hindwing from the stiff forewing above it.
    angle = .08 + 1.34 * v
    scallop = 1 - .035 * (1 - math.cos(v * 20 * math.pi))
    reach = t * scallop
    pleat = .048 * math.sin(v * 20 * math.pi) * t ** .8
    return np.array([side * (.30 + reach * (1 + .15 * math.sin(angle)) + pleat),
                     3.31 + reach * (1.30 * math.cos(angle) - .20 * math.sin(angle)),
                     1.66 - reach * (1.90 * math.cos(angle) + 1.45 * math.sin(angle))])


def surface(function, side, nv, thick=0):
    vertices, faces = [], []
    nt = 72
    for i in range(nt + 1):
        t = .002 + .996 * i / nt
        for j in range(nv + 1):
            v = -1 + 2 * j / nv if function is upper else j / nv
            vertices.append(function(t, v, side))
    for i in range(nt):
        for j in range(nv):
            a = i * (nv + 1) + j
            faces.extend([(a, a + 1, a + nv + 2), (a, a + nv + 2, a + nv + 1)])
    if thick:
        count = len(vertices)
        vertices += [v + np.array([side * thick, 0, 0]) for v in vertices]
        faces += [(a + count, c + count, b + count) for a, b, c in faces.copy()]
        for i in range(nt):
            for j in [0, nv]:
                a, b = i * (nv + 1) + j, (i + 1) * (nv + 1) + j
                faces.extend([(a, b, b + count), (a, b + count, a + count)])
    return vertices, faces


def tube(points, radius, vertices, faces):
    start = len(vertices)
    rings = 5
    points = np.asarray(points)
    for i, point in enumerate(points):
        tangent = points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]
        tangent /= max(np.linalg.norm(tangent), 1e-9)
        normal = np.cross(tangent, [1, 0, 0])
        if np.linalg.norm(normal) < .01:
            normal = np.cross(tangent, [0, 1, 0])
        normal /= np.linalg.norm(normal)
        binormal = np.cross(tangent, normal)
        for j in range(rings):
            angle = 2 * math.pi * j / rings
            vertices.append(point + radius * (normal * math.cos(angle) + binormal * math.sin(angle)))
    for i in range(len(points) - 1):
        for j in range(rings):
            a = start + i * rings + j
            b = start + i * rings + (j + 1) % rings
            faces.extend([(a, b, b + rings), (a, b + rings, a + rings)])


gltf['materials'][2].update(name='ALARM_R09_Pleated_Hindwing', doubleSided=True, alphaMode='BLEND')
gltf['materials'][2]['pbrMetallicRoughness'] = {'baseColorFactor': [.83, .80, .70, .78], 'metallicFactor': .05, 'roughnessFactor': .53}
gltf['materials'][3].update(name='ALARM_R09_Raised_Wing_Veins', alphaMode='OPAQUE')
gltf['materials'][3]['pbrMetallicRoughness'] = {'baseColorFactor': [.61, .59, .49, 1], 'metallicFactor': .08, 'roughnessFactor': .63}
tegmen_material = len(gltf['materials'])
gltf['materials'].append({'name': 'ALARM_R09_Mineral_Tegmina', 'doubleSided': True,
                          'pbrMetallicRoughness': {'baseColorFactor': [.86, .84, .76, 1], 'metallicFactor': .04, 'roughnessFactor': .48}})
surfaces, vein_vertices, vein_faces = [], [], []
for side in [-1, 1]:
    for function, resolution, material, thick in [(upper, 24, tegmen_material, .022), (lower, 60, 2, 0)]:
        vertices, faces = surface(function, side, resolution, thick)
        surfaces.append(primitive(vertices, faces, material))
    for v in [-.98, -.65, -.3, .05, .4, .72, .98]:
        tube([upper(t, v, side) + [side * .025, 0, 0] for t in np.linspace(.012, .988, 70)], .008 if abs(v) > .9 else .0055, vein_vertices, vein_faces)
    for v in np.linspace(0, 1, 21):
        tube([lower(t, float(v), side) + [side * .005, 0, 0] for t in np.linspace(.025, .995, 46)], .0045, vein_vertices, vein_faces)
    for t in np.linspace(.2, .9, 8):
        tube([upper(float(t + .04 * v), v, side) + [side * .025, 0, 0] for v in np.linspace(-.96, .96, 22)], .0023, vein_vertices, vein_faces)
    tube([lower(.995, float(v), side) for v in np.linspace(0, 1, 161)], .006, vein_vertices, vein_faces)
gltf['meshes'][membrane['mesh']]['primitives'] = surfaces
gltf['meshes'][veins['mesh']]['primitives'] = [primitive(vein_vertices, vein_faces, 3)]
gltf.setdefault('asset', {}).setdefault('extras', {})['wing_revision'] = 'R09 / tegmina and pleated hindwings'
gltf['buffers'][0]['byteLength'] = len(binary)
while len(binary) % 4:
    binary.append(0)
payload = json.dumps(gltf, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
payload += b' ' * ((-len(payload)) % 4)
output = struct.pack('<III', 0x46546c67, 2, 12 + 8 + len(payload) + 8 + len(binary))
output += struct.pack('<II', len(payload), 0x4e4f534a) + payload
output += struct.pack('<II', len(binary), 0x004e4942) + binary
destination = ROOT / 'alarm/models/griffin-r09.glb'
destination.write_bytes(output)
print(f'{destination.name}: {len(output):,} bytes / {len(gltf["animations"])} original animation clips preserved')
