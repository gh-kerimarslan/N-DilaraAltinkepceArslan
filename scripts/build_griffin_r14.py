"""Reuse an abandoned office plaza as ALARM's inhabited observation base.

The approved R13 marble character is kept intact. Only the environment changes:
one five-channel facade billboard, an open lobby, and an interior overview.
"""
import math
import numpy as np
import build_griffin_r13 as previous
from build_griffin_r13 import GLB, Geometry

RNG = np.random.default_rng(1402076)


def base():
    m = GLB.__new__(GLB)
    m.b = bytearray()
    m.g = {'asset': {'version': '2.0', 'generator': 'ALARM R14 reoccupied office plaza'},
           'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [],
           'materials': [], 'buffers': [{'byteLength': 0}], 'bufferViews': [], 'accessors': []}
    palette = [
        ('Dust',(.32,.285,.235),.99,0),('Square',(.25,.255,.245),.97,0),
        ('Concrete',(.37,.385,.375),.96,0),('Steel',(.095,.105,.105),.84,.22),
        ('Dark_Glass',(.045,.065,.073),.76,.13),('Dull_Glass',(.095,.118,.12),.86,.10),
        ('Black_Cases',(.012,.018,.016),.91,0),('Canvas',(.16,.195,.165),1,0),
        ('Reused_Metal',(.21,.235,.22),.88,.16),('Warm_Interior',(.49,.46,.385),.94,0),
        ('Cable',(.025,.03,.027),.98,0),('Quiet_Light',(.65,.78,.61),.85,0)]
    for name,color,rough,metal in palette:
        mat={'name':'ALARM_R14_'+name,'doubleSided':True,'pbrMetallicRoughness':{
             'baseColorFactor':[*color,1],'roughnessFactor':rough,'metallicFactor':metal}}
        if name=='Quiet_Light':
            mat['emissiveFactor']=[.18,.24,.15]
        m.g['materials'].append(mat)
    geo=[Geometry() for _ in palette]
    def box(mat,c,s,col=(1,1,1,1)):
        geo[mat].box(c,s,col)
    def rod(a,b,r=.028,mat=10):
        a,b=np.array(a,float),np.array(b,float)
        tangent=b-a;tangent/=np.linalg.norm(tangent)
        axis=np.cross(tangent,[0,1,0] if abs(tangent[1])<.95 else [1,0,0]);axis/=np.linalg.norm(axis)
        other=np.cross(tangent,axis)
        ring=[r*(axis*math.cos(k*2*math.pi/6)+other*math.sin(k*2*math.pi/6)) for k in range(6)]
        for k in range(6):
            q=(k+1)%6
            geo[mat].polygon([a+ring[k],b+ring[k],b+ring[q],a+ring[q]])
    def screen(name,x,y,z,w,h,u0=0,u1=1):
        points=[[x-w/2,y-h/2,z],[x+w/2,y-h/2,z],[x+w/2,y+h/2,z],[x-w/2,y+h/2,z]]
        m.mesh(name,[m.primitive(points,[[0,1,2],[0,2,3]],6,uv=[[u0,1],[u1,1],[u1,0],[u0,0]])])

    # The same low circular slab and marble griffin remain the front-of-house marker.
    for k in range(96):
        a,b=k*2*math.pi/96,(k+1)*2*math.pi/96
        p=[3.6*math.cos(a),.146,3.6*math.sin(a)];q=[3.6*math.cos(b),.146,3.6*math.sin(b)]
        geo[2].polygon([[0,.146,0],q,p],[1.13,1.13,1.10,1])
        geo[2].polygon([p,q,[q[0],.008,q[2]],[p[0],.008,p[2]]],[1.13,1.13,1.10,1])
    for x in np.arange(-160,160,8):
        for z in np.arange(-160,160,8):
            shade=RNG.uniform(.92,1.03)
            geo[0].polygon([[x,-.04,z],[x,-.04,z+8],[x+8,-.04,z+8],[x+8,-.04,z]],[shade]*3+[1])
    box(1,[-2,-.045,-1],[36,.10,30])
    box(1,[0,-.035,0],[12,.035,160])
    box(1,[0,-.037,6],[160,.035,10])
    # Square joints stop at the circular base; they do not cross its surface.
    for x in np.arange(-19,17,3):
        box(3,[x,.007,-1],[.015,.006,30],[.63]*3+[1])
    for z in np.arange(-16,15,3):
        box(3,[-2,.006,z],[36,.006,.014],[.63]*3+[1])
    for x in [-6.4,6.4]:
        box(2,[x,.025,28],[.24,.13,38],[.80,.81,.78,1])

    # Headquarters podium: a real opening, room depth, columns and a distant screen.
    # Front z=-7.5; entrance x=2.8..8.2. No opaque facade is placed across the door.
    front,back=-7.5,-18.0
    geo[2].weathered_box([-8.1,2.95,front], [21.8,5.9,.48], [.88,.90,.88,1])
    geo[2].weathered_box([8.85,2.95,front], [1.3,5.9,.48], [.88,.90,.88,1])
    geo[2].weathered_box([5.5,5.28,front], [5.4,1.24,.48], [.88,.90,.88,1])
    box(2,[-18.9,3,-12.7],[.4,6,10.5]);box(2,[9.4,3,-12.7],[.4,6,10.5])
    box(2,[-4.7,3,back],[28.5,6,.4]);box(2,[-4.7,6.03,-12.7],[29,.28,11.2])
    box(9,[-4.7,.035,-12.7],[28,.10,10.4])
    # The reused entrance is reinforced in plain metal, with warm practical lights.
    for x in [2.79,8.21]:
        box(3,[x,2.3,-7.19],[.15,4.6,.25])
    box(3,[5.5,4.6,-7.19],[5.55,.16,.25])
    for x in [3.15,7.85]:
        box(11,[x,3.98,-7.04],[.08,.30,.06])
    box(2,[5.5,.07,-8.2],[5.1,.10,1.5])
    for x in [-15.5,-9,-2.5,8.7]:
        box(2,[x,2.75,-12.7],[.45,5.5,.45])
    # A quiet lobby workbench, server cabinets and a notice-light strip.
    box(8,[.8,.92,-12.0],[3.2,.11,1.0])
    for x in [-.55,2.15]:
        box(3,[x,.46,-12.0],[.10,.92,.75])
    for x in [-2.8,-1.7]:
        box(3,[x,1.05,-15.3],[.9,2.1,.8])
        for y in np.arange(.3,1.9,.22):
            box(8,[x,y,-14.89],[.73,.035,.016])
    box(11,[5.3,4.9,-11],[3.8,.035,.10])
    # Large indoor overview, visible on the sightline through the open entrance.
    box(6,[4.85,2.65,-13.15],[6.7,3.25,.16])
    screen('ALARM_R14_Interior_Overview',4.85,2.65,-13.05,6.45,3.0)
    # ONE physical billboard, with five independent channel hit regions on its face.
    bx,by,bz,bw,bh=-11.3,3.8,-7.17,12.0,2.9
    box(6,[bx,by,bz-.03],[bw+.28,bh+.28,.22])
    for i,channel in enumerate(['moloch','cheetah','cockroach','raven','gorilla']):
        screen('ALARM_R14_Channel_'+channel,bx-bw/2+bw*(i+.5)/5,by,bz+.09,bw/5,bh,i/5,(i+1)/5)
    # The history screen is now part of the entrance facade as an archive panel.
    box(6,[.65,2.12,-7.11],[1.15,2.7,.20])
    screen('ALARM_R14_Dikey_Arsiv_Ekrani',.65,2.12,-6.99,.97,2.50)
    # Old institutional signage and a smaller reused-base plate.
    screen('ALARM_R14_Exchange_Sign',-8.0,5.55,-7.235,19,.58)
    box(6,[5.5,4.94,-7.20],[4.3,.30,.035])
    # Subtle runoff and faded plaster are vertex colors on the wall itself.
    for i,point in enumerate(geo[2].vertices):
        x,y,z=point
        if abs(z+7.26)<.001 and -19.1<x<9.6:
            stain=.87+.08*math.sin(x*1.1+y*.5)+.04*math.sin(x*3.2+y*.7)
            stain-=.10*max(0,math.sin(x*4+1))**12*min(1,y/3)
            c=geo[2].colors[i]
            geo[2].colors[i]=[v*stain for v in c[:3]]+[1]
    for x in [-18.1,-3.3,1.7,8.9]:
        for j in range(4):
            y=.25+j*.27
            box(2,[x,y,-7.23],[.65 if j%2 else .88,.22,.05],[.61,.63,.60,1])

    # Small visible adaptations: cables, patched sunshade, storage, roof solar racks.
    for a,b in [([-17,.05,-7.0],[-17,.05,-4.8]),([-17,.05,-4.8],[8.5,.05,-4.8]),
                ([8.5,.05,-4.8],[8.5,.05,-7]),([-17,2.7,-7.01],[-17,.05,-7.01])]:
        rod(a,b,.025)
    for x in [10.3,13.7]:
        rod([x,0,-9],[x,2.5,-9],.045,8);rod([x,0,-13],[x,2.9,-13],.045,8)
    geo[7].polygon([[10.1,2.52,-8.8],[14.0,2.52,-8.8],[14.0,2.93,-13.3],[10.1,2.93,-13.3]])
    for x,z in [(11,-10),(12.2,-10.4),(12.7,-11.9)]:
        box(8,[x,.48,z],[.9,.96,.80])
        box(3,[x,.98,z],[.94,.07,.84])
    for x in [-15,-11.5,-8]:
        box(3,[x,6.42,-11.2],[2.8,.10,3.4])
        for k in range(4):
            box(4,[x-.99+k*.66,6.48,-11.2],[.61,.03,3.23])
    for x in [11,13]:
        for z in [-5.3,-6.6]:
            box(8,[x,.30,z],[1.1,.60,.9])
            for dx in [-.42,.42]:
                box(3,[x+dx,.32,z],[.07,.68,.96])

    # Office towers surround the reoccupied podium. Quiet, intact, unlit facades.
    towers=[(-9,-23,15,11,32),(13,-26,9,12,39),(-27,-19,10,12,27),
            (-32,-40,13,13,49),(30,-34,13,13,44),(7,-51,15,12,54),
            (-45,-8,13,14,37),(43,-6,12,14,42),(-29,23,12,11,30),
            (30,22,13,12,36),(-47,32,14,14,46),(51,29,15,13,48)]
    for index,(x,z,w,d,h) in enumerate(towers):
        tint=RNG.uniform(.73,1.04);color=[tint,tint*.98,tint*.93,1]
        box(2,[x,h/2,z],[w,h,d],color)
        # Set-back upper mass leaves an ordinary podium rather than a ruined silhouette.
        box(3,[x,h+.20,z],[w+.15,.40,d+.15])
        floors=math.floor(h/3.1)
        for side in [-1,1]:
            for iy in range(floors):
                y=1.8+iy*3.1
                for ux in np.arange(-w/2+.75,w/2-.4,1.55):
                    panel=4 if RNG.random()<.72 else 5
                    dirty=RNG.uniform(.65,1.18)
                    box(panel,[x+ux,y,z+side*(d/2+.018)],[1.32,2.55,.035],[dirty]*3+[1])
                for uz in np.arange(-d/2+.75,d/2-.4,1.55):
                    panel=4 if RNG.random()<.72 else 5
                    dirty=RNG.uniform(.65,1.18)
                    box(panel,[x+side*(w/2+.018),y,z+uz],[.035,2.55,1.32],[dirty]*3+[1])
            for y in np.arange(.35,h,3.1):
                box(3,[x,y,z+side*(d/2+.04)],[w+.10,.10,.07])
                box(3,[x+side*(w/2+.04),y,z],[.07,.10,d+.10])
        # Only some towers still carry their old, dark advertising mounts.
        if index in [1,2,7,8]:
            face=z+d/2+.10
            box(3,[x,5.5,face],[w*.74,3.3,.22])
            box(5,[x,5.5,face+.12],[w*.70,3.0,.03],[.42,.43,.39,1])
    # Weathering lives mostly at ground level, not in spectacular destruction.
    for _ in range(85):
        x=RNG.uniform(-22,20);z=RNG.uniform(-22,19)
        if math.hypot(x,z)<5 or (2.5<x<8.5 and -15<z<-5):
            continue
        size=RNG.uniform(.05,.19)
        box(2,[x,size*.23,z],[size*1.8,size*.46,size])
    for _ in range(35):
        x=RNG.uniform(-20,18);z=RNG.uniform(-17,17)
        if math.hypot(x,z)<4.5:
            continue
        p=np.array([x,.012,z])
        for j in range(RNG.integers(2,5)):
            q=p+[RNG.uniform(.10,.5),0,RNG.uniform(-.24,.24)]
            geo[3].polygon([p,q,q+[0,0,.008],p+[0,0,.008]])
            p=q
    for i,item in enumerate(geo):
        if item.vertices:
            m.mesh('ALARM_R14_'+palette[i][0],[m.primitive(item.vertices,item.faces,i,colors=item.colors)])
    m.save('base-r14.glb')


if __name__=='__main__':
    previous.previous.character()
    previous.previous.observatory()
    previous.marble()
    previous.city()
    base()
