import * as THREE from 'three';
import { scores } from './model.js';

// Original broadcast set inspired by programming-contest halls.
export function createStudio(scene) {
  const group = new THREE.Group(); scene.add(group);
  const metal = new THREE.MeshStandardMaterial({color:'#24304a',metalness:.65,roughness:.35});
  const dark = new THREE.MeshStandardMaterial({color:'#111a2c',metalness:.35,roughness:.6});
  const silver = new THREE.MeshStandardMaterial({color:'#687b96',metalness:.7,roughness:.3});
  const blue = new THREE.MeshBasicMaterial({color:'#36bcff'});
  const red = new THREE.MeshBasicMaterial({color:'#ff5469'});
  const white = new THREE.MeshBasicMaterial({color:'#c4dcff'});
  function box(w,h,d,x,y,z,material=dark) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
  }
  function bar(a,b,r=.055) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,direction.length(),8),silver);
    m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());group.add(m);
  }
  box(29,.4,24,0,-1.12,-2,metal);
  box(16,.4,15,0,-.73,0);
  box(15,.08,.08,0,-.49,7.45,white);
  box(.08,.08,15,-7.45,-.49,0,blue);box(.08,.08,15,7.45,-.49,0,red);
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
    box(.6,.5,.8,x,8.15,-9.9,metal);box(.46,.12,.5,x,7.85,-9.7,x<0?blue:red);
  }
  // Team stations: desk, two monitors and chairs on either side.
  for(const side of [-1,1]) {
    const color=side<0?blue:red;
    box(3.6,.22,2,side*10,.9,-3,metal);box(3.2,1.8,.3,side*10,-.1,-2.5);
    box(3.2,.14,.06,side*10,.63,-2.32,color);
    for(const offset of [-.85,.85]){
      box(1.25,.85,.09,side*10+offset,1.7,-3.1);box(1.1,.65,.015,side*10+offset,1.72,-3.04,color);
      box(.08,.4,.1,side*10+offset,1.1,-3.1,silver);
      box(.8,.14,.8,side*10+offset,0,-4.4);box(.8,.9,.12,side*10+offset,.45,-4.8);
      box(.08,.8,.08,side*10+offset,-.45,-4.4,silver);
    }
  }
  // Side light pillars and distant auditorium seating.
  for(const side of [-1,1])for(const z of [-7,1,6]){
    box(.35,4,.35,side*13.5,1,z,metal);box(.06,3.4,.08,side*13.5,1,z+.2,side<0?blue:red);
  }
  for(let row=0;row<3;row++)for(const side of [-1,1])for(let i=0;i<5;i++){
    const x=side*(17+row*1.7),z=-5+i*2.1;
    box(.9,.2,1,x,-.25+row*.3,z,metal);box(.15,.95,1,x+side*.4,.15+row*.3,z,metal);
  }
  let currentGame = null;
  const logo = new Image();
  const studio = {
    update(game) {
      currentGame = game;
      group.scale.setScalar(Math.max(game.field.width,game.field.height)/12);
      const ctx=screenCanvas.getContext('2d');
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
