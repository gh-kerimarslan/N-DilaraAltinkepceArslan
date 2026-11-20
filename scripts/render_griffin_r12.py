"""Review the actual R12 mesh before publication. Blender CPU, no paid service."""
from pathlib import Path
import math
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for name in ['observatory-r12.glb','griffin-r12b.glb']:
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'alarm/models'/name))
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=48
scene.cycles.use_denoising=False; scene.cycles.max_bounces=6
scene.render.resolution_x=1280;scene.render.resolution_y=720
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.45
world=bpy.data.worlds.new('R12 mountain light');world.use_nodes=True;scene.world=world
nodes,links=world.node_tree.nodes,world.node_tree.links
env=nodes.new('ShaderNodeTexEnvironment')
env.image=bpy.data.images.load(str(ROOT/'alarm/images/reference/observatory-panorama-r12.webp'))
coord=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeMapping')
mapping.inputs['Rotation'].default_value[2]=2.3
links.new(coord.outputs['Generated'],mapping.inputs['Vector']);links.new(mapping.outputs[0],env.inputs[0])
bg=nodes.get('Background');links.new(env.outputs[0],bg.inputs['Color']);bg.inputs['Strength'].default_value=.38

def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(-10,-9,22))
sun=bpy.context.object;sun.data.energy=4;sun.data.color=(1,.82,.58);sun.data.angle=.08;aim(sun,(0,0,0))
bpy.ops.object.light_add(type='AREA',location=(8,-4,7))
fill=bpy.context.object;fill.data.energy=500;fill.data.size=8;fill.data.color=(.72,.83,1);aim(fill,(0,0,2.8))
for o in scene.objects:
    if o.type!='MESH':continue
    if 'Tablet_' in o.name and '_Ekran' in o.name:
        animal=o.name.split('Tablet_')[1].split('_')[0]
        mat=bpy.data.materials.new('Terminal '+animal);mat.use_nodes=True
        n,l=mat.node_tree.nodes,mat.node_tree.links;n.clear()
        out=n.new('ShaderNodeOutputMaterial');em=n.new('ShaderNodeEmission');em.inputs['Strength'].default_value=.7
        tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/f'alarm/images/{animal}-terminal-r04.png'))
        l.new(tex.outputs['Color'],em.inputs[0]);l.new(em.outputs[0],out.inputs[0]);o.data.materials.clear();o.data.materials.append(mat)
bpy.ops.object.camera_add(location=(12,-8,2.9))
camera=bpy.context.object;camera.data.lens=48;aim(camera,(0,0,2.85));scene.camera=camera
out=ROOT/'studies';out.mkdir(exist_ok=True)
scene.render.filepath=str(out/'ALARM_Actual_Scene_R12.png')
bpy.ops.render.render(write_still=True)
# A second actual camera catches overlaps or flat head projection mistakes.
camera.location=(-10,-10,3.8);aim(camera,(0,0,2.85))
scene.render.resolution_x=960;scene.render.resolution_y=540;scene.cycles.samples=24
scene.render.filepath=str(out/'ALARM_Actual_Scene_R12_Reverse.png')
bpy.ops.render.render(write_still=True)
