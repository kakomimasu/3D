import { assertMatch, assertNotMatch, assertStrictEquals } from "@std/assert";
import { createCommentator, describeGame } from "./commentary.ts";
import { demoGame } from "./model.ts";

function match(a: number, b: number, turn = 1) {
  const game = demoGame();
  game.id = "match";
  game.turn = turn;
  game.players[0].name = "青";
  game.players[1].name = "赤";
  game.players[0].point = { wallPoint: a, areaPoint: 0 };
  game.players[1].point = { wallPoint: b, areaPoint: 0 };
  return game;
}
Deno.test("同じ状態の再受信は実況を重複させない", () => {
  assertStrictEquals(describeGame(match(10, 20), match(10, 20)), null);
});
Deno.test("逆転と得点差を実データから伝える", () => {
  assertMatch(
    describeGame(match(30, 20, 2), match(10, 20), 0)!,
    /青が逆転しました。10点/,
  );
});
Deno.test("終了と引き分けをターンが同じでも伝える", () => {
  const previous = match(20, 20);
  const ended = { ...previous, status: "ended" };
  assertMatch(describeGame(ended, previous)!, /試合終了.*引き分け/);
});
Deno.test("別の試合へ切り替えた場合は逆転と誤認しない", () => {
  const previous = match(10, 20);
  previous.id = "other";
  const text = describeGame(match(30, 20), previous)!;
  assertMatch(text, /観戦を始めます/);
  assertNotMatch(text, /逆転/);
});
Deno.test("追いつきと均衡を破る場面を区別する", () => {
  assertMatch(
    describeGame(match(20, 20, 2), match(10, 20))!,
    /青が同点に追いつき/,
  );
  assertMatch(
    describeGame(match(20, 25, 3), match(20, 20, 2))!,
    /赤が均衡を破り.*5点/,
  );
});
Deno.test("得点減少で点差が縮んでも得点追加とは言わない", () => {
  const text = describeGame(match(22, 20, 2), match(30, 20), 0)!;
  assertMatch(text, /点差が縮まり.*あと2点/);
  assertNotMatch(text, /追加|逆転/);
});
Deno.test("合計が同じでもエリア得点の変化を拾う", () => {
  const game = match(20, 20, 2);
  game.players[0].point = { wallPoint: 10, areaPoint: 10 };
  assertMatch(
    describeGame(game, match(20, 20), 0)!,
    /青のエリア得点が10点増え/,
  );
  const next = match(20, 20, 3);
  assertMatch(describeGame(next, game)!, /エリア得点が10点減り/);
});
Deno.test("両者の加点と減点を区別する", () => {
  assertMatch(
    describeGame(match(25, 25, 2), match(20, 20))!,
    /青は5点追加。赤は5点追加/,
  );
  assertMatch(
    describeGame(match(15, 15, 2), match(20, 20))!,
    /青は5点減少。赤は5点減少/,
  );
});
Deno.test("得点のない移動も伝え、同一状態の再送は黙る", () => {
  const before = match(20, 20);
  const next = match(20, 20, 2);
  next.players[0].agents[0].x++;
  assertMatch(
    describeGame(next, before, 0)!,
    /青の配置が変わり.*得点は動いていません/,
  );
  assertStrictEquals(describeGame(next, structuredClone(next)), null);
});
Deno.test("静かなターンは毎回読み上げず節目に状況を振り返る", () => {
  assertStrictEquals(describeGame(match(20, 20, 2), match(20, 20)), null);
  assertMatch(describeGame(match(20, 20, 5), match(20, 20, 4))!, /第5ターン/);
});
Deno.test("更新の欠落と巻き戻しを単一ターンの変化と誤認しない", () => {
  assertMatch(
    describeGame(match(30, 20, 6), match(10, 20), 0)!,
    /直近5ターンで、青が逆転/,
  );
  const text = describeGame(match(30, 20), match(10, 20, 6))!;
  assertMatch(text, /観戦を始めます/);
  assertNotMatch(text, /逆転/);
});
Deno.test("繰り返し起こるリード拡大の言い回しを変える", () => {
  const caption = { textContent: "" } as HTMLElement;
  const commentator = createCommentator(caption);
  commentator.update(match(20, 10));
  commentator.update(match(30, 10, 2));
  assertMatch(caption.textContent!, /拡大/);
  commentator.update(match(40, 10, 3));
  assertMatch(caption.textContent!, /リードは30点/);
  commentator.update(match(50, 10, 4));
  assertMatch(caption.textContent!, /リードを広げ/);
});
Deno.test("同じオブジェクトが更新されても前回との差分を保持する", () => {
  const caption = { textContent: "" } as HTMLElement;
  const commentator = createCommentator(caption);
  const game = match(10, 20);
  commentator.update(game);
  game.turn = 2;
  game.players[0].point!.wallPoint = 30;
  commentator.update(game);
  assertMatch(caption.textContent!, /首位交代/);
});
Deno.test("終了後のターンのみの更新で勝利を繰り返さない", () => {
  const previous = { ...match(30, 20), status: "ended" };
  assertStrictEquals(describeGame({ ...previous, turn: 2 }, previous), null);
});
Deno.test("デモであることは途中の実況にも明示する", () => {
  assertMatch(describeGame(demoGame(2), demoGame(1))!, /^デモ対戦。/);
});
