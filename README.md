# Atlas大学 開校準備タスク図面

Notionの「Atlas大学タスクデータベース」(約280件)をスマホ向けに使いやすくしたタスク管理アプリです。
Vite + React で作られており、GitHubで管理してGitHub Pagesに公開できます。

## できること

- **一覧タブ**: 検索・絞り込み(状態/優先区分/分類/領域/フェーズ/担当)
- **ダッシュボードタブ**: 全体進捗率、状態別件数、期限超過・ブロック中の警告、領域別の完了状況
- **階層タブ**: 親タスク・子タスクの入れ子表示
- タスクをタップすると詳細シートが開き、状態・進捗率・備考をその場で編集可能
  (編集内容はブラウザの `localStorage` に保存されます。同じブラウザ・同じ端末でのみ保持されます)

## セットアップ(ローカルで動かす)

```bash
npm install
npm run dev
```

`http://localhost:5173` が開きます。

## GitHubへの登録

まだリポジトリを作っていない場合:

```bash
cd atlas-task-blueprint
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <あなたのGitHubリポジトリURL>
git push -u origin main
```

## GitHub Pagesへの公開

1. 依存パッケージに `gh-pages` を含めてあります。まだの場合は `npm install` 済みであることを確認してください。
2. 以下を実行するとビルドして `gh-pages` ブランチに公開されます。

```bash
npm run build
npm run deploy
```

3. GitHubリポジトリの Settings → Pages で、Source を `gh-pages` ブランチに設定してください(初回のみ)。
4. しばらくすると `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます。

`vite.config.js` の `base: './'` により、リポジトリ名がどんな名前でも相対パスで動くようにしてあります。

## タスクデータを更新したいとき

`src/tasks.json` がタスクの元データです。Notionから改めてCSVエクスポートした場合は、
そのCSVを同じ形式のJSON配列に変換して `src/tasks.json` を置き換えてください
(各タスクの持つフィールド名は変えないでください)。

なお、あなた自身がアプリ内で編集した「状態・進捗率・備考」は `src/tasks.json` ではなく
ブラウザの `localStorage` 側に保存されています。`src/tasks.json` を更新しても、
一度編集したタスクの上書き内容は保持されます(削除したい場合はブラウザの localStorage をクリアしてください)。
