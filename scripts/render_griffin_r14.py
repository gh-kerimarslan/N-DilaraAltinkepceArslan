"""Review the actual office-plaza geometry and the open control-room sightline."""
from pathlib import Path
import bpy
from PIL import Image, ImageDraw, ImageFont
from mathutils import Vector

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'studies';OUT.mkdir(exist_ok=True)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
def text(draw,xy,value,size=28,color='#b2ffc6'):
    draw.text(xy,value,font=ImageFont.truetype(FONT,size),fill=color)
billboard=Image.new('RGB',(2560,768),'#020906');d=ImageDraw.Draw(billboard)
channels=[('moloch','MOLOCH','DROUGHT','TAIL'),('cheetah','CHEETAH','RAPID CONSUMPTION','BODY'),
          ('cockroach','COCKROACH','RADIATION','WINGS'),('raven','RAVEN','IGNORANCE','HEAD'),('gorilla','GORILLA','HUMAN VALUES','EYES')]
for i,(id,name,theme,part) in enumerate(channels):
    x=i*512
    text(d,(x+24,20),'ALARM / '+part,28);text(d,(x+24,60),name,43)
    im=Image.open(ROOT/f'alarm/images/{id}-terminal-r04.png').convert('RGB');im.thumbnail((452,270))
    billboard.paste(im,(x+256-im.width//2,273-im.height//2))
    text(d,(x+24,440),theme,28);text(d,(x+24,510),'—',46)
    text(d,(x+24,595),'NO SOURCE RECORD',25);text(d,(x+24,645),'AWAITING RECORD',24)
    text(d,(x+24,706),'SOURCE OBSERVATION',24)
    d.line((x,0,x,768),fill='#294e35',width=2)
billboard.save(OUT/'R14_billboard.png')
overview=Image.new('RGB',(1600,800),'#020906');d=ImageDraw.Draw(overview)
text(d,(48,28),'ALARM / COMMON OBSERVATION',48);text(d,(48,100),'2076 / CLIMATE EXCHANGE',28)
for i,(_,name,theme,part) in enumerate(channels):
    y=190+i*97;text(d,(48,y),theme,30);text(d,(720,y),'—',32);text(d,(1080,y),'AWAITING RECORD',25)
    d.line((48,y+66,1552,y+66),fill='#294e35',width=2)
text(d,(48,720),'OBSERVATION RECORDS / 5 CHANNELS',28)
overview.save(OUT/'R14_overview.png')
sign=Image.new('RGB',(1900,58),'#535a55');d=ImageDraw.Draw(sign)
text(d,(40,5),'C L I M A T E   E X C H A N G E',37,'#b5b8a8');text(d,(1390,12),'REOCCUPIED / 2076',26,'#c0ccba')
sign.save(OUT/'R14_sign.png')

bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for name in ['base-r14.glb','griffin-r13.glb']:
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'alarm/models'/name))
for o in bpy.context.scene.objects:
    if o.type!='MESH':continue
    tex=None
    if 'ALARM_R14_Channel_' in o.name:tex='R14_billboard.png'
    elif 'Interior_Overview' in o.name:tex='R14_overview.png'
    elif 'Exchange_Sign' in o.name:tex='R14_sign.png'
    if tex:
        mat=bpy.data.materials.new(tex);mat.use_nodes=True
        n,l=mat.node_tree.nodes,mat.node_tree.links;n.clear()
        out=n.new('ShaderNodeOutputMaterial');em=n.new('ShaderNodeEmission');em.inputs[1].default_value=.8
        im=n.new('ShaderNodeTexImage');im.image=bpy.data.images.load(str(OUT/tex))
        l.new(im.outputs[0],em.inputs[0]);l.new(em.outputs[0],out.inputs[0]);o.data.materials.clear();o.data.materials.append(mat)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.cycles.use_denoising=False;scene.cycles.max_bounces=5
scene.render.resolution_x=1440;scene.render.resolution_y=810;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.25
world=bpy.data.worlds.new('R14 quiet city daylight');world.use_nodes=True;scene.world=world
world.node_tree.nodes['Background'].inputs[0].default_value=(.60,.64,.64,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.65
def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(-10,-9,22));sun=bpy.context.object
sun.data.energy=2.5;sun.data.color=(1,.96,.90);sun.data.angle=.12;aim(sun,(0,0,0))
bpy.ops.object.light_add(type='AREA',location=(5.5,11,4.8));light=bpy.context.object
light.data.energy=170;light.data.size=3;light.data.color=(.9,1,.85);aim(light,(4.85,13,2.0))
bpy.ops.object.camera_add(location=(8.5,-18,2.9));camera=bpy.context.object;camera.data.lens=33.1
aim(camera,(-3,3,2.8));scene.camera=camera
scene.render.filepath=str(OUT/'ALARM_Actual_Scene_R14.png');bpy.ops.render.render(write_still=True)
camera.location=(5.5,7.85,1.8);aim(camera,(4.85,13,2.4));camera.data.lens=22.7
scene.render.resolution_x=1280;scene.render.resolution_y=720
scene.render.filepath=str(OUT/'ALARM_Actual_Interior_R14.png');bpy.ops.render.render(write_still=True)
