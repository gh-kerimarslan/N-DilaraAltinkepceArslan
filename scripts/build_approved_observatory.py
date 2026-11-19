"""Blender R11 static scene study, derived from the approved ivory/amber concept.

This is a review asset, not a live website release or a completed animation rig.
"""
import argparse
import math
from pathlib import Path
import random
import sys
import bpy
from mathutils import Vector

parser=argparse.ArgumentParser()
parser.add_argument('--griffin',required=True,type=Path)
parser.add_argument('--panorama',required=True,type=Path)
parser.add_argument('--output',required=True,type=Path)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
ROOT=Path(__file__).resolve().parent.parent
args.output.mkdir(parents=True,exist_ok=True)
random.seed(2604511)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'alarm/models/observatory-r06.glb'))
scene=bpy.context.scene
for obj in list(scene.objects):
    if (obj.name.startswith('ALARM_ILK_') or 'Derzli_Tas_Doseme' in obj.name
        or 'Gozlemevi_Dis_Arazisi' in obj.name or ('Tablet_' in obj.name and '_Ayak' in obj.name)):
        bpy.data.objects.remove(obj,do_unlink=True)

stone_source=bpy.data.materials.get('ALARM_R05_Yaslanmis_Tas')
stones=[]
for i in range(5):
    mat=stone_source.copy();mat.name=f'R11_Warm_Weathered_Limestone_{i}'
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    if bs.inputs['Base Color'].is_linked:
        original=bs.inputs['Base Color'].links[0].from_socket
        tint=nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=.58
        tint.inputs[2].default_value=(.93-i*.025,.86-i*.028,.70-i*.025,1)
        links.new(original,tint.inputs[1]);links.new(tint.outputs[0],bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value=.48
    stones.append(mat)

vertices=[];faces=[];material_ids=[]
def solid(bottom,top,material_id=0):
    start=len(vertices);count=len(bottom)
    vertices.extend(bottom+top)
    faces.append(tuple(start+i for i in reversed(range(count))));material_ids.append(material_id)
    faces.append(tuple(start+count+i for i in range(count)));material_ids.append(material_id)
    for j in range(count):
        faces.append((start+j,start+(j+1)%count,start+(j+1)%count+count,start+j+count));material_ids.append(material_id)

# Real joints between irregular flagstones rather than a smooth cylinder/floor.
grid={}
step=.93
for x in range(-15,16):
    for y in range(-15,16):
        grid[x,y]=(x*step+random.uniform(-.13,.13),y*step+random.uniform(-.13,.13))
for x in range(-15,15):
    for y in range(-15,15):
        points=[grid[x,y],grid[x+1,y],grid[x+1,y+1],grid[x,y+1]]
        center=Vector((sum(p[0] for p in points)/4,sum(p[1] for p in points)/4))
        if not 3.85<center.length<13:continue
        points=[center+(Vector(p)-center)*.975 for p in points]
        height=random.uniform(.008,.028)
        solid([(p.x,p.y,-.075) for p in points],[(p.x,p.y,height) for p in points],random.randrange(5))

# Three staggered courses of stone blocks around the plinth.
for course in range(3):
    count=44
    for j in range(count):
        a=(j+(.5 if course%2 else 0))*2*math.pi/count+.003
        b=a+2*math.pi/count-.006
        outer=3.64+random.uniform(-.015,.015);inner=3.25
        corners=[(inner*math.cos(a),inner*math.sin(a)),(outer*math.cos(a),outer*math.sin(a)),
                 (outer*math.cos(b),outer*math.sin(b)),(inner*math.cos(b),inner*math.sin(b))]
        z0=course*.42+.008;z1=(course+1)*.42-.008
        solid([(x,y,z0) for x,y in corners],[(x,y,z1) for x,y in corners],random.randrange(5))
circle=[(3.67*math.cos(i*2*math.pi/128),3.67*math.sin(i*2*math.pi/128)) for i in range(128)]
solid([(x,y,1.26) for x,y in circle],[(x,y,1.34) for x,y in circle],1)

# Stone terminal cases retain the original screen surfaces and their positions.
for screen in [o for o in scene.objects if 'Tablet_' in o.name and '_Ekran' in o.name]:
    points=[screen.matrix_world@v.co for v in screen.data.vertices][:4]
    center=sum(points,Vector())/4
    normal=(points[1]-points[0]).cross(points[2]-points[0]).normalized()
    upper=[center+(p-center)*1.24-normal*.025 for p in points]
    direction=points[1]-points[0];direction.z=0;direction.normalize()
    across=Vector((-direction.y,direction.x,0))
    lower=[Vector((center.x,center.y,.015))+direction*s*.26+across*t*.22 for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    solid([tuple(p) for p in lower],[tuple(p) for p in upper],2)

mesh=bpy.data.meshes.new('R11_flagstones_plinth_terminal_cases');mesh.from_pydata(vertices,[],faces);mesh.update()
architecture=bpy.data.objects.new(mesh.name,mesh);scene.collection.objects.link(architecture)
for mat in stones:mesh.materials.append(mat)
uv=mesh.uv_layers.new(name='StoneUV')
for polygon,material_id in zip(mesh.polygons,material_ids):
    polygon.material_index=material_id
    for li in polygon.loop_indices:
        p=mesh.vertices[mesh.loops[li].vertex_index].co
        uv.data[li].uv=(p.x*.48,p.y*.48) if abs(polygon.normal.z)>.5 else (math.atan2(p.y,p.x)*2.2,p.z*.9)
bevel=architecture.modifiers.new('Worn stone edges','BEVEL');bevel.width=.012;bevel.segments=2

# Dense climbing ivy as actual curved leaf meshes, with restrained color variation.
leaf_mats=[]
for i,color in enumerate([(.025,.060,.009,1),(.043,.095,.016,1),(.075,.125,.025,1)]):
    mat=bpy.data.materials.new(f'R11_Ivy_{i}');mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color
    bs.inputs['Roughness'].default_value=.43;bs.inputs['Subsurface Weight'].default_value=.13
    leaf_mats.append(mat)
vv=[];ff=[];mm=[]
for vine in range(44):
    angle=vine*2*math.pi/44
    radius=random.uniform(11.7,12.5)
    for j in range(random.randint(38,75)):
        height=random.uniform(.1,8.2)
        arc=angle+math.sin(height*.8+vine)*.028+random.uniform(-.027,.027)
        center=Vector((radius*math.cos(arc),radius*math.sin(arc),height))
        side=Vector((-math.sin(arc),math.cos(arc),random.uniform(-.7,.7))).normalized()
        up=Vector((0,0,1));normal=side.cross(up).normalized()
        length=random.uniform(.08,.23);width=length*random.uniform(.5,.8)
        start=len(vv)
        vv.append(center+normal*.017)
        for x,y in [(-.1,-1),(-.7,-.45),(-1,.05),(-.45,.65),(0,1),(.45,.65),(1,.05),(.7,-.45)]:
            vv.append(center+side*x*width+up*y*length)
        material_id=random.randrange(3)
        for k in range(8):ff.append((start,start+1+k,start+1+(k+1)%8));mm.append(material_id)
ivy_mesh=bpy.data.meshes.new('R11_Climbing_Ivy');ivy_mesh.from_pydata(vv,[],ff);ivy_mesh.update()
ivy=bpy.data.objects.new(ivy_mesh.name,ivy_mesh);scene.collection.objects.link(ivy)
for mat in leaf_mats:ivy_mesh.materials.append(mat)
for polygon,index in zip(ivy_mesh.polygons,mm):polygon.material_index=index;polygon.use_smooth=True

# Place the new draft in the original seven-display arrangement.
before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(args.griffin))
character=[o for o in scene.objects if o not in before]
angle=math.atan2(-8,12)
for obj in character:
    if obj.parent not in character:
        obj.rotation_euler.z+=angle;obj.location.z+=1.34

world=bpy.data.worlds.new('R11_Approved_Mountain_Environment');world.use_nodes=True;scene.world=world
nodes,links=world.node_tree.nodes,world.node_tree.links
environment=nodes.new('ShaderNodeTexEnvironment');environment.image=bpy.data.images.load(str(args.panorama))
texcoord=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeMapping')
mapping.inputs['Rotation'].default_value[2]=2.3
links.new(texcoord.outputs['Generated'],mapping.inputs[0]);links.new(mapping.outputs[0],environment.inputs[0])
background=nodes.get('Background');links.new(environment.outputs[0],background.inputs['Color']);background.inputs['Strength'].default_value=.30

def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(-5,4,14));sun=bpy.context.object
sun.data.energy=4.8;sun.data.angle=.075;sun.data.color=(1,.78,.51);aim(sun,(0,0,2.2))
bpy.ops.object.light_add(type='AREA',location=(6,-7,7));sky=bpy.context.object
sky.data.energy=500;sky.data.shape='DISK';sky.data.size=8;sky.data.color=(.75,.83,1);aim(sky,(0,0,2.8))

scene.render.engine='CYCLES';scene.cycles.samples=96;scene.cycles.use_denoising=False
scene.cycles.max_bounces=6;scene.cycles.transmission_bounces=6
scene.cycles.adaptive_threshold=.035
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.25
scene.render.resolution_x=1440;scene.render.resolution_y=810;scene.render.resolution_percentage=100
bpy.ops.object.camera_add(location=(13,-9,4.0));camera=bpy.context.object
camera.data.lens=42;aim(camera,(0,0,2.8));scene.camera=camera

# Export only real geometry; the panorama is a separate environment texture.
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type=='MESH':obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(args.output/'ALARM_Approved_Scene_Study_R11.glb'),export_format='GLB',use_selection=True,export_yup=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(args.output/'ALARM_Approved_Scene_Study_R11.blend'))
scene.render.filepath=str(args.output/'ALARM_Approved_Scene_Study_R11.png')
bpy.ops.render.render(write_still=True)
