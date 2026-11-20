"""Build the free R12 look from the original animated assets and approved references.

No external generation service is used. The authored skeleton, eyes and all 16
clips are retained. Only wing surfaces, surface detail and stonework are rebuilt.
"""
from io import BytesIO
from pathlib import Path
import json
import math
import struct
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree, Delaunay

ROOT = Path(__file__).resolve().parent.parent
RNG = np.random.default_rng(2604511)


class GLB:
    types = {5121: 'u1', 5123: '<u2', 5125: '<u4', 5126: '<f4'}
    sizes = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

    def __init__(self, filename):
        source = (ROOT / 'alarm/models' / filename).read_bytes()
        length = struct.unpack_from('<I', source, 12)[0]
        self.g = json.loads(source[20:20 + length])
        self.b = bytearray(source[28 + length:])

    def read(self, index):
        a = self.g['accessors'][index]
        v = self.g['bufferViews'][a['bufferView']]
        return np.frombuffer(self.b, dtype=self.types[a['componentType']],
                             offset=v.get('byteOffset', 0) + a.get('byteOffset', 0),
                             count=a['count'] * self.sizes[a['type']]).copy().reshape(-1, self.sizes[a['type']])

    def data(self, data):
        self.b.extend(b'\0' * ((-len(self.b)) % 4))
        view = len(self.g['bufferViews'])
        self.g['bufferViews'].append({'buffer': 0, 'byteOffset': len(self.b), 'byteLength': len(data)})
        self.b.extend(data)
        return view

    def accessor(self, data, kind, component=5126, bounds=False):
        a = np.asarray(data, dtype=self.types[component])
        result = {'bufferView': self.data(a.tobytes()), 'componentType': component,
                  'count': len(a), 'type': kind}
        if bounds:
            result.update(min=a.min(axis=0).tolist(), max=a.max(axis=0).tolist())
        self.g['accessors'].append(result)
        return len(self.g['accessors']) - 1

    def primitive(self, positions, faces, material, uv=None, colors=None, skin=None):
        p, f = np.asarray(positions), np.asarray(faces)
        normals = np.zeros_like(p, dtype=float)
        face_normals = np.cross(p[f[:, 1]] - p[f[:, 0]], p[f[:, 2]] - p[f[:, 0]])
        for j in range(3):
            np.add.at(normals, f[:, j], face_normals)
        normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-9)
        attr = {'POSITION': self.accessor(p, 'VEC3', bounds=True),
                'NORMAL': self.accessor(normals, 'VEC3')}
        if uv is not None:
            attr['TEXCOORD_0'] = self.accessor(uv, 'VEC2')
        if colors is not None:
            attr['COLOR_0'] = self.accessor(colors, 'VEC4')
        if skin is not None:
            tree, joints, weights = skin
            nearest = tree.query(p)[1]
            attr['JOINTS_0'] = self.accessor(joints[nearest], 'VEC4', 5123)
            attr['WEIGHTS_0'] = self.accessor(weights[nearest], 'VEC4')
        return {'attributes': attr, 'indices': self.accessor(f.reshape(-1, 1), 'SCALAR', 5125), 'material': material}

    def mesh(self, name, primitives, parent=None):
        self.g['meshes'].append({'name': name, 'primitives': primitives})
        self.g['nodes'].append({'name': name, 'mesh': len(self.g['meshes']) - 1})
        index = len(self.g['nodes']) - 1
        if parent is None:
            self.g['scenes'][self.g.get('scene', 0)]['nodes'].append(index)
        else:
            self.g['nodes'][parent]['children'].append(index)
        return index

    def save(self, name):
        self.b.extend(b'\0' * ((-len(self.b)) % 4))
        self.g['buffers'][0]['byteLength'] = len(self.b)
        data = json.dumps(self.g, separators=(',', ':'), ensure_ascii=False).encode()
        data += b' ' * ((-len(data)) % 4)
        result = struct.pack('<III', 0x46546C67, 2, 28 + len(data) + len(self.b))
        result += struct.pack('<II', len(data), 0x4E4F534A) + data
        result += struct.pack('<II', len(self.b), 0x004E4942) + self.b
        (ROOT / 'alarm/models' / name).write_bytes(result)
        print(name, len(result), 'bytes')


def inside(points, polygon):
    """Even/odd point test; deterministic and independent of plotting packages."""
    x, y = points[:, 0], points[:, 1]
    mask = np.zeros(len(points), dtype=bool)
    for a, b in zip(polygon, np.roll(polygon, -1, axis=0)):
        if abs(a[1] - b[1]) < 1e-9:
            continue
        mask ^= ((a[1] > y) != (b[1] > y)) & (x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])
    return mask


def character():
    model = GLB('griffin-r06.glb')
    g = model.g
    membrane = next(n for n in g['nodes'] if n.get('name') == 'ALARM_R03_Ince_Kanat_Zarlari')
    veins = next(n for n in g['nodes'] if n.get('name') == 'ALARM_R03_Kanat_Damar_Agi')
    old = g['meshes'][membrane['mesh']]['primitives'][0]['attributes']
    wing_skin = (cKDTree(model.read(old['POSITION'])), model.read(old['JOINTS_0']), model.read(old['WEIGHTS_0']))
    # The PNG is sampled only on real curved wing surfaces, rather than wrapping
    # a single camera photograph around the whole animal.
    im = Image.open(ROOT / 'alarm/images/reference/griffin-approved-r12.webp')
    stream = BytesIO(); im.save(stream, 'PNG')
    g['images'].append({'name': 'Approved wing venation', 'bufferView': model.data(stream.getvalue()), 'mimeType': 'image/png'})
    g['textures'].append({'source': len(g['images']) - 1})
    tex = len(g['textures']) - 1
    mats = []
    for name, opacity in [('Rigid_forewing', .98), ('Folded_hindwing', .86)]:
        mats.append(len(g['materials']))
        g['materials'].append({'name': 'ALARM_R12_' + name, 'doubleSided': True,
            'alphaMode': 'BLEND' if opacity < .9 else 'MASK', 'alphaCutoff': .15,
            'pbrMetallicRoughness': {'baseColorTexture': {'index': tex},
                'baseColorFactor': [1, 1, 1, opacity], 'metallicFactor': 0, 'roughnessFactor': .58}})
    polygons = [
        [(493,263),(582,211),(791,139),(1111,62),(1386,25),(1538,26),(1586,48),(1570,83),(1507,117),(1322,181),(1069,254),(813,301),(624,315),(523,294)],
        [(520,292),(676,294),(888,271),(1151,231),(1435,219),(1547,232),(1580,253),(1551,295),(1478,346),(1358,402),(1195,465),(1030,496),(886,482),(744,434),(625,372),(548,324)]
    ]
    primitives = []
    for kind, outline in enumerate(polygons):
        poly = np.array(outline, dtype=float)
        grid = np.array([(x, y) for x in np.arange(poly[:,0].min(), poly[:,0].max(), 19)
                         for y in np.arange(poly[:,1].min(), poly[:,1].max(), 17)])
        # Include dense boundary vertices so the silhouette is not a coarse fan.
        border = np.concatenate([np.linspace(a, b, max(2, int(np.linalg.norm(a-b)/14)), endpoint=False)
                                 for a, b in zip(poly, np.roll(poly, -1, axis=0))])
        points = np.concatenate([border, grid[inside(grid, poly)]])
        triangles = Delaunay(points).simplices
        triangles = triangles[inside(points[triangles].mean(axis=1), poly)]
        for side in [-1, 1]:
            t = np.clip((points[:,0] - 500) / 1080, 0, 1.02)
            z = 1.67 - t * 3.45
            if kind == 0:
                y = 3.44 + (269 - points[:,1]) * .0062
                x = side * (.27 + .98*t + .12*np.sin(t*np.pi))
            else:
                y = 3.32 + (292 - points[:,1]) * .0034
                spread = np.maximum(points[:,1] - 292, 0) / 210
                x = side * (.30 + 1.06*t + .55*spread + .035*np.sin(spread*math.pi*16)*t)
            positions = np.column_stack([x, y, z])
            primitives.append(model.primitive(positions, triangles, mats[kind],
                                               uv=points / np.array(im.size), skin=wing_skin))
    g['meshes'][membrane['mesh']]['primitives'] = primitives
    # Retain the skeleton nodes but remove the old leaf-like vein mesh.
    veins.pop('mesh')
    body = next(n for n in g['nodes'] if n.get('name') == 'ALARM_R03_Grifon_Govde')
    prim = g['meshes'][body['mesh']]['primitives'][0]
    attr = prim['attributes']; p = model.read(attr['POSITION'])
    # Sparse, irregular cheetah markings restricted to torso and limbs. They are
    # vertex colors, so they follow every authored pose without UV stretching.
    eligible = (p[:,1] < 3.42) & (p[:,2] > -1.65) & (p[:,2] < 1.95)
    centers = []
    for index in RNG.permutation(np.flatnonzero(eligible)):
        if not centers or np.min(np.linalg.norm(np.array(centers)-p[index], axis=1)) > .19:
            centers.append(p[index])
    d, nearest = cKDTree(centers).query(p)
    widths = RNG.uniform(.038, .065, len(centers))
    spots = (1 - np.clip((d - widths[nearest]*.75) / .025, 0, 1)) * eligible
    colors = np.tile([.79, .725, .59, 1.], (len(p), 1))
    colors[:,:3] *= (1 - .68*spots[:,None])
    colors[:,:3] *= (.96 + .04*np.sin(p[:,1:2]*87+p[:,2:3]*41))
    attr['COLOR_0'] = model.accessor(colors, 'VEC4')
    g['materials'][prim['material']]['pbrMetallicRoughness'].update(baseColorFactor=[1,1,1,1], roughnessFactor=.48, metallicFactor=0)
    g['materials'][0]['pbrMetallicRoughness'].update(baseColorFactor=[.79,.735,.62,1], roughnessFactor=.46, metallicFactor=0)
    # Small raised scales produce physical highlights even in the lightweight
    # viewer. Skin weights come from the original body, never the wing rig.
    normals = model.read(attr['NORMAL'])
    skin = (cKDTree(p), model.read(attr['JOINTS_0']), model.read(attr['WEIGHTS_0']))
    verts, faces, scale_colors, grid_used = [], [], [], set()
    for index in RNG.permutation(np.flatnonzero(eligible)):
        point, n = p[index], normals[index]
        key = tuple(np.floor(point/.079).astype(int))
        if key in grid_used or len(grid_used) >= 1250:
            continue
        grid_used.add(key)
        axis = np.array([0.,-1.,.15]); axis -= n*np.dot(axis,n)
        axis /= max(np.linalg.norm(axis),1e-9)
        cross = np.cross(n,axis); cross /= max(np.linalg.norm(cross),1e-9)
        start=len(verts)
        verts.append(point+n*.011)
        for x,y in [(-.6,-.75),(.6,-.75),(1,0),(.6,.65),(0,1),(-.6,.65),(-1,0)]:
            verts.append(point + cross*x*.029 + axis*y*.043 + n*.001)
        for j in range(7):
            faces.append((start,start+1+j,start+1+(j+1)%7))
        scale_colors.extend([colors[index]]*8)
    primitive = model.primitive(verts,faces,prim['material'],colors=scale_colors,skin=skin)
    # Reusing the body mesh also retains its exact node transform and skin.
    g['meshes'][body['mesh']]['primitives'].append(primitive)
    g['asset'].setdefault('extras', {})['look_revision'] = 'R12: free reference-guided wings, ivory scales and cheetah markings'
    assert len(g['animations']) == 16
    model.save('griffin-r12.glb')


def observatory():
    model = GLB('observatory-r06.glb')
    g = model.g
    vertices, faces, uvs = [], [], []

    def solid(bottom, top):
        # Face-local vertices preserve hard stone edges and non-stretched UVs.
        count=len(bottom)
        rings=[list(reversed(bottom)),top]
        rings += [[bottom[j],bottom[(j+1)%count],top[(j+1)%count],top[j]] for j in range(count)]
        for ring in rings:
            ring=np.asarray(ring); start=len(vertices)
            vertices.extend(ring)
            n=np.cross(ring[1]-ring[0],ring[2]-ring[0]); axis=np.argmax(np.abs(n))
            axes=[j for j in range(3) if j!=axis]
            uvs.extend(ring[:,axes]*.65)
            faces.extend((start,start+j,start+j+1) for j in range(1,len(ring)-1))

    for course in range(3):
        for j in range(44):
            a=(j+(.5 if course%2 else 0))*2*math.pi/44+.003
            b=a+2*math.pi/44-.006
            outer=3.60+RNG.uniform(-.009,.009)
            corners=[(3.47*math.cos(a),3.47*math.sin(a)),(outer*math.cos(a),outer*math.sin(a)),
                     (outer*math.cos(b),outer*math.sin(b)),(3.47*math.cos(b),3.47*math.sin(b))]
            solid([(x,course*.425+.006,z) for x,z in corners],
                  [(x,(course+1)*.425-.006,z) for x,z in corners])
    for node in g['nodes']:
        name=node.get('name','')
        if 'Kaide_Metal_Halka' in name or ('Tablet_' in name and '_Ayak' in name):
            node.pop('mesh',None)
        if 'Tablet_' in name and '_Ekran' in name:
            a=g['meshes'][node['mesh']]['primitives'][0]['attributes']
            p=model.read(a['POSITION'])[:4]; center=p.mean(axis=0)
            # The screens point up. Lower the stone top slightly to avoid overlap.
            top=center+(p-center)*1.20; top[:,1]-=.025
            bottom=top.copy(); bottom[:,1]=.015
            bottom[:,[0,2]]=center[[0,2]]+(bottom[:,[0,2]]-center[[0,2]])*.7
            solid(bottom,top)
    model.mesh('ALARM_R12_Stone_Plith_and_Terminals',[model.primitive(vertices,faces,0,uv=uvs)])
    # Dense small ferns at the base; no floating leaves across the sculpture.
    vertices, faces = [], []
    for cluster in range(74):
        angle=RNG.uniform(0,2*math.pi); radius=RNG.uniform(3.75,4.35)
        origin=np.array([math.cos(angle)*radius,.025,math.sin(angle)*radius])
        for _ in range(5):
            angle=RNG.uniform(0,2*math.pi); length=RNG.uniform(.28,.62)
            axis=np.array([math.cos(angle),0,math.sin(angle)])
            across=np.array([-axis[2],0,axis[0]])
            for k in range(1,14):
                t=k/15; center=origin+axis*length*t+np.array([0,length*(.12+1.1*t-.85*t*t),0])
                width=length*.18*math.sin(math.pi*t)**.7
                for side in [-1,1]:
                    start=len(vertices)
                    vertices.extend([center,center+axis*.035+across*width*.6*side,
                                     center+axis*.055+across*width*side,center-axis*.018+across*width*.6*side])
                    faces.extend([(start,start+1,start+2),(start,start+2,start+3)])
    mat=len(g['materials'])
    g['materials'].append({'name':'ALARM_R12_Yaprak_Satin','doubleSided':True,
        'pbrMetallicRoughness':{'baseColorFactor':[.085,.14,.035,1],'roughnessFactor':.63,'metallicFactor':0}})
    model.mesh('ALARM_R12_Egreltiler',[model.primitive(vertices,faces,mat)])
    model.save('observatory-r12.glb')


if __name__ == '__main__':
    character()
    observatory()
