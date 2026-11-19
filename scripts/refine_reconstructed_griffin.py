"""Blender: inspect and texture a draft single-view reconstruction.

The projected appearance is baked for glTF; no animation rig is claimed.
The original reconstruction is preserved. See the R11 study notes.
"""
import argparse
import math
from pathlib import Path
import sys
import bpy
import bmesh
from mathutils.geometry import tessellate_polygon
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--input', required=True, type=Path)
parser.add_argument('--reference', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.input))
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = mesh
mesh.select_set(True)
world_matrix=mesh.matrix_world.copy(); mesh.parent=None; mesh.matrix_world=world_matrix
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for polygon in mesh.data.polygons:
    polygon.use_smooth = True
smooth = mesh.modifiers.new('Reduce voxel surface artifacts', 'SMOOTH')
smooth.factor = .35; smooth.iterations = 5
bpy.ops.object.modifier_apply(modifier=smooth.name)

# Store the original reconstruction-camera projection before normalizing scale.
projection = mesh.data.uv_layers.new(name='ReferenceProjection')
for loop in mesh.data.loops:
    point = mesh.matrix_world @ mesh.data.vertices[loop.vertex_index].co
    # The hidden side uses a symmetric interpretation of the approved near side.
    depth = 1.9-abs(point.x)
    u = .5 + .5 * point.y / (depth * math.tan(math.radians(20)))
    v = .5 + .5 * point.z / (depth * math.tan(math.radians(20)))
    head_weight=max(0,min(1,(-point.y-.20)/.16))*max(0,min(1,(point.z-.01)/.08))
    projection.data[loop.index].uv = (u-.012*head_weight, v+.035*head_weight)

atlas = mesh.data.uv_layers.new(name='BakedAppearance')
mesh.data.uv_layers.active_index = len(mesh.data.uv_layers)-1
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.006)
bpy.ops.object.mode_set(mode='OBJECT')

material = bpy.data.materials.new('R11_Approved_Ivory_Amber_Appearance')
material.use_nodes = True
nodes, links = material.node_tree.nodes, material.node_tree.links
nodes.clear()
output = nodes.new('ShaderNodeOutputMaterial')
uv = nodes.new('ShaderNodeUVMap'); uv.uv_map = 'ReferenceProjection'
image = nodes.new('ShaderNodeTexImage')
image.image = bpy.data.images.load(str(args.reference), check_existing=True)
image.extension = 'CLIP'
original_image=image.image
links.new(uv.outputs[0], image.inputs['Vector'])
mix = nodes.new('ShaderNodeMixRGB')
mix.inputs[1].default_value = (.68, .52, .31, 1)
links.new(image.outputs['Alpha'], mix.inputs[0]); links.new(image.outputs['Color'], mix.inputs[2])
emission = nodes.new('ShaderNodeEmission')
links.new(mix.outputs[0], emission.inputs[0]); links.new(emission.outputs[0], output.inputs['Surface'])
mesh.data.materials.clear(); mesh.data.materials.append(material)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'; scene.cycles.samples = 1; scene.cycles.use_denoising = False
target = bpy.data.images.new('R11_Approved_Appearance_2048', width=2048, height=2048, alpha=False)
bake_target = nodes.new('ShaderNodeTexImage'); bake_target.image = target
nodes.active = bake_target
atlas=mesh.data.uv_layers.get('BakedAppearance')
mesh.data.uv_layers.active = atlas
atlas.active_render = True
bpy.ops.object.bake(type='EMIT', margin=8)
target.filepath_raw = str(args.output / 'R11_Approved_Appearance_2048.png')
target.file_format = 'PNG'; target.save()
nodes.clear()
output = nodes.new('ShaderNodeOutputMaterial')
bsdf = nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Roughness'].default_value = .48
bsdf.inputs['Metallic'].default_value = .02
texture = nodes.new('ShaderNodeTexImage'); texture.image = target
uv = nodes.new('ShaderNodeUVMap'); uv.uv_map = 'BakedAppearance'
links.new(uv.outputs[0], texture.inputs['Vector'])
links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
links.new(bsdf.outputs[0], output.inputs['Surface'])
mesh.data.uv_layers.remove(mesh.data.uv_layers.get('ReferenceProjection'))
for attr in list(mesh.data.color_attributes):mesh.data.color_attributes.remove(attr)
# Remove the reconstructed thick upper-wing mass before rebuilding membranes.
bm=bmesh.new(); bm.from_mesh(mesh.data)
remove=[v for v in bm.verts if (v.co.z>.07 and v.co.y>-.25) or (v.co.z>.055 and v.co.y<-.23)]
bmesh.ops.delete(bm, geom=remove, context='VERTS')
bm.to_mesh(mesh.data); bm.free()
mesh.data.validate(clean_customdata=True); mesh.data.update(calc_edges=True)


# Rebuild thin wings directly from the approved silhouette, with a mirrored far pair.
wing_objects=[]
# Pixel outlines are measured on the approved 1672 x 941 cutout.
upper=[(493,263),(582,211),(791,139),(1111,62),(1386,25),(1538,26),(1586,48),(1570,83),(1507,117),(1322,181),(1069,254),(813,301),(624,315),(523,294)]
lower=[(520,292),(676,294),(888,271),(1151,231),(1435,219),(1547,232),(1580,253),(1551,295),(1478,346),(1358,402),(1195,465),(1030,496),(886,482),(744,434),(625,372),(548,324)]
# Reproduce the padding used for inference and the 2048 projection image.
from PIL import Image as PILImage
import numpy as np
original=PILImage.open(args.reference).convert('RGBA')
# Reference already contains a square, padded object. Map original cutout coordinates
# through the same crop/padding measurements retained from the source cutout.
cutout_path=args.reference.parent/'griffin-approved-cutout.png'
cutout=PILImage.open(cutout_path).convert('RGBA'); mask=np.asarray(cutout)[:,:,3]
yy,xx=np.nonzero(mask>16); minx,miny,maxx,maxy=int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)
side_length=int(max(maxx-minx,maxy-miny)/.85)
pad_x=(side_length-(maxx-minx))//2; pad_y=(side_length-(maxy-miny))//2

def image_uv(pixel):
    return ((pixel[0]-minx+pad_x)/side_length,1-(pixel[1]-miny+pad_y)/side_length)

for pair,outline in [('Forewing',upper),('Hindwing',lower)]:
    polygon=[Vector((*image_uv(p),0)) for p in outline]
    triangles=tessellate_polygon([polygon])
    for side in [1,-1]:
        points=[]; indices=[]; uv_values=[]; lookup={}
        def add(uv):
            key=(round(uv.x,7),round(uv.y,7))
            if key in lookup:return lookup[key]
            t=max(0,min(1,(uv.x-.32)/.56))
            depth=side*(.12+(.28 if pair=='Forewing' else .22)*t+.018*math.sin(math.pi*t))
            distance=1.9-abs(depth)
            y=(uv.x-.5)*2*distance*math.tan(math.radians(20))
            z=(uv.y-.5)*2*distance*math.tan(math.radians(20))-(.012 if side<0 else 0)
            lookup[key]=len(points); points.append((depth,y,z)); uv_values.append((uv.x,uv.y));return lookup[key]
        def subdivide(a,b,c,level):
            if not level:indices.append((add(a),add(b),add(c)));return
            ab=(a+b)/2;bc=(b+c)/2;ca=(c+a)/2
            for tri in [(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)]:subdivide(*tri,level-1)
        for triangle in triangles:
            actual=[polygon[v] if isinstance(v,int) else v for v in triangle]
            subdivide(*actual,3)
        wing_mesh=bpy.data.meshes.new(f'R11_{pair}_{side}');wing_mesh.from_pydata(points,[],indices);wing_mesh.update()
        wing=bpy.data.objects.new(wing_mesh.name,wing_mesh);scene.collection.objects.link(wing);wing_objects.append(wing)
        uv_layer=wing_mesh.uv_layers.new(name='ApprovedWingUV')
        for loop in wing_mesh.loops:uv_layer.data[loop.index].uv=uv_values[loop.vertex_index]
        for face in wing_mesh.polygons:face.use_smooth=True
        mat=bpy.data.materials.new(f'R11_{pair}_Membrane_{side}');mat.use_nodes=True
        nn,ll=mat.node_tree.nodes,mat.node_tree.links
        bs=nn.get('Principled BSDF');bs.inputs['Roughness'].default_value=.36
        bs.inputs['Transmission Weight'].default_value=.24 if pair=='Forewing' else .50
        bs.inputs['IOR'].default_value=1.32
        tx=nn.new('ShaderNodeTexImage');tx.image=original_image
        ll.new(tx.outputs['Color'],bs.inputs['Base Color'])
        ll.new(tx.outputs['Alpha'],bs.inputs['Alpha']);mat.surface_render_method='DITHERED'
        wing_mesh.materials.append(mat)

# Contour-loft the head from the approved reference to retain its silhouette.
# Hidden depth remains an interpretation requiring review, not recovered truth.
head_vertices=[];head_faces=[];head_uv=[];rows=[]
from mathutils.kdtree import KDTree
body_boundary=[v.co.copy() for v in mesh.data.vertices if -.01<v.co.z<.075 and v.co.y<-.18]
boundary_tree=KDTree(len(body_boundary))
for index,point in enumerate(body_boundary):boundary_tree.insert(point,index)
boundary_tree.balance()
for py in range(64,383,6):
    right_limit=int(355+(py-90)*.53) if py>90 else 355
    right_limit=max(250,min(505,right_limit))
    hits=np.nonzero(mask[py,:right_limit]>70)[0]
    if not len(hits):continue
    rows.append((py,int(hits.min()),int(hits.max())))
columns=56
for side in [1,-1]:
    for py,left,right in rows:
        for column in range(columns+1):
            h=column/columns;pixel=(left+(right-left)*h,py)
            u,v=image_uv(pixel)
            depth=side*(.018+.17*math.sin(math.pi*h)**.65)
            distance=1.9-abs(depth)
            position=Vector((depth,(u-.5)*2*distance*math.tan(math.radians(20)),(v-.5)*2*distance*math.tan(math.radians(20))))
            blend=max(0,min(1,(py-352)/24))
            if blend and body_boundary:
                nearest,_,_=boundary_tree.find(position)
                position=position.lerp(nearest,blend)
            head_vertices.append(tuple(position))
            head_uv.append((u,v))
layer=len(rows)*(columns+1)
for side_index in range(2):
    start=side_index*layer
    for row in range(len(rows)-1):
        for column in range(columns):
            v=start+row*(columns+1)+column;quad=(v,v+1,v+columns+2,v+columns+1)
            head_faces.append(quad if not side_index else tuple(reversed(quad)))
for row in range(len(rows)-1):
    for column in [0,columns]:
        v=row*(columns+1)+column;w=(row+1)*(columns+1)+column
        head_faces.append((v,w,w+layer,v+layer))
hm=bpy.data.meshes.new('R11_Approved_Head_Contour_Loft');hm.from_pydata(head_vertices,[],head_faces);hm.update()
head=bpy.data.objects.new(hm.name,hm);scene.collection.objects.link(head);wing_objects.append(head)
uvlayer=hm.uv_layers.new(name='HeadUV')
for loop in hm.loops:uvlayer.data[loop.index].uv=head_uv[loop.vertex_index]
for face in hm.polygons:face.use_smooth=True
mat=bpy.data.materials.new('R11_Approved_Head_Reference');mat.use_nodes=True
nn,ll=mat.node_tree.nodes,mat.node_tree.links;bs=nn.get('Principled BSDF');bs.inputs['Roughness'].default_value=.46
tex=nn.new('ShaderNodeTexImage');tex.image=original_image;ll.new(tex.outputs['Color'],bs.inputs['Base Color']);ll.new(tex.outputs['Alpha'],bs.inputs['Alpha'])
mat.surface_render_method='DITHERED';hm.materials.append(mat)

# Normalize the complete sculpture, with a common transformation for body and wings.
objects=[mesh]+wing_objects
corners=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
lo=Vector(tuple(min(p[i] for p in corners) for i in range(3)))
hi=Vector(tuple(max(p[i] for p in corners) for i in range(3)))
scale=4.2/(hi.z-lo.z)
offset=Vector((-(lo.x+hi.x)*.5*scale,-(lo.y+hi.y)*.5*scale,-lo.z*scale))
for item in objects:
    item.scale*=scale;item.location=item.location*scale+offset
    bpy.ops.object.select_all(action='DESELECT');item.select_set(True);bpy.context.view_layer.objects.active=item
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
mesh.name='ALARM_Approved_Griffin_R11_Draft'
bpy.ops.object.select_all(action='DESELECT')
for item in objects:item.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(args.output/'ALARM_Approved_Griffin_Textured_R11.glb'),export_format='GLB',use_selection=True,export_yup=True)

scene.world.color = (.35, .35, .35)
scene.view_settings.view_transform = 'AgX'
scene.render.resolution_x = 1280; scene.render.resolution_y = 850
scene.render.resolution_percentage = 100; scene.cycles.samples = 32
target_point = Vector((0, 0, 2.1))
for position, power, size in [((10,-8,13),2000,8),((-7,4,10),1400,8),((6,8,12),1800,6)]:
    bpy.ops.object.light_add(type='AREA', location=position)
    light = bpy.context.object; light.data.energy=power; light.data.size=size
    light.rotation_euler=(target_point-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.9*scale+offset.x,offset.y,offset.z))
target_point=offset.copy()
camera=bpy.context.object; camera.rotation_euler=(target_point-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='PERSP'; camera.data.lens=49.45; camera.data.sensor_fit='HORIZONTAL'; scene.camera=camera
scene.render.filepath=str(args.output / 'R11_Textured_Mesh_Front.png')
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(args.output / 'R11_Textured_Mesh_Study.blend'))
