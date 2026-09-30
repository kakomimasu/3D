import { isRecord, matchListUrl, matchSummaries } from "./model.ts";

interface GameListElements {
  dialog: HTMLDialogElement;
  list: HTMLElement;
  status: HTMLElement;
  refresh: HTMLButtonElement;
  open: HTMLElement;
  close: HTMLElement;
}

export function createGameList(
  elements: GameListElements,
  onSelect: (id: string) => void,
  selectedId: () => string | undefined,
) {
  // The public stream provides the latest match list in its initial event.
  // Close the list stream after that snapshot; only the selected match stays live.
  let listSource: EventSource | null = null;
  let listTimeout: ReturnType<typeof setTimeout> | undefined;
  const gamesDialog = elements.dialog;
  function stopListRequest() {
    listSource?.close();
    listSource = null;
    clearTimeout(listTimeout);
    elements.refresh.disabled = false;
    elements.list.setAttribute("aria-busy", "false");
  }
  function loadGames() {
    stopListRequest();
    elements.list.replaceChildren();
    elements.list.setAttribute("aria-busy", "true");
    elements.status.textContent = "ゲーム一覧を読み込み中…";
    elements.refresh.disabled = true;
    const source = new EventSource(matchListUrl());
    listSource = source;
    const fail = (message: string) => {
      if (listSource !== source) return;
      stopListRequest();
      elements.status.textContent = message;
    };
    listTimeout = setTimeout(
      () => fail("読み込みがタイムアウトしました。「更新」で再試行できます。"),
      15000,
    );
    source.onerror = () =>
      fail(
        "一覧を取得できませんでした。通信状況を確認して「更新」を押してください。",
      );
    source.onmessage = (event) => {
      if (listSource !== source) return;
      try {
        const data: unknown = JSON.parse(event.data);
        if (!isRecord(data) || data.type !== "initial") return;
        const matches = matchSummaries(data.games);
        const fragment = document.createDocumentFragment();
        matches.forEach((match) => {
          const button = document.createElement("button");
          button.className = "game-card";
          if (selectedId() === match.id) {
            button.setAttribute("aria-current", "true");
          }
          const heading = document.createElement("strong");
          heading.textContent = match.name;
          const players = document.createElement("span");
          players.className = "game-players";
          players.textContent = match.players;
          const meta = document.createElement("span");
          meta.className = "game-meta";
          const date = match.startedAt == null
            ? "開始日時未定"
            : new Date(match.startedAt * 1000).toLocaleString("ja-JP", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              year: "numeric",
            });
          meta.textContent = `${match.status} · ${date} · ${match.turn}ターン`;
          const id = document.createElement("small");
          id.textContent = `ID: ${match.id}`;
          button.append(heading, players, meta, id);
          button.onclick = () => {
            gamesDialog.close();
            onSelect(match.id);
          };
          fragment.append(button);
        });
        elements.list.replaceChildren(fragment);
        elements.status.textContent = matches.length
          ? `最近の${matches.length}件 · ゲームを選ぶと観戦を開始します`
          : "公開されているゲームはありません。";
        stopListRequest();
      } catch {
        fail("一覧データを読み取れませんでした。「更新」で再試行できます。");
      }
    };
  }
  elements.open.onclick = () => {
    gamesDialog.showModal();
    loadGames();
  };
  elements.close.onclick = () => gamesDialog.close();
  elements.refresh.onclick = loadGames;
  gamesDialog.addEventListener("close", stopListRequest);
  return { dispose: stopListRequest };
}
