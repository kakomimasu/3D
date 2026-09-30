# 囲みマス 3D

囲みマスの公開対戦をブラウザで観戦できる3Dビューアです。Three.jsとTypeScriptで制作しています。

**[ビューアを開く](https://kakomimasu.github.io/3D/)**

## 使い方

- 最新の公開ゲームを自動表示します。「ゲーム一覧」や対戦IDで観戦するゲームを選べます。
- ドラッグで回転、スクロール／ピンチで拡大縮小、右ドラッグで移動できます。
- 「スタジオ」「選手席」「盤面」「真上」で視点を切り替えられます。
- 「操作」から自動カメラ、得点表示、デモ再生を設定できます。

対戦者・得点・ターンは会場内のボードに、実況字幕は画面下部に表示します。接続できない場合はデモを表示します。

## 開発

Deno 2.9.7を使用します。依存関係は`deno.lock`で固定しています。Node.js・npmのインストールは不要です。

```sh
deno install --frozen
deno task dev
```

表示されたURL（通常は `http://127.0.0.1:5173/3D/`）を開いてください。

```sh
deno task typecheck # 型チェック
deno task test          # テスト
deno task build     # 型チェック・ビルド（dist/に出力）
```

`main`へのpushでGitHub Actionsがテスト・ビルドし、GitHub Pagesへ公開します。

## 補足

- デモは表示確認用の生成データです。VRヘッドセット向けの操作には対応していません。
- [囲みマスのVRビューア](https://github.com/kakomimasu/viewer/tree/main/public/vr)と[高専プロコン大会パンフレット](https://www.procon.gr.jp/wp-content/uploads/2016/12/27_Pamphlet.pdf)を参考にしています。公式会場の再現や公式配信ではありません。
- [囲みマス公式ロゴ](https://kakomimasu.com/img/kakomimasu-logo.svg)の権利は元の権利者に帰属します。
