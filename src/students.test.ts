import { assert, assertEquals } from "@std/assert";
import { createStudent, createStudentMotion } from "./students.ts";

Deno.test("cloned spectators animate independently and keep their seated base fixed", () => {
  const template = createStudent({ team: "blue", spectator: true });
  const a = template.clone(), b = template.clone();
  const animateA = createStudentMotion(a, true, 4);
  const animateB = createStudentMotion(b, true, 5);
  const hips = a.children[0];
  a.updateMatrixWorld(true);
  const rest = hips.matrixWorld.toArray();
  animateA(2, false);
  assertEquals(b.getObjectByName("head")!.rotation.y, 0);
  assertEquals(template.getObjectByName("head")!.rotation.y, 0);
  animateB(2, false);
  assert(
    a.getObjectByName("head")!.rotation.x !==
      b.getObjectByName("head")!.rotation.x,
  );
  a.updateMatrixWorld(true);
  assertEquals(hips.matrixWorld.toArray(), rest);
});

Deno.test("player motion changes over time and reduced motion restores the rest pose", () => {
  const player = createStudent({ team: "red", outfit: 3 });
  const animate = createStudentMotion(player, false, 0);
  const joints = [
    "head",
    "upper-body",
    "arm--1",
    "arm-1",
    "forearm--1",
    "forearm-1",
  ];
  animate(0, false);
  const before = player.getObjectByName("forearm--1")!.rotation.x;
  animate(.08, false);
  assert(player.getObjectByName("forearm--1")!.rotation.x !== before);
  animate(4, true);
  for (const name of joints) {
    const { x, y, z } = player.getObjectByName(name)!.rotation;
    assertEquals([x, y, z], [0, 0, 0]);
  }
});
