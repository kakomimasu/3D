import { assertMatch, assertNotMatch, assertStrictEquals } from "@std/assert";
import { describeGame } from "./commentary.ts";
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
    describeGame(match(30, 20, 2), match(10, 20))!,
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
