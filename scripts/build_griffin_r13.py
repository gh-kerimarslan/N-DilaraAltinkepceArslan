"""Matte marble griffin in a restrained, dry, low-rise city.

Reuses the authored skeleton, eyes, sixteen clips and six display surfaces.
No external generation service or downloaded city assets are required.
"""
from copy import deepcopy
import math
import numpy as np
from scipy.spatial import cKDTree, Voronoi
import build_griffin_r12 as previous
from build_griffin_r12 import GLB, inside

RNG = np.random.default_rng(1302076)


def compact(model):
    """Discard unreferenced images/geometry without changing rig node indices."""
    g = model.g
    meshes = sorted({n['mesh'] for n in g['nodes'] if 'mesh' in n})
    mesh_map = {old: new for new, old in enumerate(meshes)}
    for n in g['nodes']:
        if 'mesh' in n:
            n['mesh'] = mesh_map[n['mesh']]
    g['meshes'] = [g['meshes'][i] for i in meshes]
    primitives = [p for m in g['meshes'] for p in m['primitives']]
    materials = sorted({p['material'] for p in primitives if 'material' in p})
    material_map = {old: new for new, old in enumerate(materials)}
    g['materials'] = [g['materials'][i] for i in materials]
    for p in primitives:
        if 'material' in p:
            p['material'] = material_map[p['material']]
    texture_refs = []

    def scan(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key.endswith('Texture') and isinstance(item, dict) and 'index' in item:
                    texture_refs.append(item)
                else:
                    scan(item)
        elif isinstance(value, list):
            for item in value:
                scan(item)
    scan(g['materials'])
    textures = sorted({x['index'] for x in texture_refs})
    tmap = {old: new for new, old in enumerate(textures)}
    for item in texture_refs:
        item['index'] = tmap[item['index']]
    g['textures'] = [g.get('textures', [])[i] for i in textures]
    images = sorted({t['source'] for t in g['textures'] if 'source' in t})
    imap = {old: new for new, old in enumerate(images)}
    g['images'] = [g.get('images', [])[i] for i in images]
    for t in g['textures']:
        if 'source' in t:
            t['source'] = imap[t['source']]
    accessors = set()
    for p in primitives:
        accessors.update(p['attributes'].values())
        if 'indices' in p:
            accessors.add(p['indices'])
        for target in p.get('targets', []):
            accessors.update(target.values())
    for skin in g.get('skins', []):
        if 'inverseBindMatrices' in skin:
            accessors.add(skin['inverseBindMatrices'])
    for animation in g.get('animations', []):
        for sampler in animation['samplers']:
            accessors.update([sampler['input'], sampler['output']])
    accessors = sorted(accessors)
    amap = {old: new for new, old in enumerate(accessors)}
    g['accessors'] = [g['accessors'][i] for i in accessors]
    for p in primitives:
        p['attributes'] = {k: amap[v] for k, v in p['attributes'].items()}
        if 'indices' in p:
            p['indices'] = amap[p['indices']]
        for target in p.get('targets', []):
            target.update({k: amap[v] for k, v in target.items()})
    for skin in g.get('skins', []):
        if 'inverseBindMatrices' in skin:
            skin['inverseBindMatrices'] = amap[skin['inverseBindMatrices']]
    for animation in g.get('animations', []):
        for sampler in animation['samplers']:
            sampler.update(input=amap[sampler['input']], output=amap[sampler['output']])
    views = sorted({a['bufferView'] for a in g['accessors']} |
                   {im['bufferView'] for im in g['images'] if 'bufferView' in im})
    old_views, old_data = g['bufferViews'], model.b
    vmap = {}
    g['bufferViews'], model.b = [], bytearray()
    for old in views:
        v = old_views[old]
        start = v.get('byteOffset', 0)
        vmap[old] = model.data(old_data[start:start + v['byteLength']])
        for key in ['byteStride', 'target']:
            if key in v:
                g['bufferViews'][-1][key] = v[key]
    for a in g['accessors']:
        a['bufferView'] = vmap[a['bufferView']]
    for im in g['images']:
        if 'bufferView' in im:
            im['bufferView'] = vmap[im['bufferView']]
    for key in ['images', 'textures']:
        if not g[key]:
            del g[key]


def marble():
    model = GLB('griffin-r12b.glb')
    g = model.g
    for mesh in g['meshes']:
        for p in mesh['primitives']:
            p['attributes'].pop('COLOR_0', None)
    for mat in g['materials']:
        if 'Goz' in mat.get('name', '') or any(s in mat.get('name', '') for s in ['Sklera', 'Iris', 'Ic_Kenar']):
            continue
        pbr = mat['pbrMetallicRoughness']
        pbr.pop('baseColorTexture', None)
        pbr.update(baseColorFactor=[.76, .77, .745, 1], metallicFactor=0, roughnessFactor=.94)
        mat.pop('alphaMode', None)
        mat.pop('alphaCutoff', None)
        if 'normalTexture' in mat:
            mat['normalTexture']['scale'] = .22
        if 'Rigid_forewing' in mat.get('name', ''):
            mat['name'] = 'ALARM_R13_Matte_Marble_Forewing'
        if 'Folded_hindwing' in mat.get('name', ''):
            mat['name'] = 'ALARM_R13_Matte_Marble_Hindwing'

    membrane = next(n for n in g['nodes'] if n.get('name') == 'ALARM_R03_Ince_Kanat_Zarlari')
    primitives = g['meshes'][membrane['mesh']]['primitives']
    node = next(n for n in g['nodes'] if n.get('name') == 'ALARM_R03_Kanat_Damar_Agi')
    material = len(g['materials'])
    g['materials'].append({'name': 'ALARM_R13_Carved_Marble_Veins', 'doubleSided': True,
        'pbrMetallicRoughness': {'baseColorFactor': [.65, .665, .645, 1], 'roughnessFactor': .96, 'metallicFactor': 0}})
    polygons = [
        [(493,263),(582,211),(791,139),(1111,62),(1386,25),(1538,26),(1586,48),(1570,83),(1507,117),(1322,181),(1069,254),(813,301),(624,315),(523,294)],
        [(520,292),(676,294),(888,271),(1151,231),(1435,219),(1547,232),(1580,253),(1551,295),(1478,346),(1358,402),(1195,465),(1030,496),(886,482),(744,434),(625,372),(548,324)]
    ]
    vein_primitives = []
    for kind, poly in enumerate(polygons):
        poly = np.array(poly, float)
        lines = [np.concatenate([poly, poly[:1]])]
        root = np.array([525, 275 if kind == 0 else 300])
        endpoints = ([poly[i] for i in [2,3,4,5,6,8,9,10,11]] if kind == 0 else
                     [poly[i] for i in [2,3,4,5,6,8,9,10,11,12]])
        for end in endpoints:
            t = np.linspace(0, 1, 42)[:, None]
            curve = root*(1-t)+end*t
            curve[:, 1] += 9*np.sin(t[:,0]*math.pi)
            lines.append(curve)
        # Sparse, irregular cross veins remain a shallow carved relief in stone.
        seeds = RNG.uniform(poly.min(0), poly.max(0), (180, 2))
        seeds = seeds[inside(seeds, poly)]
        cells = Voronoi(seeds)
        for edge in cells.ridge_vertices:
            if -1 in edge:
                continue
            a, b = cells.vertices[edge]
            samples = np.linspace(a, b, 5)
            if inside(samples, poly).all() and RNG.random() < .50:
                lines.append(samples)
        for side in [-1, 1]:
            source = primitives[kind*2+(0 if side == -1 else 1)]['attributes']
            skin = (cKDTree(model.read(source['POSITION'])), model.read(source['JOINTS_0']), model.read(source['WEIGHTS_0']))
            vertices, faces = [], []
            for line in lines:
                keep = inside(line, poly)
                # Include the edge outline and main vein ends.
                if len(line) == len(poly)+1:
                    keep[:] = True
                if keep.sum() < 2:
                    continue
                q = line[keep]; t = np.clip((q[:,0]-500)/1080, 0, 1.02)
                z = 1.67-t*3.45
                if kind == 0:
                    y = 3.44+(269-q[:,1])*.0062
                    x = side*(.27+.98*t+.12*np.sin(t*np.pi))
                else:
                    y = 3.32+(292-q[:,1])*.0034
                    spread = np.maximum(q[:,1]-292, 0)/210
                    x = side*(.30+1.06*t+.55*spread+.035*np.sin(spread*math.pi*16)*t)
                points = np.column_stack([x, y, z])
                start = len(vertices)
                for j, point in enumerate(points):
                    tangent = points[min(j+1, len(points)-1)]-points[max(j-1, 0)]
                    tangent /= max(np.linalg.norm(tangent), 1e-9)
                    normal = np.cross(tangent, [1, 0, 0]); normal /= max(np.linalg.norm(normal), 1e-9)
                    other = np.cross(tangent, normal)
                    for k in range(5):
                        angle = k*2*math.pi/5
                        vertices.append(point+.005*(normal*math.cos(angle)+other*math.sin(angle)))
                for j in range(len(points)-1):
                    for k in range(5):
                        a=start+j*5+k; b=start+j*5+(k+1)%5
                        faces.extend([(a,b,b+5),(a,b+5,a+5)])
            vein_primitives.append(model.primitive(vertices, faces, material, skin=skin))
    g['meshes'].append({'name': 'ALARM_R13_Carved_Wing_Relief', 'primitives': vein_primitives})
    node['mesh'] = len(g['meshes'])-1
    # Lower the entire animated asset together; never alter bone or mesh transforms.
    roots = g['scenes'][g.get('scene', 0)]['nodes']
    g['nodes'].append({'name': 'ALARM_R13_Grounded_Sculpture', 'translation': [0,-1.15,0], 'children': roots[:]})
    g['scenes'][g.get('scene', 0)]['nodes'] = [len(g['nodes'])-1]
    g['asset'].setdefault('extras', {})['look_revision'] = 'R13: unspotted matte marble, opaque carved wings, grounded placement'
    compact(model)
    assert len(g['animations']) == 16
    model.save('griffin-r13.glb')


class Geometry:
    def __init__(self):
        self.vertices, self.faces, self.colors = [], [], []

    def polygon(self, points, color=(1,1,1,1)):
        start = len(self.vertices)
        self.vertices.extend(points)
        self.colors.extend([color]*len(points))
        self.faces.extend((start,start+j,start+j+1) for j in range(1,len(points)-1))

    def box(self, center, size, color=(1,1,1,1)):
        x,y,z = center; a,b,c = np.asarray(size)/2
        p = np.array([[x-a,y-b,z-c],[x+a,y-b,z-c],[x+a,y+b,z-c],[x-a,y+b,z-c],
                      [x-a,y-b,z+c],[x+a,y-b,z+c],[x+a,y+b,z+c],[x-a,y+b,z+c]])
        for indices in [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]]:
            self.polygon(p[indices],color)

    def weathered_box(self, center, size, color):
        """Coherent, quiet wall discoloration, with no extra texture request."""
        x,y,z = center; a,b,c = np.asarray(size)/2
        p = np.array([[x-a,y-b,z-c],[x+a,y-b,z-c],[x+a,y+b,z-c],[x-a,y+b,z-c],
                      [x-a,y-b,z+c],[x+a,y-b,z+c],[x+a,y+b,z+c],[x-a,y+b,z+c]])
        for ids in [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]]:
            corners = p[ids]
            u,v = corners[1]-corners[0],corners[3]-corners[0]
            nu,nv = max(1,math.ceil(np.linalg.norm(u)/.65)),max(1,math.ceil(np.linalg.norm(v)/.65))
            for i in range(nu):
                for j in range(nv):
                    points = [corners[0]+u*s+v*t for s,t in [(i/nu,j/nv),((i+1)/nu,j/nv),((i+1)/nu,(j+1)/nv),(i/nu,(j+1)/nv)]]
                    self.polygon(points,color)
                    for k,(px,py,pz) in enumerate(points):
                        patina = .93+.036*math.sin(px*2.2+pz*1.6+py*1.8)+.026*math.sin(px*.37+pz*.81+py*3.8)
                        patina -= .07*math.exp(-py*2)
                        self.colors[-4+k] = [c*patina for c in color[:3]]+[1]


def city():
    source = GLB('observatory-r06.glb')
    model = GLB.__new__(GLB)
    model.b = bytearray()
    model.g = {'asset': {'version': '2.0', 'generator': 'ALARM R13 restrained dry city'},
               'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [],
               'materials': [], 'buffers': [{'byteLength': 0}], 'bufferViews': [], 'accessors': []}
    g = model.g
    colors = [(.38,.34,.28),(.30,.285,.25),(.43,.415,.37),(.18,.175,.15),(.052,.058,.055),(.12,.13,.125)]
    names = ['Dry_Ground','Dusty_Paving','Worn_Concrete','Dry_Cracks','Matte_Display_Case','Recessed_Window']
    for name, color in zip(names, colors):
        g['materials'].append({'name': 'ALARM_R13_'+name, 'doubleSided': True,
            'pbrMetallicRoughness': {'baseColorFactor': [*color,1], 'roughnessFactor': .97, 'metallicFactor': 0}})
    geometry = [Geometry() for _ in colors]
    # Keep the actual display surfaces, their UVs and original world placement.
    for node in source.g['nodes']:
        name = node.get('name','')
        if 'mesh' not in node or not ('Tablet_' in name or 'Arsiv_Ekrani' in name):
            continue
        primitives = []
        for p in source.g['meshes'][node['mesh']]['primitives']:
            attr = p['attributes']
            primitives.append(model.primitive(source.read(attr['POSITION']), source.read(p['indices']).reshape(-1,3), 4,
                uv=source.read(attr['TEXCOORD_0']) if 'TEXCOORD_0' in attr else None))
        model.mesh(name, primitives)
    # Low, plain slab: the feet sit 15cm above the surrounding dry plaza.
    for k in range(96):
        a,b = k*2*math.pi/96,(k+1)*2*math.pi/96
        p,q = np.array([3.6*math.cos(a),.146,3.6*math.sin(a)]),np.array([3.6*math.cos(b),.146,3.6*math.sin(b)])
        geometry[2].polygon([[0,.146,0],q,p])
        geometry[2].polygon([p,q,[q[0],.01,q[2]],[p[0],.01,p[2]]])
    # Slightly uneven, subdued dry ground; no reflective or lush surfaces.
    for x in np.arange(-150,150,5):
        for z in np.arange(-150,150,5):
            shade = RNG.uniform(.93,1.035)
            geometry[0].polygon([[x,-.04,z],[x,-.04,z+5],[x+5,-.04,z+5],[x+5,-.04,z]], [shade,shade,shade,1])
    # A plain abandoned square and quiet street lines rather than monumental architecture.
    geometry[1].box([0,-.035,0],[22,.08,22])
    geometry[1].box([0,-.025,0],[9,.04,120])
    geometry[1].box([0,-.028,0],[120,.04,7])
    for offset in [-4.6,4.6]:
        geometry[2].box([offset,-.012,0],[.18,.10,100],[.8,.8,.78,1])
    for offset in [-3.6,3.6]:
        geometry[2].box([0,-.014,offset],[100,.09,.16],[.8,.8,.78,1])
    # Low roofs, small dark windows and a few damaged parapets. No towers or spectacle.
    buildings = [(-16,-19,8,7,3.2),(-26,-20,9,8,4.4),(-15,-32,8,10,3.6),
                 (-30,-34,11,7,3.0),(14,-23,8,8,3.2),(25,-20,9,6,4.3),
                 (20,-34,12,8,3.4),(-23,14,9,7,3.7),(-30,25,9,8,4.2),
                 (-16,29,8,9,3.0),(19,19,8,8,3.3),(30,23,10,8,4.4),
                 (20,35,9,9,3.5),(-41,-12,8,9,3.7),(42,-11,9,8,3.8),
                 (-42,14,10,7,3.2),(43,11,8,8,3.1)]
    for i,(x,z,w,d,h) in enumerate(buildings):
        shade = RNG.uniform(.76,1.05)
        color = [shade,shade*.985,shade*.96,1]
        geometry[2].weathered_box([x,h/2,z],[w,h,d],color)
        geometry[2].box([x,h+.065,z],[w+.18,.13,d+.18],[shade*.87]*3+[1])
        # Shallow recessed window panels on every side read from the orbit, too.
        for side in [-1,1]:
            for u in np.arange(-w/2+1.0,w/2-.5,2.1):
                for y in ([1.65,3.3] if h>4 else [1.65]):
                    geometry[5].box([x+u,y,z+side*(d/2+.006)],[.80,1.05,.012])
                    geometry[2].box([x+u,y-.55,z+side*(d/2+.025)],[.96,.08,.10],color)
                    if RNG.random()<.16:
                        geometry[3].box([x+u,y,z+side*(d/2+.022)],[.88,.15,.022])
            for u in np.arange(-d/2+1.1,d/2-.5,2.2):
                geometry[5].box([x+side*(w/2+.006),1.65,z+u],[.012,1.05,.80])
        geometry[5].box([x,1.02,z+d/2+.012],[1.02,2.04,.02])
        if i%3==0:
            geometry[2].box([x-w*.20,h+.30,z-d*.47],[w*.4,.45,.18],color)
        # Dust gathering at the wall foot softens the block silhouette.
        for _ in range(6):
            rx=x+RNG.uniform(-w*.65,w*.65); rz=z+RNG.choice([-1,1])*(d/2+RNG.uniform(.05,.7))
            size=RNG.uniform(.08,.24)
            geometry[2].box([rx,size*.28,rz],[size*1.7,size*.56,size],color)
    # Low drifts of windblown dust along a few curbs, kept below ankle height.
    for _ in range(22):
        x=RNG.choice([-1,1])*RNG.uniform(4.8,5.8);z=RNG.uniform(-42,42)
        if math.hypot(x,z)<10:
            continue
        radius=RNG.uniform(.5,1.4);center=[x,RNG.uniform(.035,.10),z]
        for k in range(9):
            a,b=k*2*math.pi/9,(k+1)*2*math.pi/9
            geometry[0].polygon([center,[x+radius*math.cos(b),-.015,z+radius*.45*math.sin(b)],
                                      [x+radius*math.cos(a),-.015,z+radius*.45*math.sin(a)]])
    # Hairline cracks and a few fragments, kept away from the pedestal and screens.
    for _ in range(52):
        x,z=RNG.uniform(-11,11,2)
        if math.hypot(x,z)<4.7:
            continue
        points=[np.array([x,.007,z])]
        for k in range(RNG.integers(2,5)):
            points.append(points[-1]+np.array([RNG.uniform(.08,.38),0,RNG.uniform(-.23,.23)]))
        for a,b in zip(points,points[1:]):
            geometry[3].polygon([a,b,b+[0,0,.007],a+[0,0,.007]])
    for material, geo in enumerate(geometry):
        if geo.vertices:
            model.mesh('ALARM_R13_'+names[material],[model.primitive(geo.vertices,geo.faces,material,colors=geo.colors)])
    model.save('city-r13.glb')


if __name__ == '__main__':
    # Keep earlier URLs valid for already-open/cached viewer modules.
    previous.character()
    previous.observatory()
    marble()
    city()
