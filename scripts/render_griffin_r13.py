"""Render the actual R13 assets to review the matte finish and low skyline."""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for name in ['city-r13.glb', 'griffin-r13.glb']:
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'alarm/models'/name))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = False
scene.cycles.max_bounces = 5
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = .25
world = bpy.data.worlds.new('R13 quiet dry daylight')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.60,.64,.64,1)
world.node_tree.nodes['Background'].inputs[1].default_value = .65
scene.world = world

def aim(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

bpy.ops.object.light_add(type='SUN', location=(-10,-9,22))
sun = bpy.context.object
sun.data.energy = 2.5
sun.data.color = (1,.96,.90)
sun.data.angle = .12
aim(sun,(0,0,0))
for o in scene.objects:
    if o.type != 'MESH':
        continue
    if 'Tablet_' in o.name and '_Ekran' in o.name:
        animal = o.name.split('Tablet_')[1].split('_')[0]
        mat = bpy.data.materials.new('Terminal '+animal)
        mat.use_nodes = True
        n,l = mat.node_tree.nodes,mat.node_tree.links
        n.clear()
        out = n.new('ShaderNodeOutputMaterial')
        em = n.new('ShaderNodeEmission')
        em.inputs['Strength'].default_value = .7
        tex = n.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(ROOT/f'alarm/images/{animal}-terminal-r04.png'))
        l.new(tex.outputs['Color'],em.inputs[0])
        l.new(em.outputs[0],out.inputs[0])
        o.data.materials.clear()
        o.data.materials.append(mat)
bpy.ops.object.camera_add(location=(12,-8,2.25))
camera = bpy.context.object
camera.data.lens = 41
aim(camera,(0,0,1.90))
scene.camera = camera
out = ROOT/'studies'
out.mkdir(exist_ok=True)
scene.render.filepath = str(out/'ALARM_Actual_Scene_R13.png')
bpy.ops.render.render(write_still=True)
camera.location = (-10,-10,2.6)
aim(camera,(0,0,1.90))
scene.render.resolution_x = 960
scene.render.resolution_y = 540
scene.cycles.samples = 20
scene.render.filepath = str(out/'ALARM_Actual_Scene_R13_Reverse.png')
bpy.ops.render.render(write_still=True)
