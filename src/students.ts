import * as THREE from "three";
import type { Vec3 } from "./types.ts";

// Stable outfits keep each person's appearance consistent between renders.
const outfits = [
  {
    style: "hoodie",
    top: "#579ac4",
    pants: "#263950",
    shoes: "#eee9de",
    trim: "#e4d9be",
  },
  {
    style: "jacket",
    top: "#bf805d",
    pants: "#3e4656",
    shoes: "#634a3c",
    trim: "#fff0d4",
  },
  {
    style: "stripe",
    top: "#eee2c9",
    pants: "#54706f",
    shoes: "#f5eee3",
    trim: "#426279",
  },
  {
    style: "vest",
    top: "#8a729e",
    pants: "#34384b",
    shoes: "#b99267",
    trim: "#eee4d5",
  },
  {
    style: "tee",
    top: "#709477",
    pants: "#c2ad85",
    shoes: "#35483b",
    trim: "#edce83",
  },
  {
    style: "sweater",
    top: "#cc7885",
    pants: "#495b79",
    shoes: "#f1dcc1",
    trim: "#823f56",
  },
  {
    style: "jacket",
    top: "#597e99",
    pants: "#b7a083",
    shoes: "#ece3d0",
    trim: "#d9b761",
  },
  {
    style: "tee",
    top: "#cfaa57",
    pants: "#414952",
    shoes: "#9b554b",
    trim: "#faf0d3",
  },
  {
    style: "hoodie",
    top: "#779e96",
    pants: "#615268",
    shoes: "#dedce8",
    trim: "#e9d9b8",
  },
  {
    style: "stripe",
    top: "#b98475",
    pants: "#474b68",
    shoes: "#ead8bd",
    trim: "#f0d9b2",
  },
  {
    style: "sweater",
    top: "#9aabc1",
    pants: "#75654d",
    shoes: "#424350",
    trim: "#e3e8ed",
  },
  {
    style: "vest",
    top: "#8c985e",
    pants: "#364e64",
    shoes: "#725243",
    trim: "#f0e0be",
  },
] as const;

// Hair and accessories vary independently of the six garment shapes.
const appearances = [
  { hair: "short", color: "#242632", accessory: "glasses" },
  { hair: "bob", color: "#654336", accessory: "headphones" },
  { hair: "ponytail", color: "#342b32", accessory: "none" },
  { hair: "curly", color: "#805b3d", accessory: "glasses" },
  { hair: "bun", color: "#352d29", accessory: "none" },
  { hair: "swept", color: "#544038", accessory: "headphones" },
  { hair: "curly", color: "#302b30", accessory: "none" },
  { hair: "ponytail", color: "#87623f", accessory: "glasses" },
  { hair: "swept", color: "#36323d", accessory: "none" },
  { hair: "bun", color: "#72503d", accessory: "headphones" },
  { hair: "short", color: "#685147", accessory: "none" },
  { hair: "bob", color: "#302c37", accessory: "glasses" },
] as const;

// Seated, stylized students facing +Z toward the keyboard and monitor.
export function createStudent(
  { team, variant = 0, spectator = false, shirtColor, outfit = variant }: {
    team: "blue" | "red";
    variant?: number;
    spectator?: boolean;
    shirtColor?: THREE.ColorRepresentation;
    outfit?: number;
  },
) {
  const person = new THREE.Group();
  const material = (color: THREE.ColorRepresentation) =>
    new THREE.MeshStandardMaterial({ color, roughness: .85 });
  const skin = material(variant ? "#e6b28f" : "#f2c6a2");
  const appearance = appearances[
    ((outfit % appearances.length) + appearances.length) % appearances.length
  ];
  const hair = material(appearance.color);
  const look =
    outfits[((outfit % outfits.length) + outfits.length) % outfits.length];
  person.name = `student-${look.style}-${appearance.hair}-${outfit}`;
  const shirt = material(shirtColor ?? look.top);
  const trim = material(look.trim);
  const trousers = material(look.pants),
    shoes = material(look.shoes),
    ink = material("#202736");
  const badge = material("#f4f1e8");
  const accent = material(team === "blue" ? "#48bfff" : "#ff6479");
  function mesh(
    geometry: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const m = new THREE.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    person.add(m);
    return m;
  }
  function sphere(
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) {
    const m = mesh(new THREE.SphereGeometry(1, 16, 12), mat, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  }
  function limb(mat: THREE.Material, a: Vec3, b: Vec3, r: number) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      v = end.clone().sub(start);
    const m = mesh(
      new THREE.CylinderGeometry(r, r, v.length(), 12),
      mat,
      0,
      0,
      0,
    );
    m.position.copy(start.add(end).multiplyScalar(.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  }
  // Group finished parts around joints, preserving their original resting pose.
  function joint(name: string, pivot: Vec3, parts: THREE.Object3D[]) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...pivot);
    for (const part of parts) {
      part.position.sub(group.position);
      group.add(part);
    }
    person.add(group);
    return group;
  }
  sphere(trousers, 0, .18, .04, .3, .19, .24);
  const seatedParts = new Set(person.children);
  const torso = mesh(
    new THREE.CylinderGeometry(.27, .3, .7, 16),
    shirt,
    0,
    .65,
    .08,
  );
  torso.scale.z = .72;
  torso.rotation.x = .08;
  // Garment details wrap around the body so they also read from the side seats.
  function band(y: number, height: number, mat: THREE.Material) {
    const radius = .3 - (y - .3) / .7 * .03;
    const m = mesh(
      new THREE.CylinderGeometry(radius + .004, radius + .006, height, 16),
      mat,
      0,
      y,
      .08,
    );
    m.scale.z = .73;
    m.rotation.x = .08;
  }
  if (look.style === "hoodie") {
    sphere(shirt, 0, .94, -.04, .25, .15, .19);
    mesh(new THREE.BoxGeometry(.27, .12, .035), trim, 0, .43, .298);
    for (const side of [-1, 1]) {
      limb(trim, [side * .075, .96, .25], [side * .085, .76, .29], .012);
    }
  } else if (look.style === "jacket") {
    mesh(new THREE.BoxGeometry(.19, .53, .03), trim, 0, .7, .293);
    for (const side of [-1, 1]) {
      limb(shirt, [side * .10, .98, .23], [side * .16, .76, .29], .05);
      mesh(new THREE.BoxGeometry(.09, .10, .035), trim, side * .19, .67, .26);
    }
  } else if (look.style === "stripe") {
    for (const y of [.42, .58, .74, .90]) band(y, .055, trim);
  } else if (look.style === "vest") {
    for (const side of [-1, 1]) {
      limb(trim, [side * .13, .98, .21], [0, .78, .30], .025);
    }
    band(.34, .06, trim);
  } else if (look.style === "sweater") {
    band(.35, .07, trim);
    sphere(trim, 0, .98, .085, .14, .065, .12);
    band(.77, .12, trim);
  } else {
    mesh(new THREE.BoxGeometry(.10, .11, .025), trim, -.13, .79, .286);
  }
  limb(skin, [0, .95, .12], [0, 1.1, .15], .1);
  const headStart = person.children.length;
  sphere(skin, 0, 1.29, .17, .24, .28, .225);
  sphere(hair, 0, 1.43, .13, .25, .17, .23);
  if (appearance.hair === "short") {
    sphere(hair, .18, 1.37, .10, .075, .13, .18);
    sphere(hair, -.06, 1.49, .29, .17, .075, .10);
  } else if (appearance.hair === "bob") {
    sphere(hair, 0, 1.24, -.025, .245, .25, .15);
    for (const side of [-1, 1]) {
      sphere(hair, side * .205, 1.25, .105, .075, .235, .18);
    }
  } else if (appearance.hair === "ponytail") {
    sphere(hair, 0, 1.41, -.105, .12, .13, .15);
    const tail = sphere(hair, 0, 1.19, -.20, .13, .28, .13);
    tail.rotation.x = -.30;
    sphere(trim, 0, 1.40, -.19, .125, .045, .07);
  } else if (appearance.hair === "curly") {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      sphere(
        hair,
        Math.cos(angle) * .20,
        1.46 + (i % 2) * .035,
        .13 + Math.sin(angle) * .17,
        .105,
        .12,
        .105,
      );
    }
    sphere(hair, 0, 1.59, .12, .16, .105, .14);
  } else if (appearance.hair === "bun") {
    sphere(hair, 0, 1.37, -.025, .23, .20, .15);
    sphere(trim, 0, 1.58, .055, .12, .04, .105);
    sphere(hair, 0, 1.68, .025, .145, .13, .13);
  } else {
    const fringe = sphere(hair, -.08, 1.46, .30, .20, .095, .09);
    fringe.rotation.z = -.35;
    sphere(hair, -.19, 1.34, .16, .075, .17, .16);
  }
  for (const x of [-.085, .085]) sphere(ink, x, 1.3, .377, .019, .025, .012);
  sphere(skin, 0, 1.23, .398, .035, .04, .045);
  if (appearance.accessory === "glasses") {
    // Open frames leave the eyes visible without transparent lens sorting.
    for (const side of [-1, 1]) {
      mesh(
        new THREE.TorusGeometry(.068, .012, 6, 20),
        ink,
        side * .089,
        1.30,
        .415,
      );
      limb(ink, [side * .15, 1.31, .411], [side * .232, 1.32, .19], .012);
    }
    limb(ink, [-.025, 1.31, .415], [.025, 1.31, .415], .01);
  } else if (appearance.accessory === "headphones") {
    mesh(new THREE.TorusGeometry(.29, .027, 6, 24, Math.PI), ink, 0, 1.32, .13);
    for (const side of [-1, 1]) {
      sphere(ink, side * .265, 1.30, .13, .065, .115, .105);
      sphere(trim, side * .307, 1.30, .13, .028, .082, .077);
    }
  }
  joint("head", [0, 1.08, .15], person.children.slice(headStart));
  // Lanyard and participant badge.
  for (const side of [-1, 1]) {
    const sleeve = look.style === "vest" ? trim : shirt;
    const forearm = look.style === "tee" ? skin : sleeve;
    if (!spectator) limb(accent, [side * .13, .97, .235], [0, .61, .285], .012);
    const armStart = person.children.length;
    if (spectator) {
      limb(sleeve, [side * .25, .87, .13], [side * .285, .65, .165], .11);
      limb(look.style === "tee" ? skin : sleeve, [side * .285, .65, .165], [
        side * .32,
        .43,
        .2,
      ], .10);
      limb(forearm, [side * .32, .43, .2], [side * .19, .31, .47], .085);
      sphere(skin, side * .19, .29, .49, .085, .05, .10);
    } else {
      limb(sleeve, [side * .25, .87, .13], [side * .305, .985, .225], .11);
      limb(look.style === "tee" ? skin : sleeve, [side * .305, .985, .225], [
        side * .36,
        1.1,
        .32,
      ], .10);
      limb(forearm, [side * .36, 1.1, .32], [side * .22, 1.08, .66], .085);
      sphere(skin, side * .21, 1.065, .72, .085, .045, .10);
    }
    const armParts = person.children.slice(armStart);
    const forearmJoint = joint(
      `forearm-${side}`,
      spectator ? [side * .32, .43, .2] : [side * .36, 1.1, .32],
      armParts.slice(2),
    );
    joint(`arm-${side}`, [side * .25, .87, .13], [
      ...armParts.slice(0, 2),
      forearmJoint,
    ]);
    const legStart = person.children.length;
    limb(trousers, [side * .17, .18, .06], [side * .19, .05, .5], .12);
    limb(trousers, [side * .19, .05, .5], [side * .19, -.68, .54], .10);
    sphere(shoes, side * .19, -.74, .66, .13, .09, .23);
    for (const part of person.children.slice(legStart)) seatedParts.add(part);
  }
  if (!spectator) {
    mesh(new THREE.BoxGeometry(.17, .22, .025), badge, 0, .53, .33);
    mesh(new THREE.BoxGeometry(.13, .045, .028), accent, 0, .585, .346);
  }
  joint(
    "upper-body",
    [0, .18, .04],
    person.children.filter((part) => !seatedParts.has(part)),
  );
  return person;
}

// Bind after cloning: every audience member owns its joints while sharing meshes.
export function createStudentMotion(
  person: THREE.Group,
  spectator: boolean,
  seed: number,
) {
  const part = (name: string) => {
    const object = person.getObjectByName(name);
    if (!object) throw new Error(`Missing student joint: ${name}`);
    return object;
  };
  const upper = part("upper-body"), head = part("head");
  const arms = [-1, 1].map((side) => part(`arm-${side}`));
  const forearms = [-1, 1].map((side) => part(`forearm-${side}`));
  const phase = seed * 2.39996;
  const tempo = .86 + (seed % 7) * .047;
  return (time: number, reducedMotion: boolean) => {
    if (reducedMotion) {
      for (const joint of [upper, head, ...arms, ...forearms]) {
        joint.rotation.set(0, 0, 0);
      }
      return;
    }
    const t = time * tempo + phase;
    if (spectator) {
      // Ambient cheering, independent of match results. Staggered bursts leave
      // some people watching while others clap, wave or pump a fist.
      const energy = THREE.MathUtils.smoothstep(Math.sin(t * .62), -.85, -.15);
      const beat = .5 + .5 * Math.sin(t * 10);
      upper.rotation.x = -.035 - energy * (.035 + .045 * Math.sin(t * 5));
      upper.rotation.z = Math.sin(t * 2.6) * (.02 + energy * .045);
      head.rotation.x = energy * .07 * Math.sin(t * 5 + .4);
      head.rotation.y = Math.sin(t * .7) * .16;
      head.rotation.z = Math.sin(t * 2.6 + .5) * .04;
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        arms[i].rotation.set(0, 0, 0);
        forearms[i].rotation.set(0, 0, 0);
        if (seed % 3 === 0) {
          // Bring both hands together in front of the chest.
          arms[i].rotation.x = -1.05 * energy;
          forearms[i].rotation.x = -.9 * energy;
          forearms[i].rotation.y = -side * (.15 + .35 * beat) * energy;
        } else {
          const raised = seed % 3 === 1 || i === seed % 2;
          if (raised) {
            arms[i].rotation.z = side * energy *
              (2.5 + .16 * Math.sin(t * 5 + i));
            arms[i].rotation.x = -.25 * energy;
            forearms[i].rotation.x = -energy * (.45 + .25 * beat);
          } else {
            forearms[i].rotation.x = -.3 * energy;
          }
        }
      }
      return;
    }
    const pause = THREE.MathUtils.smoothstep(Math.sin(t * .48), .3, .8);
    upper.rotation.x = Math.sin(t * 1.3) * .012 - pause * .035;
    upper.rotation.z = Math.sin(t * .65) * .009;
    head.rotation.x = .035 * Math.sin(t * 1.7) - pause * .09;
    head.rotation.y = Math.sin(t * .55) * .10 * pause;
    head.rotation.z = Math.sin(t * .8) * .035;
    for (let i = 0; i < 2; i++) {
      arms[i].rotation.z = 0;
      // A short lift at the elbow reads as tapping without moving through the desk.
      forearms[i].rotation.x = -.075 * (1 - pause) *
        (.5 + .5 * Math.sin(t * 16 + i * Math.PI));
    }
  };
}
