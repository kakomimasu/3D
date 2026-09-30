import * as THREE from "three";
import type { Game } from "./types.ts";

export function createBoard(scene: THREE.Scene) {
  const board = new THREE.Group();
  scene.add(board);
  let game: Game;
  let meshes: THREE.Mesh[] = [], numberMeshes: THREE.Mesh[] = [];
  const materials = ["#43516a", "#80c2df", "#efada1", "#238cca", "#cc4561"].map(
    (color) =>
      new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: .08 }),
  );
  const tileGeo = new THREE.BoxGeometry(.94, 1, .94);
  const labelCache = new Map<string, THREE.CanvasTexture>();
  function labelTexture(text: string): THREE.CanvasTexture {
    const cached = labelCache.get(text);
    if (cached) return cached;
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    ctx.font = "500 66px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, 64, 66);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    labelCache.set(text, t);
    return t;
  }
  function clearBoard() {
    const geometries = new Set<THREE.BufferGeometry>();
    const disposableMaterials = new Set<THREE.Material>();
    board.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (o.geometry !== tileGeo) geometries.add(o.geometry);
      const meshMaterials: THREE.Material[] = Array.isArray(o.material)
        ? o.material
        : [o.material];
      for (const material of meshMaterials) {
        if (!materials.includes(material as THREE.MeshStandardMaterial)) {
          disposableMaterials.add(material);
        }
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    disposableMaterials.forEach((material) => material.dispose());
    board.clear();
    meshes = [];
    numberMeshes = [];
    labelCache.forEach((t) => t.dispose());
    labelCache.clear();
  }
  function positionFor(x: number, y: number): [number, number] {
    return [x - (game.field.width - 1) / 2, y - (game.field.height - 1) / 2];
  }

  function update(next: Game, showNumbers: boolean) {
    game = next;
    clearBoard();
    const { width, height, points, tiles } = game.field;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(width + .7, .6, height + .7),
      new THREE.MeshStandardMaterial({ color: "#253d37", roughness: .65 }),
    );
    base.position.y = -.33;
    base.receiveShadow = true;
    base.castShadow = true;
    board.add(base);
    const latest = game.log?.at(-1)?.players?.flatMap((p) => p.actions ?? []) ??
      [];
    const conflicts = new Set(
      latest.filter((a) => a.res > 0 && a.res < 3).map((a) =>
        a.x + a.y * width
      ),
    );
    tiles.forEach((t, i) => {
      const x = i % width, y = Math.floor(i / width);
      const [px, pz] = positionFor(x, y);
      const owned = t.player === 0 || t.player === 1;
      const h = t.type === 1 && owned ? .30 : .12;
      const matIndex = t.player === 0 || t.player === 1
        ? (t.type === 1 ? 3 + t.player : 1 + t.player)
        : 0;
      const m = new THREE.Mesh(tileGeo, materials[matIndex]);
      m.position.set(px, h / 2, pz);
      m.scale.y = h;
      m.receiveShadow = true;
      m.castShadow = true;
      m.userData = { index: i };
      board.add(m);
      meshes.push(m);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(.47, .47),
        new THREE.MeshBasicMaterial({
          map: labelTexture(String(points[i])),
          transparent: true,
          depthWrite: false,
          opacity: !owned ? .65 : .95,
        }),
      );
      label.rotation.x = -Math.PI / 2;
      label.position.set(px, h + .009, pz);
      label.visible = showNumbers;
      board.add(label);
      numberMeshes.push(label);
      if (conflicts.has(i)) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(.33, .41, 32),
          new THREE.MeshBasicMaterial({
            color: "#aafc88",
            side: THREE.DoubleSide,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(px, h + .025, pz);
        board.add(ring);
      }
    });
    game.players.forEach((p, pid) => {
      p.agents.forEach((a, aid) => {
        if (a.x < 0 || a.y < 0) return;
        const [x, z] = positionFor(a.x, a.y),
          h = meshes[a.x + a.y * width].scale.y;
        const g = new THREE.Group();
        const material = new THREE.MeshStandardMaterial({
          color: pid ? "#ffb6a3" : "#91d7ff",
          roughness: .3,
          metalness: .2,
        });
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(.12, .21, .42, 24),
          material,
        );
        body.position.y = .21;
        body.castShadow = true;
        g.add(body);
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(.145, 24, 16),
          material,
        );
        head.position.y = .49;
        head.castShadow = true;
        g.add(head);
        const foot = new THREE.Mesh(
          new THREE.CylinderGeometry(.26, .26, .055, 32),
          new THREE.MeshStandardMaterial({
            color: pid ? "#ff735c" : "#4daedb",
          }),
        );
        foot.position.y = .027;
        g.add(foot);
        g.position.set(x, h + .015, z);
        g.userData = { pid, aid };
        board.add(g);
      });
    });
  }
  return {
    update,
    setNumbersVisible(visible: boolean) {
      numberMeshes.forEach((mesh) => mesh.visible = visible);
    },
    pick(raycaster: THREE.Raycaster): number | undefined {
      return raycaster.intersectObjects(meshes)[0]?.object.userData.index;
    },
    dispose() {
      clearBoard();
      tileGeo.dispose();
      materials.forEach((material) => material.dispose());
      scene.remove(board);
    },
  };
}
