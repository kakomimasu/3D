import { createBoard } from "./board.ts";
import { createGameList } from "./game-list.ts";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./style.css";
import { createCommentator } from "./commentary.ts";
import { createStudio } from "./studio.ts";
import {
  demoGame,
  isRecord,
  matchListUrl,
  scores,
  selectMatch,
  streamUrl,
  validateGame,
} from "./model.ts";

import type { Game, ViewMode } from "./types.ts";

function $(id: "scene"): HTMLCanvasElement;
function $(id: "numbers" | "game-id" | "auto-camera"): HTMLInputElement;
function $(id: "play" | "step" | "refresh-games"): HTMLButtonElement;
function $(id: "games-dialog"): HTMLDialogElement;
function $(id: string): HTMLElement;
function $(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element: ${id}`);
  return element;
}
const canvas = $("scene");
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch {
  $("fatal").hidden = false;
  $("fatal").textContent =
    "3D表示を開始できませんでした。WebGLを利用できるブラウザで開いてください。";
  throw new Error("WebGL unavailable");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor("#080e1a");
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const fog = new THREE.Fog("#080e1a", 60, 180);
scene.fog = fog;
const camera = new THREE.PerspectiveCamera(38, 1, .1, 600);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - .08;
controls.minDistance = 5;
controls.maxDistance = 400;
// 正面を中心に往復し、会場の裏側へ回り込まないようにする。
let cameraMotionTime = 0, cameraResumeAt = 0, cameraInteracting = false;
let previousFrameTime = performance.now();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
$("auto-camera").checked = !reducedMotion.matches;
controls.addEventListener("start", () => {
  cameraInteracting = true;
  controls.autoRotate = false;
});
controls.addEventListener("end", () => {
  cameraInteracting = false;
  cameraResumeAt = performance.now() + 4000;
});
$("auto-camera").onchange = () => {
  controls.autoRotate = false;
  cameraResumeAt = 0;
};
scene.add(new THREE.HemisphereLight("#c5d9ff", "#121b34", 1.8));
const sun = new THREE.DirectionalLight("#eaf2ff", 3.5);
sun.position.set(-8, 18, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -35;
sun.shadow.camera.right = 35;
sun.shadow.camera.top = 35;
sun.shadow.camera.bottom = -35;
sun.shadow.camera.far = 80;
sun.shadow.normalBias = .04;
scene.add(sun);
const fill = new THREE.DirectionalLight("#7cb6d8", 1.2);
fill.position.set(8, 7, -10);
scene.add(fill);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(250, 250),
  new THREE.MeshStandardMaterial({ color: "#0c1322", roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.5;
ground.receiveShadow = true;
scene.add(ground);
const board = createBoard(scene);
const studio = createStudio(scene);
const commentator = createCommentator($("commentary-caption"));
let game: Game;
let timer: ReturnType<typeof setInterval> | undefined;
let socket: EventSource | null = null;
let connectionTimer: ReturnType<typeof setTimeout> | undefined;
let demoTurn = 1, mode: "demo" | "live" = "demo", view: ViewMode = "studio";
function setView(next: ViewMode) {
  controls.autoRotate = false;
  cameraMotionTime = 0;
  view = next;
  const d = Math.max(game.field.width, game.field.height);
  controls.target.set(
    0,
    next === "studio" ? d * .12 : 0,
    next === "studio" ? -d * .16 : 0,
  );
  const fov = 2 *
    Math.atan(
      Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) *
        Math.min(camera.aspect, 1),
    );
  const distance = (Math.hypot(game.field.width, game.field.height) / 2 + .6) /
    Math.sin(fov / 2) * (next === "studio" ? 1.7 : 1.12);
  camera.position.copy(
    new THREE.Vector3(
      ...(next === "top"
        ? [0, 1, .001]
        : next === "studio"
        ? [.15, .72, 1.5]
        : [1.05, 1.3, 1.3]),
    ).normalize().multiplyScalar(distance).add(controls.target),
  );
  fog.near = distance + 20;
  fog.far = distance + 140;
  if (next === "players") {
    const scale = d / 12;
    controls.target.set(-10 * scale, .65 * scale, -3.7 * scale);
    camera.position.copy(
      new THREE.Vector3(3, 2.4, 4).normalize().multiplyScalar(
        7 * scale / Math.min(camera.aspect, 1),
      ).add(controls.target),
    );
  }
  $("players").classList.toggle("active", next === "players");
  controls.update();
  $("studio").classList.toggle("active", next === "studio");
  $("angle").classList.toggle("active", next === "angle");
  $("top").classList.toggle("active", next === "top");
}
function draw(value: unknown) {
  const next = validateGame(value);
  const rebuild = !game || game.field.width !== next.field.width ||
    game.field.height !== next.field.height;
  game = next;
  board.update(game, $("numbers").checked);
  $("score-summary").textContent = game.players.map((p, pid) => {
    const score = scores(game, pid);
    return `${p.name || p.id || (pid ? "RED" : "BLUE")} ${
      score.wall + score.area
    }点`;
  }).join(" 対 ") + `、ターン ${game.turn ?? game.log?.length ?? 0}`;
  studio.update(game);
  commentator.update(game);
  if (rebuild) setView(view);
}
const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
canvas.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.set(
    (e.clientX - r.left) / r.width * 2 - 1,
    -(e.clientY - r.top) / r.height * 2 + 1,
  );
  raycaster.setFromCamera(mouse, camera);
  const index = board.pick(raycaster);
  if (index === undefined) {
    $("tile-info").textContent = "マスにカーソルを合わせると詳細を表示";
    return;
  }
  const i = index, t = game.field.tiles[i];
  $("tile-info").textContent = `(${i % game.field.width}, ${
    Math.floor(i / game.field.width)
  })   /   ${game.field.points[i]} 点   /   ${
    t.player !== 0 && t.player !== 1
      ? "中立"
      : (t.player ? "RED" : "BLUE") + " · " + (t.type === 1 ? "壁" : "領域")
  }`;
});
function stopDemo() {
  clearInterval(timer);
  timer = undefined;
  $("play").textContent = "▶ デモを再生";
}
function closeStream() {
  socket?.close();
  socket = null;
  clearTimeout(connectionTimer);
}
function step() {
  demoTurn = demoTurn % 12 + 1;
  draw(demoGame(demoTurn));
}
$("play").onclick = () => {
  if (timer) {
    stopDemo();
    return;
  }
  timer = setInterval(step, 1100);
  $("play").textContent = "Ⅱ 一時停止";
};
$("step").onclick = () => {
  stopDemo();
  step();
};
$("players").onclick = () => setView("players");
$("studio").onclick = () => setView("studio");
$("angle").onclick = () => setView("angle");
$("top").onclick = () => setView("top");
$("reset").onclick = () => setView("studio");
$("numbers").onchange = () => board.setNumbersVisible($("numbers").checked);
function showDemo() {
  closeStream();
  stopDemo();
  mode = "demo";
  demoTurn = 1;
  draw(demoGame());
  $("play").disabled = false;
  $("step").disabled = false;
  $("connection").textContent = "デモ表示";
  $("message").textContent = "青と赤の壁、淡い色の囲み領域を表示します。";
  history.replaceState(null, "", location.pathname);
}
$("demo").onclick = showDemo;
function connect(id: string | null) {
  $("game-id").value = id || "";
  closeStream();
  stopDemo();
  mode = "live";
  $("play").disabled = true;
  $("step").disabled = true;
  $("connection").textContent = "接続中…";
  $("message").textContent =
    "対戦データを待っています。盤面は受信後に切り替わります。";
  const s = new EventSource(id ? streamUrl(id) : matchListUrl());
  socket = s;
  let received = false, selectedId = id || null;
  if (!id) {
    $("connection").textContent = "最新ゲームを取得中…";
    $("message").textContent = "最新の公開ゲームに自動接続しています。";
  }
  const fallback = (message: string) => {
    if (socket !== s) return;
    showDemo();
    $("message").textContent = message +
      " デモを表示しています。ゲーム一覧から再選択できます。";
  };
  connectionTimer = setTimeout(() => {
    if (socket !== s) return;
    if (!received) {
      if (!id) {
        fallback("最新ゲームの取得がタイムアウトしました。");
        return;
      }
      $("connection").textContent = "データ未受信";
      $("message").textContent =
        "対戦が見つかりません。IDと通信状況を確認してください。";
    }
  }, 15000);
  s.onmessage = (e) => {
    if (socket !== s) return;
    try {
      const data: unknown = JSON.parse(e.data);
      const candidate = selectMatch(data, selectedId);
      if (!candidate) {
        if (
          !id && !received && isRecord(data) && data.type === "initial" &&
          Array.isArray(data.games) && !data.games.length
        ) fallback("公開ゲームがありません。");
        return;
      }
      const validated = validateGame(candidate);
      draw(validated);
      selectedId = validated.id;
      $("game-id").value = selectedId;
      received = true;
      clearTimeout(connectionTimer);
      $("connection").textContent =
        validated.ending || validated.status === "ended"
          ? "対戦終了"
          : "観戦中";
      $("message").textContent = "対戦の更新を自動で反映しています。";
      if (id) {
        const url = new URL(location.href);
        url.searchParams.set("id", id);
        history.replaceState(null, "", url);
      }
    } catch (err) {
      if (!id && !received) {
        fallback("最新ゲームを読み取れませんでした。");
        return;
      }
      $("connection").textContent = "データ読込エラー";
      $("message").textContent = err instanceof Error
        ? err.message
        : String(err);
    }
  };
  s.onerror = () => {
    if (socket === s) {
      if (!id && !received) {
        fallback("最新ゲームを取得できませんでした。");
        return;
      }
      $("connection").textContent = "再接続中…";
      $("message").textContent =
        "接続が途切れました。自動で再接続します。表示中の盤面は最後に受信した状態です。";
    }
  };
}
$("connect").onsubmit = (e) => {
  e.preventDefault();
  const id = $("game-id").value.trim();
  if (id) {
    $("games-dialog").close();
    connect(id);
  }
};
new ResizeObserver(() => {
  const { width, height } = canvas.parentElement!.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (game) setView(view);
}).observe(canvas.parentElement!);
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const delta = Math.min((now - previousFrameTime) / 1000, .05);
  previousFrameTime = now;
  controls.autoRotate = $("auto-camera").checked && !cameraInteracting &&
    now >= cameraResumeAt && !document.hidden && !$("games-dialog").open;
  if (controls.autoRotate) {
    cameraMotionTime += delta;
    controls.autoRotateSpeed = .35 *
      Math.cos(cameraMotionTime * Math.PI * 2 / 80);
  }
  controls.update(delta);
  studio.animate(delta, reducedMotion.matches);
  renderer.render(scene, camera);
});
draw(demoGame());
const id = new URLSearchParams(location.search).get("id")?.trim();
connect(id || null);
window.addEventListener("pagehide", () => {
  closeStream();
  stopDemo();
  renderer.setAnimationLoop(null);
});

const gameList = createGameList(
  {
    dialog: $("games-dialog"),
    list: $("games-list"),
    status: $("games-status"),
    refresh: $("refresh-games"),
    open: $("open-games"),
    close: $("close-games"),
  },
  connect,
  () => mode === "live" ? game?.id : undefined,
);
window.addEventListener("pagehide", () => gameList.dispose());
