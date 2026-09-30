import { scores } from "./model.ts";
import type { Game } from "./types.ts";

export function describeGame(game: Game, previous?: Game): string | null {
  const totals = game.players.map((_, i) => {
    const p = scores(game, i);
    return p.wall + p.area;
  });
  const names = game.players.map((p, i) =>
    (p.name || p.id || (i ? "赤チーム" : "青チーム")).slice(0, 60)
  );
  const turn = game.turn ?? game.log?.length ?? 0;
  const ended = Boolean(game.ending || game.status === "ended");
  const same = previous?.id === game.id;
  if (
    same && turn === (previous.turn ?? previous.log?.length ?? 0) &&
    ended === Boolean(previous.ending || previous.status === "ended") &&
    totals.every((n, i) => {
      const p = scores(previous, i);
      return n === p.wall + p.area;
    })
  ) return null;
  const score = `${names[0]}、${totals[0]}点。${names[1]}、${totals[1]}点。`;
  const gap = totals[0] - totals[1];
  if (ended) {
    return `試合終了。${score}${
      gap === 0 ? "引き分けです。" : `${names[gap > 0 ? 0 : 1]}の勝利です。`
    }`;
  }
  let state = gap === 0
    ? "同点です。"
    : `${names[gap > 0 ? 0 : 1]}が${Math.abs(gap)}点リードしています。`;
  if (same && gap !== 0) {
    const a = scores(previous, 0),
      b = scores(previous, 1),
      oldGap = a.wall + a.area - b.wall - b.area;
    if (oldGap * gap < 0) {
      state = `${names[gap > 0 ? 0 : 1]}が逆転しました。${
        Math.abs(gap)
      }点のリードです。`;
    }
  }
  return `${game.id === "demo" ? "デモ対戦。" : ""}${
    !same ? "観戦を始めます。" : ""
  }第${turn}ターン。${score}${state}`;
}

export function createCommentator(caption: HTMLElement) {
  let current: Game | undefined;
  return {
    update(game: Game) {
      const text = describeGame(game, current);
      current = game;
      if (text) caption.textContent = text;
    },
  };
}
