"""Offline look-development study from the actual ALARM meshes; no image synthesis.

blender -b --python scripts/render_reference_study.py -- [preview|final]
The web release is left untouched. First run make_reference_wing_study.py.
"""
import bpy
import math
import random
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'studies'
OUT.mkdir(exist_ok=True)
final = 'final' in sys.argv
random.seed(2604511)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for name in ['observatory-r06.glb', 'griffin-r10-study.glb']:
    bpy.ops.import_scene.gltf(filepath=str(ROOT / 'alarm/models' / name))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 384 if final else 24
scene.cycles.use_denoising = False
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = .018 if final else .09
scene.cycles.max_bounces = 8
scene.cycles.diffuse_bounces = 3
scene.cycles.glossy_bounces = 4
scene.cycles.transmission_bounces = 6
scene.cycles.volume_bounces = 1
scene.cycles.transparent_max_bounces = 12
scene.cycles.sample_clamp_indirect = 3
scene.render.resolution_x = 1280 if final else 960
scene.render.resolution_y = 720 if final else 540
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = .7


def shader(material):
    return next((n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)


def noise(nodes, scale, detail=3):
    n = nodes.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail
    return n


def ramp(nodes, a, b, low=.1, high=.8):
    n = nodes.new('ShaderNodeValToRGB')
    n.color_ramp.elements[0].position = low
    n.color_ramp.elements[0].color = a
    n.color_ramp.elements[1].position = high
    n.color_ramp.elements[1].color = b
    return n


for material in list(bpy.data.materials):
    if not material.use_nodes:
        continue
    nodes, links = material.node_tree.nodes, material.node_tree.links
    bsdf = shader(material)
    if not bsdf:
        continue
    name = material.name
    if 'Mat_Beyaz_Mineral' in name:
        cells = nodes.new('ShaderNodeTexVoronoi')
        cells.feature = 'DISTANCE_TO_EDGE'
        cells.inputs['Scale'].default_value = 13
        position = nodes.new('ShaderNodeNewGeometry')
        links.new(position.outputs['Position'], cells.inputs['Vector'])
        colors = ramp(nodes, (.33, .29, .22, 1), (.77, .73, .62, 1), .008, .065)
        links.new(cells.outputs['Distance'], colors.inputs[0])
        links.new(colors.outputs[0], bsdf.inputs['Base Color'])
        relief = nodes.new('ShaderNodeBump')
        relief.inputs['Strength'].default_value = .48
        relief.inputs['Distance'].default_value = .009
        links.new(cells.outputs['Distance'], relief.inputs['Height'])
        fine = noise(nodes, 180, 2)
        pores = nodes.new('ShaderNodeBump')
        pores.inputs['Strength'].default_value = .23
        pores.inputs['Distance'].default_value = .004
        links.new(fine.outputs['Fac'], pores.inputs['Height'])
        links.new(relief.outputs['Normal'], pores.inputs['Normal'])
        links.new(pores.outputs['Normal'], bsdf.inputs['Normal'])
        bsdf.inputs['Roughness'].default_value = .42
        bsdf.inputs['Subsurface Weight'].default_value = .055
        bsdf.inputs['Subsurface Radius'].default_value = (.5, .3, .16)
    elif 'Oyma_Tuy' in name:
        bsdf.inputs['Base Color'].default_value = (.76, .72, .61, 1)
        bsdf.inputs['Roughness'].default_value = .44
        bsdf.inputs['Subsurface Weight'].default_value = .045
    elif any(s in name for s in ['Mineral_Tegmina', 'Pleated_Hindwing']):
        # Thin membrane: backlit translucency, rather than an opaque white slab.
        output = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
        transparent = nodes.new('ShaderNodeBsdfTransparent')
        transparent.inputs[0].default_value = (.94, .91, .79, 1)
        translucent = nodes.new('ShaderNodeBsdfTranslucent')
        translucent.inputs[0].default_value = (.88, .83, .66, 1)
        mix = nodes.new('ShaderNodeMixShader')
        mix.inputs[0].default_value = .25
        links.new(transparent.outputs[0], mix.inputs[1])
        links.new(translucent.outputs[0], mix.inputs[2])
        links.new(mix.outputs[0], output.inputs['Surface'])
    elif 'Raised_Wing_Veins' in name:
        bsdf.inputs['Base Color'].default_value = (.50, .39, .20, 1)
        bsdf.inputs['Roughness'].default_value = .37
        bsdf.inputs['Metallic'].default_value = .22
    elif any(s in name for s in ['Yaslanmis_Tas', 'Nemli_Doseme']):
        grit = noise(nodes, 55, 4)
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .38
        bump.inputs['Distance'].default_value = .018
        links.new(grit.outputs['Fac'], bump.inputs['Height'])
        original = bsdf.inputs['Normal'].links[0].from_socket if bsdf.inputs['Normal'].is_linked else None
        if original:
            links.new(original, bump.inputs['Normal'])
        links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
        damp = noise(nodes, 1.9, 3)
        rough = ramp(nodes, (.13, .13, .13, 1), (.78, .78, .78, 1), .25, .68)
        links.new(damp.outputs['Fac'], rough.inputs[0])
        links.new(rough.outputs[0], bsdf.inputs['Roughness'])
        geometry = nodes.new('ShaderNodeNewGeometry')
        xyz = nodes.new('ShaderNodeSeparateXYZ')
        links.new(geometry.outputs['Position'], xyz.inputs[0])
        low = nodes.new('ShaderNodeMath'); low.operation = 'LESS_THAN'; low.inputs[1].default_value = .85
        links.new(xyz.outputs['Z'], low.inputs[0])
        moss_noise = noise(nodes, 5.5, 4)
        moss_mask = ramp(nodes, (0, 0, 0, 1), (.75, .75, .75, 1), .48, .71)
        links.new(moss_noise.outputs['Fac'], moss_mask.inputs[0])
        multiply = nodes.new('ShaderNodeMath'); multiply.operation = 'MULTIPLY'
        links.new(low.outputs[0], multiply.inputs[0]); links.new(moss_mask.outputs[0], multiply.inputs[1])
        color = nodes.new('ShaderNodeMixRGB')
        original_color = bsdf.inputs['Base Color'].links[0].from_socket if bsdf.inputs['Base Color'].is_linked else None
        if original_color:
            links.new(original_color, color.inputs[1])
        else:
            color.inputs[1].default_value = (.34, .31, .24, 1)
        color.inputs[2].default_value = (.055, .082, .020, 1)
        links.new(multiply.outputs[0], color.inputs[0]); links.new(color.outputs[0], bsdf.inputs['Base Color'])
    elif 'Yaprak' in name:
        bsdf.inputs['Roughness'].default_value = .48
        bsdf.inputs['Subsurface Weight'].default_value = .12

# Actual relief scales on the torso and limbs, sampled on the evaluated surface.
from bisect import bisect_left
body = next(o for o in bpy.data.objects if o.name == 'ALARM_R03_Grifon_Govde')
depsgraph = bpy.context.evaluated_depsgraph_get()
evaluated = body.evaluated_get(depsgraph)
surface = evaluated.to_mesh(); surface.calc_loop_triangles()
world = body.matrix_world
pool, weights = [], []
for triangle in surface.loop_triangles:
    points = [world @ surface.vertices[i].co for i in triangle.vertices]
    center = sum(points, Vector()) / 3
    torso = 2.62 < center.z < 3.5 and -1.55 < center.y < 1.45
    limbs = 1.56 < center.z < 2.65 and abs(center.x) > .20 and -1.9 < center.y < 1.65
    if not (torso or limbs): continue
    cross = (points[1]-points[0]).cross(points[2]-points[0])
    if cross.length < 1e-7: continue
    pool.append((points, cross.normalized(), torso)); weights.append(cross.length)
if pool:
    chosen = random.choices(pool, weights=weights, k=22000)
    grid, relief_vertices, relief_faces = {}, [], []
    spacing = .066
    for points, normal, torso in chosen:
        u, v = random.random(), random.random()
        if u+v > 1: u, v = 1-u, 1-v
        point = points[0] + (points[1]-points[0])*u + (points[2]-points[0])*v
        key = tuple(math.floor(c/spacing) for c in point)
        near = [q for dx in [-1,0,1] for dy in [-1,0,1] for dz in [-1,0,1] for q in grid.get((key[0]+dx,key[1]+dy,key[2]+dz), [])]
        if any((point-q).length < spacing for q in near): continue
        grid.setdefault(key,[]).append(point)
        axis = Vector((0,1,-.18)) if torso else Vector((0,0,-1))
        axis -= normal * axis.dot(normal)
        if axis.length < .1: axis = normal.cross(Vector((1,0,0)))
        axis.normalize(); side = normal.cross(axis).normalized()
        width = random.uniform(.035,.049); length = random.uniform(.051,.072)
        outline = [(-.72,-.75),(.72,-.75),(1,-.1),(.65,.64),(0,1.12),(-.65,.64),(-1,-.1)]
        start = len(relief_vertices)
        relief_vertices.append(point+normal*.014)
        for x,y in outline:
            relief_vertices.append(point+side*x*width+axis*y*length+normal*.002)
        for j in range(len(outline)):
            relief_faces.append((start,start+1+j,start+1+(j+1)%len(outline)))
    relief_mesh = bpy.data.meshes.new('Study_carved_scale_relief'); relief_mesh.from_pydata(relief_vertices, [], relief_faces); relief_mesh.update()
    relief_obj = bpy.data.objects.new('Study_individual_ivory_scales',relief_mesh); scene.collection.objects.link(relief_obj)
    scale_mat = bpy.data.materials.new('Study_polished_ivory_scales'); scale_mat.use_nodes=True
    scale_bsdf=shader(scale_mat); scale_bsdf.inputs['Base Color'].default_value=(.73,.69,.57,1); scale_bsdf.inputs['Roughness'].default_value=.40; scale_bsdf.inputs['Subsurface Weight'].default_value=.06
    relief_mesh.materials.append(scale_mat)
    for polygon in relief_mesh.polygons: polygon.use_smooth = True
    print('RELIEF SCALES',len(grid),len(relief_faces)//7)
evaluated.to_mesh_clear()

# Recreate the observation images as emissive screen surfaces for this still study.
for obj in list(bpy.data.objects):
    if 'Tablet_' in obj.name and '_Ekran' in obj.name:
        animal = obj.name.split('Tablet_')[1].split('_')[0]
        material = bpy.data.materials.new('Study_terminal_' + animal)
        material.use_nodes = True
        nodes, links = material.node_tree.nodes, material.node_tree.links
        nodes.clear()
        output = nodes.new('ShaderNodeOutputMaterial')
        emission = nodes.new('ShaderNodeEmission')
        emission.inputs['Strength'].default_value = .7
        image = nodes.new('ShaderNodeTexImage')
        image.image = bpy.data.images.load(str(ROOT / f'alarm/images/{animal}-terminal-r04.png'), check_existing=True)
        links.new(image.outputs['Color'], emission.inputs['Color'])
        links.new(emission.outputs[0], output.inputs['Surface'])
        obj.data.materials.clear(); obj.data.materials.append(material)

# Fine fern geometry around the plinth and foreground. This is actual mesh geometry.
leaf_material = bpy.data.materials.new('Study_fern_satin')
leaf_material.diffuse_color = (.055, .10, .018, 1)
leaf_material.use_nodes = True
leaf_bsdf = shader(leaf_material)
leaf_bsdf.inputs['Base Color'].default_value = (.048, .085, .015, 1)
leaf_bsdf.inputs['Roughness'].default_value = .47
leaf_bsdf.inputs['Subsurface Weight'].default_value = .14
vertices, faces = [], []
for cluster in range(120):
    angle = random.uniform(0, 2 * math.pi)
    radius = random.uniform(3.65, 4.35) if cluster < 85 else random.uniform(5.2, 10.5)
    origin = Vector((math.cos(angle) * radius, math.sin(angle) * radius, .03))
    for frond in range(random.randint(5, 9)):
        direction = random.uniform(0, 2 * math.pi)
        axis = Vector((math.cos(direction), math.sin(direction), 0))
        across = Vector((-axis.y, axis.x, 0))
        length = random.uniform(.32, .8)
        for segment in range(1, 17):
            t = segment / 18
            center = origin + axis * length * t + Vector((0, 0, length * (.14 + 1.1 * t - .85 * t * t)))
            width = length * .16 * math.sin(math.pi * t) ** .7
            for side in [-1, 1]:
                tip = center + across * width * side + axis * length * .10
                start = len(vertices)
                vertices.extend([center, center + axis * length * .055 + across * width * .6 * side,
                                 tip, center - axis * length * .025 + across * width * .6 * side])
                faces.append((start, start + 1, start + 2, start + 3))
mesh = bpy.data.meshes.new('Study_fern_mesh'); mesh.from_pydata(vertices, [], faces); mesh.update()
ferns = bpy.data.objects.new('Study_ferns_around_plinth', mesh); scene.collection.objects.link(ferns)
mesh.materials.append(leaf_material)

# Panorama provides an actual environment behind the architecture.
world = bpy.data.worlds.new('Study mountain ambience')
world.use_nodes = True; scene.world = world
nodes, links = world.node_tree.nodes, world.node_tree.links
environment = nodes.new('ShaderNodeTexEnvironment')
environment.image = bpy.data.images.load(str(ROOT / 'alarm/images/observatory-panorama-r06.png'))
coordinate = nodes.new('ShaderNodeTexCoord')
mapping = nodes.new('ShaderNodeMapping'); mapping.inputs['Rotation'].default_value[2] = 2.3
links.new(coordinate.outputs['Generated'], mapping.inputs['Vector'])
links.new(mapping.outputs[0], environment.inputs[0])
background = next(n for n in nodes if n.type == 'BACKGROUND')
links.new(environment.outputs[0], background.inputs['Color'])
background.inputs['Strength'].default_value = .3

def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

bpy.ops.object.light_add(type='SUN', location=(-4, 3, 18))
sun = bpy.context.object; sun.name = 'Study_low_warm_sun'
sun.data.energy = 5.5; sun.data.angle = .065; sun.data.color = (1, .74, .44)
aim(sun, (0, 0, 1))
bpy.ops.object.light_add(type='AREA', location=(4, -5, 7))
sky = bpy.context.object; sky.name = 'Study_soft_sky_bounce'
sky.data.energy = 500; sky.data.shape = 'DISK'; sky.data.size = 7; sky.data.color = (.68, .80, 1)
aim(sky, (0, 0, 2.8))

# A bounded atmospheric volume catches light through the actual roof opening.
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 5))
haze = bpy.context.object; haze.name = 'Study_light_scattering'; haze.scale = (27, 27, 10)
material = bpy.data.materials.new('Study_dust_atmosphere'); material.use_nodes = True
nodes, links = material.node_tree.nodes, material.node_tree.links; nodes.clear()
output = nodes.new('ShaderNodeOutputMaterial')
volume = nodes.new('ShaderNodeVolumePrincipled')
volume.inputs['Density'].default_value = .007
volume.inputs['Anisotropy'].default_value = .5
volume.inputs['Color'].default_value = (.70, .66, .56, 1)
links.new(volume.outputs['Volume'], output.inputs['Volume']); haze.data.materials.append(material)

bpy.ops.object.camera_add(location=(13, -9, 3.8))
camera = bpy.context.object; camera.name = 'Study_reference_camera'
camera.data.lens = 48; camera.data.sensor_width = 36
aim(camera, (0, 0, 2.75)); scene.camera = camera
scene.render.film_transparent = False
scene.render.filepath = str(OUT / ('ALARM_3D_Look_Study_R10.png' if final else 'ALARM_3D_Look_Preview_R10.png'))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'ALARM_3D_Look_Study_R10.blend'))
bpy.ops.render.render(write_still=True)
