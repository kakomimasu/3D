import { scores } from "./model.ts";
import type { Game } from "./types.ts";

const turnOf = (game: Game) => game.turn ?? game.log?.length ?? 0;
const hasEnded = (game: Game) =>
  Boolean(game.ending || game.status === "ended");

/** Describe observed changes; do not infer strategy or successful actions. */
export function describeGame(
  game: Game,
  previous?: Game,
  variation = turnOf(game),
): string | null {
  const pick = (lines: string[]) => lines[Math.abs(variation) % lines.length];
  const points = game.players.map((_, i) => scores(game, i));
  const totals = points.map((p) => p.wall + p.area);
  const names = game.players.map((p, i) =>
    (p.name || p.id || (i ? "赤チーム" : "青チーム")).slice(0, 60)
  );
  const turn = turnOf(game);
  const same = previous?.id === game.id && turn >= turnOf(previous);
  const gap = totals[0] - totals[1];
  const leader = gap > 0 ? 0 : 1;
  const score = `${names[0]}、${totals[0]}点。${names[1]}、${totals[1]}点。`;
  const standing = gap === 0
    ? "両者同点です。"
    : `${names[leader]}が${Math.abs(gap)}点リードしています。`;
  const prefix = game.id === "demo" ? "デモ対戦。" : "";
  const old = same
    ? previous!.players.map((_, i) => scores(previous!, i))
    : null;
  const unchangedScore = old?.every((p, i) =>
    p.wall === points[i].wall && p.area === points[i].area
  );

  if (hasEnded(game)) {
    if (same && hasEnded(previous!) && unchangedScore) return null;
    return `${prefix}試合終了。${score}${
      gap === 0 ? "引き分けです。" : `${names[leader]}の勝利です。`
    }`;
  }
  if (!same || hasEnded(previous!)) {
    return `${prefix}観戦を始めます。第${turn}ターン。${score}${standing}`;
  }

  const oldTotals = old!.map((p) => p.wall + p.area);
  const oldGap = oldTotals[0] - oldTotals[1];
  const delta = totals.map((n, i) => n - oldTotals[i]);
  const areaDelta = points.map((p, i) => p.area - old![i].area);
  // A skipped update represents the whole interval, not just the latest move.
  const interval = turn - turnOf(previous!);
  const context = interval > 1 ? `直近${interval}ターンで、` : "";
  const areaPlayer = Math.abs(areaDelta[0]) >= Math.abs(areaDelta[1]) ? 0 : 1;
  const areaChange = areaDelta[areaPlayer];
  const area = areaChange === 0 ? "" : areaChange > 0
    ? pick([
      `${names[areaPlayer]}のエリア得点が${areaChange}点増えました。`,
      `${names[areaPlayer]}、エリア得点を${areaChange}点伸ばしています。`,
      `${names[areaPlayer]}にエリア得点の上積み、${areaChange}点です。`,
    ])
    : `${names[areaPlayer]}のエリア得点が${-areaChange}点減りました。`;

  let headline = "";
  if (oldGap * gap < 0) {
    headline = pick([
      `${names[leader]}が逆転しました。${Math.abs(gap)}点のリードです。`,
      `ここで首位交代！${names[leader]}が${Math.abs(gap)}点前に出ました。`,
      `${names[leader]}が追い抜きました！点差は${Math.abs(gap)}点です。`,
    ]);
  } else if (gap === 0 && oldGap !== 0) {
    const chaser = oldGap > 0 ? 1 : 0;
    headline = `${names[chaser]}が同点に追いつきました！両者${
      totals[0]
    }点です。`;
  } else if (oldGap === 0 && gap !== 0) {
    headline = `${names[leader]}が均衡を破りました。${
      Math.abs(gap)
    }点リードです。`;
  } else if (gap !== 0 && Math.abs(gap) < Math.abs(oldGap)) {
    headline = pick([
      `点差が縮まりました。${names[1 - leader]}、あと${Math.abs(gap)}点です。`,
      `両者の差は${Math.abs(gap)}点に。${
        names[leader]
      }のリードが小さくなりました。`,
      `${names[1 - leader]}が点差を詰めています。差は${Math.abs(gap)}点です。`,
    ]);
  } else if (gap !== 0 && Math.abs(gap) > Math.abs(oldGap)) {
    headline = pick([
      `${names[leader]}がリードを広げました。差は${Math.abs(gap)}点です。`,
      `点差は${Math.abs(gap)}点に拡大。${names[leader]}が先行しています。`,
      `${names[leader]}、リードは${Math.abs(gap)}点になりました。`,
    ]);
  }
  if (headline) return `${prefix}${context}${headline}${area}`;
  if (area) return `${prefix}${context}${area}${standing}`;
  if (delta.some((n) => n !== 0)) {
    const changes = delta.map((n, i) =>
      n === 0 ? "" : `${names[i]}は${Math.abs(n)}点${n > 0 ? "追加" : "減少"}。`
    ).join("");
    return `${prefix}${context}${changes}${standing}`;
  }
  if (!unchangedScore) {
    return `${prefix}壁得点とエリア得点の内訳が変わりました。${standing}`;
  }

  const moved = game.players.map((p, i) =>
    p.agents.filter((a, j) => {
      const before = previous!.players[i].agents[j];
      return before && (a.x !== before.x || a.y !== before.y);
    }).length
  );
  if (moved.some((n) => n > 0)) {
    const subject = moved.every((n) => n > 0)
      ? "両チーム"
      : names[moved[0] > 0 ? 0 : 1];
    return `${prefix}${context}${
      pick([
        `${subject}の配置が変わりました。得点は動いていません。`,
        `得点はそのまま、${subject}のエージェントが位置を変えています。`,
        `${subject}に動きがあります。点差は変わりません。`,
      ])
    }`;
  }
  // Leave the last caption visible during quiet turns; recap occasionally.
  if (
    turn === turnOf(previous!) ||
    Math.floor(turn / 5) === Math.floor(turnOf(previous!) / 5)
  ) {
    return null;
  }
  return `${prefix}第${turn}ターン。${
    pick([
      `ここまで得点に変化はありません。${standing}`,
      `現在の得点を確認しましょう。${score}`,
      `スコアは動かず、${standing}`,
    ])
  }`;
}

export function createCommentator(caption: HTMLElement) {
  let current: Game | undefined;
  let variation = 0;
  return {
    update(game: Game) {
      if (current?.id !== game.id || turnOf(game) < turnOf(current)) {
        variation = 0;
      }
      const text = describeGame(game, current, variation);
      current = structuredClone(game);
      if (text) {
        caption.textContent = text;
        variation++;
      }
    },
  };
}
