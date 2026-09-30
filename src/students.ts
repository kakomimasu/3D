import * as THREE from 'three';
import type { Vec3 } from './types.ts';

// Seated, stylized students facing +Z toward the keyboard and monitor.
export function createStudent({team, variant = 0, spectator = false, shirtColor}: {team: 'blue' | 'red'; variant?: number; spectator?: boolean; shirtColor?: THREE.ColorRepresentation}) {
  const person = new THREE.Group();
  const material = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({color,roughness:.85});
  const skin = material(variant ? '#e6b28f' : '#f2c6a2');
  const hair = material(variant ? '#44322e' : '#20232c');
  const shirt = material(shirtColor ?? (variant ? '#d5dce5' : team === 'blue' ? '#5b9dcc' : '#cb6d80'));
  const trousers = material('#28364b'), shoes = material('#eeeeeb'), ink = material('#202736');
  const accent = material(team === 'blue' ? '#48bfff' : '#ff6479');
  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, x: number,y: number,z: number) {
    const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;person.add(m);return m;
  }
  function sphere(mat: THREE.Material,x: number,y: number,z: number,sx: number,sy: number,sz: number) {
    const m=mesh(new THREE.SphereGeometry(1,16,12),mat,x,y,z);m.scale.set(sx,sy,sz);return m;
  }
  function limb(mat: THREE.Material,a: Vec3,b: Vec3,r: number) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start);
    const m=mesh(new THREE.CylinderGeometry(r,r,v.length(),12),mat,0,0,0);
    m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
  }
  sphere(trousers,0,.18,.04,.3,.19,.24);
  const torso=mesh(new THREE.CylinderGeometry(.27,.3,.7,16),shirt,0,.65,.08);torso.scale.z=.72;torso.rotation.x=.08;
  sphere(shirt,0,.94,-.04,.25,.15,.19); // Hood/collar behind the neck.
  limb(skin,[0,.95,.12],[0,1.1,.15],.1);
  sphere(skin,0,1.29,.17,.24,.28,.225);
  sphere(hair,0,1.43,.13,.25,.17,.23);
  sphere(hair,variant?-.17:.17,1.33,.1,.1,.2,.2);
  if(variant) sphere(hair,0,1.21,-.07,.22,.25,.11);
  for(const x of [-.085,.085]) sphere(ink,x,1.3,.377,.019,.025,.012);
  sphere(skin,0,1.23,.398,.035,.04,.045);
  // Lanyard and participant badge.
  for(const side of [-1,1]){
    if(!spectator) limb(accent,[side*.13,.97,.235],[0,.61,.285],.012);
    if(spectator){
      limb(shirt,[side*.25,.87,.13],[side*.32,.43,.2],.105);
      limb(shirt,[side*.32,.43,.2],[side*.19,.31,.47],.085);
      sphere(skin,side*.19,.29,.49,.085,.05,.10);
    }else{
    limb(shirt,[side*.25,.87,.13],[side*.36,1.1,.32],.105);
    limb(shirt,[side*.36,1.1,.32],[side*.22,1.08,.66],.085);
    sphere(skin,side*.21,1.065,.72,.085,.045,.10);
    }
    limb(trousers,[side*.17,.18,.06],[side*.19,.05,.5],.12);
    limb(trousers,[side*.19,.05,.5],[side*.19,-.68,.54],.10);
    sphere(shoes,side*.19,-.74,.66,.13,.09,.23);
  }
  if(!spectator){
  mesh(new THREE.BoxGeometry(.17,.22,.025),shoes,0,.53,.3);
  mesh(new THREE.BoxGeometry(.13,.045,.028),accent,0,.585,.316);
  }
  return person;
}
