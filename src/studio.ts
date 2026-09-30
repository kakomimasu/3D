import * as THREE from 'three';
import { scores } from './model.ts';
import { createStudent } from './students.ts';
import type { Game, Vec3 } from './types.ts';

// Original broadcast set inspired by programming-contest halls.
export function createStudio(scene: THREE.Scene) {
  const group = new THREE.Group(); scene.add(group);
  const metal = new THREE.MeshStandardMaterial({color:'#24304a',metalness:.65,roughness:.35});
  const dark = new THREE.MeshStandardMaterial({color:'#111a2c',metalness:.35,roughness:.6});
  const silver = new THREE.MeshStandardMaterial({color:'#687b96',metalness:.7,roughness:.3});
  const blue = new THREE.MeshBasicMaterial({color:'#36bcff'});
  const red = new THREE.MeshBasicMaterial({color:'#ff5469'});
  const blueLight=blue.clone(),redLight=red.clone();
  const white = new THREE.MeshBasicMaterial({color:'#c4dcff'});
  function box(w: number,h: number,d: number,x: number,y: number,z: number,material: THREE.Material=dark) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
  }
  function bar(a: Vec3,b: Vec3,r=.055) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,direction.length(),8),silver);
    m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());group.add(m);
  }
  box(29,.4,24,0,-1.12,-2,metal);
  box(16,.4,15,0,-.73,0);
  box(15,.08,.08,0,-.49,7.45,white);
  box(.08,.08,15,-7.45,-.49,0,blueLight);box(.08,.08,15,7.45,-.49,0,redLight);
  box(12,.2,1.2,0,-1.03,10);box(14,.2,1.2,0,-.83,8.9);
  // Freestanding LED wall with a live scoreboard texture.
  box(22,6.3,.45,0,4.1,-10.7,metal);
  box(22,.08,.12,0,7.28,-10.42,white);
  const screenCanvas=document.createElement('canvas');screenCanvas.width=2048;screenCanvas.height=576;
  const texture=new THREE.CanvasTexture(screenCanvas);texture.colorSpace=THREE.SRGBColorSpace;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(21.5,5.9),new THREE.MeshBasicMaterial({map:texture}));screen.position.set(0,4.1,-10.45);group.add(screen);
  // Truss uprights and cross-braced lighting bridge.
  for(const x of [-13,13]) {
    box(1.3,.25,1.3,x,-.8,-10);
    for(const dx of [-.3,.3])bar([x+dx,-.7,-10],[x+dx,9,-10]);
    for(let y=0;y<9;y+=1){bar([x-.3,y,-10],[x+.3,y+1,-10]);bar([x+.3,y,-10],[x-.3,y+1,-10]);}
  }
  for(const y of [8.4,9])bar([-13,y,-10],[13,y,-10]);
  for(let x=-13;x<13;x++)bar([x,8.4,-10],[x+1,9,-10]);
  for(let x=-11;x<=11;x+=3.7){
    box(.6,.5,.8,x,8.15,-9.9,metal);box(.46,.12,.5,x,7.85,-9.7,x<0?blueLight:redLight);
  }
  // 選手席：顔を隠さない低いノートパソコンを各席に配置。
  for(const side of [-1,1]) {
    const color=side<0?blue:red;
    box(3.6,.22,2,side*10,.9,-3,metal);box(3.2,1.8,.3,side*10,-.1,-2.5);
    box(3.2,.14,.06,side*10,.63,-2.32,side<0?blueLight:redLight);
    for(const offset of [-.85,.85]){
      const laptopX=side*10+offset;
      box(.86,.045,.64,laptopX,1.035,-3.59,silver);
      box(.70,.012,.25,laptopX,1.065,-3.53,dark);
      box(.24,.012,.14,laptopX,1.065,-3.78,metal);
      const lid=new THREE.Group();
      lid.position.set(laptopX,1.055,-3.27);
      lid.rotation.x=.38;
      const frame=new THREE.Mesh(new THREE.BoxGeometry(.86,.38,.035),metal);
      frame.position.y=.19;frame.castShadow=true;lid.add(frame);
      const display=new THREE.Mesh(new THREE.PlaneGeometry(.77,.29),dark);
      display.position.set(0,.19,-.019);display.rotation.y=Math.PI;lid.add(display);
      // 画面内の短い行でエディターを表現する。
      for(let line=0;line<4;line++){
        const code=new THREE.Mesh(new THREE.PlaneGeometry(.42-line*.055,.012),color);
        code.position.set(-.08,.28-line*.055,-.021);code.rotation.y=Math.PI;lid.add(code);
      }
      group.add(lid);
      box(.8,.14,.8,side*10+offset,0,-4.4);box(.8,.9,.12,side*10+offset,.45,-4.8);
      box(.08,.8,.08,side*10+offset,-.45,-4.4,silver);
      const student=createStudent({team:side<0?'blue':'red',variant:offset>0?1:0});
      student.position.set(side*10+offset,0,-4.4);group.add(student);
      box(.10,.035,.17,side*10+offset+.48,1.03,-3.66,dark);
    }
  }
  // Side light pillars and distant auditorium seating.
  for(const side of [-1,1])for(const z of [-7,1,6]){
    box(.35,4,.35,side*13.5,1,z,metal);box(.06,3.4,.08,side*13.5,1,z+.2,side<0?blueLight:redLight);
  }
  // 柔らかな床の光だまりと、選手席を照らす補助光。
  const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;
  const glowContext=glowCanvas.getContext('2d');
  if(!glowContext)throw new Error('Canvas 2D unavailable');
  const gradient=glowContext.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(255,255,255,0.85)');
  gradient.addColorStop(.35,'rgba(255,255,255,0.35)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  glowContext.fillStyle=gradient;glowContext.fillRect(0,0,128,128);
  const glowTexture=new THREE.CanvasTexture(glowCanvas);
  const floorGlows: {mesh: THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;phase: number}[]=[];
  const accentLights: THREE.PointLight[]=[];
  for(const side of [-1,1]){
    const color=side<0?'#36bcff':'#ff5469';
    const light=new THREE.PointLight(color,35,14,2);
    light.position.set(side*11,2,1);group.add(light);accentLights.push(light);
    for(const [index,z] of [-7,1,6].entries()){
      const material=new THREE.MeshBasicMaterial({map:glowTexture,color,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending});
      const glow=new THREE.Mesh(new THREE.PlaneGeometry(4,6),material);
      glow.rotation.x=-Math.PI/2;glow.position.set(side*12,-.914,z);group.add(glow);
      floorGlows.push({mesh:glow,phase:index*.8+(side>0?Math.PI:0)});
    }
  }
  let lightTime=0;
  // 同じモデルの形状とマテリアルを共有し、30人分の描画負荷を抑える。
  const spectators=['#709ab5','#be8374','#d3c6a5','#758c79','#a493b8','#c3cad5'].map((shirtColor,variant)=>
    createStudent({team:'blue',variant:variant%2,spectator:true,shirtColor}));
  for(let row=0;row<3;row++)for(const side of [-1,1]){
    const height=1.5+row*.3;
    box(1.65,height,11,side*(17+row*1.7),-2.5+height/2,-.8,dark);
  }
  for(let row=0;row<3;row++)for(const side of [-1,1])for(let i=0;i<5;i++){
    const x=side*(17+row*1.7),z=-5+i*2.1;
    box(.9,.2,1,x,-.25+row*.3,z,metal);box(.15,.95,1,x+side*.4,.15+row*.3,z,metal);
    const person=spectators[(row*5+i+(side>0?3:0))%spectators.length].clone();
    person.position.set(x,-.15+row*.3,z);
    person.rotation.y=-side*Math.PI/2;
    group.add(person);
  }
  let currentGame: Game | null = null;
  const logo = new Image();
  const studio = {
    animate(delta: number, reducedMotion: boolean){
      if(!reducedMotion)lightTime+=delta;
      const wave=(phase: number)=>reducedMotion ? .65 : .5+.5*Math.sin(lightTime*Math.PI/4+phase);
      blueLight.color.copy(blue.color).multiplyScalar(.45+.65*wave(0));
      redLight.color.copy(red.color).multiplyScalar(.45+.65*wave(Math.PI));
      accentLights.forEach((light,index)=>{
        light.intensity=(20+30*wave(index*Math.PI))*group.scale.x**2;
        light.distance=14*group.scale.x;
      });
      for(const {mesh,phase} of floorGlows){
        const pulse=wave(phase);
        mesh.material.opacity=.25+.45*pulse;
        mesh.scale.setScalar(.85+.25*pulse);
      }
    },
    update(game: Game) {
      currentGame = game;
      group.scale.setScalar(Math.max(game.field.width,game.field.height)/12);
      const ctx=screenCanvas.getContext('2d');
      if(!ctx) throw new Error('Canvas 2D unavailable');
      ctx.fillStyle='#071022';ctx.fillRect(0,0,2048,576);
      ctx.strokeStyle='#1d314d';ctx.lineWidth=2;
      for(let x=0;x<2048;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,576);ctx.stroke();}
      ctx.fillStyle='#38bfff';ctx.fillRect(0,0,15,576);ctx.fillStyle='#ff566b';ctx.fillRect(2033,0,15,576);
      ctx.textAlign='center';ctx.fillStyle='#b2c9e3';ctx.font='24px sans-serif';ctx.fillText('KAKOMIMASU  /  COMPETITION STUDIO',1024,58);
      if (logo.complete && logo.naturalWidth) {
        const h=108,w=h*logo.naturalWidth/logo.naturalHeight;
        ctx.drawImage(logo,1024-w/2,76,w,h);
      } else {
        ctx.font='bold 40px sans-serif';ctx.fillStyle='#fff';ctx.fillText('囲みマス',1024,140);
      }
      game.players.forEach((p,i)=>{
        const x=i?1530:518;const score=scores(game,i);
        ctx.fillStyle=i?'#ff7b8b':'#72d1ff';ctx.font='bold 46px sans-serif';ctx.fillText(String(p.name||p.id||(i?'RED':'BLUE')),x,219,760);
        ctx.fillStyle='#fff';ctx.font='bold 150px sans-serif';ctx.fillText(String(score.wall+score.area),x,394);
        ctx.fillStyle='#91a9c5';ctx.font='25px sans-serif';ctx.fillText(`壁 ${score.wall}  /  領域 ${score.area}`,x,457);
      });
      ctx.fillStyle='#66819e';ctx.font='35px sans-serif';ctx.fillText('VS',1024,330);
      ctx.fillStyle='#d1deed';ctx.font='24px sans-serif';ctx.fillText(`TURN ${String(game.turn??0).padStart(2,'0')}  /  ${game.id==='demo'?'DEMO':game.status==='ended'?'RESULT':'MATCH'}`,1024,537);
      texture.needsUpdate=true;
    },
  };
  logo.onload = () => { if (currentGame) studio.update(currentGame); };
  logo.src = `${import.meta.env.BASE_URL}img/kakomimasu-logo.svg`;
  return studio;
}
