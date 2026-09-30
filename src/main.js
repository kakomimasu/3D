import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import { createStudio } from './studio.js';
import { validateGame, streamUrl, scores, demoGame, matchListUrl, matchSummaries } from './model.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true}); }
catch { $('fatal').hidden=false; $('fatal').textContent='3D表示を開始できませんでした。WebGLを利用できるブラウザで開いてください。'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setClearColor('#080e1a'); renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog=new THREE.Fog('#080e1a',60,180);
const camera = new THREE.PerspectiveCamera(38,1,.1,600);
const controls = new OrbitControls(camera,canvas);
controls.enableDamping=true; controls.maxPolarAngle=Math.PI/2-.08; controls.minDistance=5; controls.maxDistance=400;
scene.add(new THREE.HemisphereLight('#c5d9ff','#121b34',1.8));
const sun = new THREE.DirectionalLight('#eaf2ff',3.5); sun.position.set(-8,18,8); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-35; sun.shadow.camera.right=35; sun.shadow.camera.top=35; sun.shadow.camera.bottom=-35; sun.shadow.camera.far=80; sun.shadow.normalBias=.04; scene.add(sun);
const fill = new THREE.DirectionalLight('#7cb6d8',1.2); fill.position.set(8,7,-10); scene.add(fill);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(250,250),new THREE.MeshStandardMaterial({color:'#0c1322',roughness:1})); ground.rotation.x=-Math.PI/2;ground.position.y=-2.5;ground.receiveShadow=true;scene.add(ground);
const board = new THREE.Group(); scene.add(board);
const studio=createStudio(scene);
let game, meshes=[], numberMeshes=[], pawns=[], timer=null, socket=null, connectionTimer=null, demoTurn=1, mode='demo', view='studio';
const materials = ['#43516a','#80c2df','#efada1','#238cca','#cc4561'].map(color => new THREE.MeshStandardMaterial({color,roughness:.72,metalness:.08}));
const tileGeo = new THREE.BoxGeometry(.94,1,.94);
const labelCache = new Map();
function labelTexture(text) {
  if(labelCache.has(text)) return labelCache.get(text);
  const c=document.createElement('canvas');c.width=128;c.height=128;
  const ctx=c.getContext('2d');ctx.font='500 66px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffffff';ctx.fillText(text,64,66);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace; labelCache.set(text,t); return t;
}
function clearBoard() {
  board.traverse(o=>{ if(o.geometry && o.geometry!==tileGeo)o.geometry.dispose(); if(o.material&&!materials.includes(o.material))o.material.dispose(); });
  board.clear(); meshes=[];numberMeshes=[];pawns=[];
  labelCache.forEach(t=>t.dispose()); labelCache.clear();
}
function positionFor(x,y) { return [x-(game.field.width-1)/2,y-(game.field.height-1)/2]; }
function setView(next) {
  view=next; const d=Math.max(game.field.width,game.field.height);
  controls.target.set(0,next==='studio'?d*.12:0,next==='studio'?-d*.16:0);
  const fov = 2*Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*Math.min(camera.aspect,1));
  const distance = (Math.hypot(game.field.width,game.field.height)/2+.6)/Math.sin(fov/2)*(next==='studio'?1.7:1.12);
  camera.position.copy(new THREE.Vector3(...(next==='top'?[0,1,.001]:next==='studio'?[.15,.72,1.5]:[1.05,1.3,1.3])).normalize().multiplyScalar(distance).add(controls.target));
  scene.fog.near=distance+20;scene.fog.far=distance+140;
  controls.update();$('studio').classList.toggle('active',next==='studio');$('angle').classList.toggle('active',next==='angle');$('top').classList.toggle('active',next==='top');
}
function draw(next) {
  validateGame(next);
  const rebuild=!game || game.field.width!==next.field.width || game.field.height!==next.field.height;
  game=next;
  clearBoard();
  const {width,height,points,tiles}=game.field;
  const base=new THREE.Mesh(new THREE.BoxGeometry(width+.7,.6,height+.7),new THREE.MeshStandardMaterial({color:'#253d37',roughness:.65}));base.position.y=-.33;base.receiveShadow=true;base.castShadow=true;board.add(base);
  const latest=game.log?.at(-1)?.players?.flatMap(p=>p.actions??[])??[];
  const conflicts=new Set(latest.filter(a=>a.res>0&&a.res<3).map(a=>a.x+a.y*width));
  tiles.forEach((t,i)=>{
    const x=i%width,y=Math.floor(i/width);const [px,pz]=positionFor(x,y);
    const owned=t.player===0||t.player===1;
    const h=t.type===1&&owned?.30:.12;
    const matIndex=!owned?0:t.type===1?3+t.player:1+t.player;
    const m=new THREE.Mesh(tileGeo,materials[matIndex]);m.position.set(px,h/2,pz);m.scale.y=h;m.receiveShadow=true;m.castShadow=true;m.userData={index:i};board.add(m);meshes.push(m);
    const label=new THREE.Mesh(new THREE.PlaneGeometry(.47,.47),new THREE.MeshBasicMaterial({map:labelTexture(String(points[i])),transparent:true,depthWrite:false,opacity:!owned?.65:.95}));
    label.rotation.x=-Math.PI/2;label.position.set(px,h+.009,pz);label.visible=$('numbers').checked;board.add(label);numberMeshes.push(label);
    if(conflicts.has(i)){const ring=new THREE.Mesh(new THREE.RingGeometry(.33,.41,32),new THREE.MeshBasicMaterial({color:'#aafc88',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(px,h+.025,pz);board.add(ring);}
  });
  game.players.forEach((p,pid)=>{
    p.agents.forEach((a,aid)=>{
      if(a.x<0||a.y<0)return;
      const [x,z]=positionFor(a.x,a.y),h=meshes[a.x+a.y*width].scale.y;
      const g=new THREE.Group();
      const material=new THREE.MeshStandardMaterial({color:pid?'#ffb6a3':'#91d7ff',roughness:.3,metalness:.2});
      const body=new THREE.Mesh(new THREE.CylinderGeometry(.12,.21,.42,24),material);body.position.y=.21;body.castShadow=true;g.add(body);
      const head=new THREE.Mesh(new THREE.SphereGeometry(.145,24,16),material);head.position.y=.49;head.castShadow=true;g.add(head);
      const foot=new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,.055,32),new THREE.MeshStandardMaterial({color:pid?'#ff735c':'#4daedb'}));foot.position.y=.027;g.add(foot);
      g.position.set(x,h+.015,z);g.userData={pid,aid};board.add(g);pawns.push(g);
    });
    const score=scores(game,pid);$('score'+pid).textContent=score.wall+score.area;$('detail'+pid).textContent=`壁 ${score.wall}  /  領域 ${score.area}`;
    $('name'+pid).textContent=p.name||p.id|| (pid?'RED':'BLUE');
  });
  $('turn').textContent=`TURN ${String(game.turn??game.log?.length??0).padStart(2,'0')}${game.ending||game.status==='ended'?' / END':''}`;
  studio.update(game);
  if(rebuild)setView(view);
}
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
canvas.addEventListener('pointermove',e=>{
  const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);
  const hit=raycaster.intersectObjects(meshes)[0];
  if(!hit){$('tile-info').textContent='マスにカーソルを合わせると詳細を表示';return;}
  const i=hit.object.userData.index,t=game.field.tiles[i];
  $('tile-info').textContent=`(${i%game.field.width}, ${Math.floor(i/game.field.width)})   /   ${game.field.points[i]} 点   /   ${t.player!==0&&t.player!==1?'中立':(t.player?'RED':'BLUE')+' · '+(t.type===1?'壁':'領域')}`;
});
function stopDemo(){clearInterval(timer);timer=null;$('play').textContent='▶ デモを再生';}
function closeStream(){socket?.close();socket=null;clearTimeout(connectionTimer);}
function step(){demoTurn=demoTurn%12+1;draw(demoGame(demoTurn));}
$('play').onclick=()=>{if(timer){stopDemo();return;}timer=setInterval(step,1100);$('play').textContent='Ⅱ 一時停止';};
$('step').onclick=()=>{stopDemo();step();};
$('studio').onclick=()=>setView('studio');
$('angle').onclick=()=>setView('angle');$('top').onclick=()=>setView('top');$('reset').onclick=()=>setView('studio');
$('numbers').onchange=()=>numberMeshes.forEach(m=>m.visible=$('numbers').checked);
function showDemo(){closeStream();stopDemo();mode='demo';demoTurn=1;draw(demoGame());$('play').disabled=false;$('step').disabled=false;$('connection').textContent='デモ表示';$('match-title').textContent='サンプル対戦';$('message').textContent='青と赤の壁、淡い色の囲み領域を表示します。';history.replaceState(null,'',location.pathname);}
$('demo').onclick=showDemo;
function connect(id){
  $('game-id').value=id;
  closeStream();stopDemo();mode='live';$('play').disabled=true;$('step').disabled=true;$('connection').textContent='接続中…';$('message').textContent='対戦データを待っています。盤面は受信後に切り替わります。';
  const s=new EventSource(streamUrl(id));socket=s;let received=false;
  connectionTimer=setTimeout(()=>{if(!received){$('connection').textContent='データ未受信';$('message').textContent='対戦が見つかりません。IDと通信状況を確認してください。';}},15000);
  s.onmessage=e=>{
    if(socket!==s)return;
    try{
      const data=JSON.parse(e.data);
      const candidate=data.type==='initial'?data.games?.find(g=>g.id===id):data.game;
      if(!candidate||candidate.id!==id)return;
      draw(candidate);received=true;clearTimeout(connectionTimer);$('connection').textContent=candidate.ending||candidate.status==='ended'?'対戦終了':'観戦中';$('match-title').textContent=candidate.status==='ended'?'終了した対戦':'ライブ対戦';$('message').textContent='対戦の更新を自動で反映しています。';
      const url=new URL(location.href);url.searchParams.set('id',id);history.replaceState(null,'',url);
    }catch(err){$('connection').textContent='データ読込エラー';$('message').textContent=err.message;}
  };
  s.onerror=()=>{if(socket===s){$('connection').textContent='再接続中…';$('message').textContent='接続が途切れました。自動で再接続します。表示中の盤面は最後に受信した状態です。';}};
}
$('connect').onsubmit=e=>{e.preventDefault();const id=$('game-id').value.trim();if(id)connect(id);};
new ResizeObserver(()=>{const {width,height}=canvas.parentElement.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(game)setView(view);}).observe(canvas.parentElement);
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
draw(demoGame());
const id=new URLSearchParams(location.search).get('id');if(id){$('game-id').value=id;connect(id);}
window.addEventListener('pagehide',()=>{closeStream();stopDemo();renderer.setAnimationLoop(null);});

// The public stream provides the latest match list in its initial event.
// Close the list stream after that snapshot; only the selected match stays live.
let listSource = null, listTimeout = null;
const gamesDialog = $('games-dialog');
function stopListRequest() {
  listSource?.close(); listSource = null;
  clearTimeout(listTimeout);
  $('refresh-games').disabled = false;
  $('games-list').setAttribute('aria-busy', 'false');
}
function loadGames() {
  stopListRequest();
  $('games-list').replaceChildren();
  $('games-list').setAttribute('aria-busy', 'true');
  $('games-status').textContent = 'ゲーム一覧を読み込み中…';
  $('refresh-games').disabled = true;
  const source = new EventSource(matchListUrl());
  listSource = source;
  const fail = message => {
    if (listSource !== source) return;
    stopListRequest(); $('games-status').textContent = message;
  };
  listTimeout = setTimeout(() => fail('読み込みがタイムアウトしました。「更新」で再試行できます。'), 15000);
  source.onerror = () => fail('一覧を取得できませんでした。通信状況を確認して「更新」を押してください。');
  source.onmessage = event => {
    if (listSource !== source) return;
    try {
      const data = JSON.parse(event.data);
      if (data.type !== 'initial') return;
      const matches = matchSummaries(data.games);
      const fragment = document.createDocumentFragment();
      matches.forEach(match => {
        const button = document.createElement('button');
        button.className = 'game-card';
        if (mode === 'live' && game?.id === match.id) button.setAttribute('aria-current', 'true');
        const heading = document.createElement('strong'); heading.textContent = match.name;
        const players = document.createElement('span'); players.className = 'game-players'; players.textContent = match.players;
        const meta = document.createElement('span'); meta.className = 'game-meta';
        const date = match.startedAt == null ? '開始日時未定' : new Date(match.startedAt * 1000).toLocaleString('ja-JP', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', year:'numeric'});
        meta.textContent = `${match.status} · ${date} · ${match.turn}ターン`;
        const id = document.createElement('small'); id.textContent = `ID: ${match.id}`;
        button.append(heading, players, meta, id);
        button.onclick = () => { gamesDialog.close(); connect(match.id); };
        fragment.append(button);
      });
      $('games-list').replaceChildren(fragment);
      $('games-status').textContent = matches.length ? `最近の${matches.length}件 · ゲームを選ぶと観戦を開始します` : '公開されているゲームはありません。';
      stopListRequest();
    } catch { fail('一覧データを読み取れませんでした。「更新」で再試行できます。'); }
  };
}
$('open-games').onclick = () => { gamesDialog.showModal(); loadGames(); };
$('close-games').onclick = () => gamesDialog.close();
$('refresh-games').onclick = loadGames;
gamesDialog.addEventListener('close', stopListRequest);
window.addEventListener('pagehide', stopListRequest);
