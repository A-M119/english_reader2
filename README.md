# 英語小説リーダー

英語小説を1文ずつ読み進めながら、必要な時だけ和訳・単語の意味・文構造を確認できる学習用Webアプリです。
ビルド不要のVanilla HTML/CSS/JSで作られており、GitHub Pagesでそのまま公開できます。

## 使い方

1. `index.html` をブラウザで開く（GitHub Pagesで公開している場合はそのURLにアクセス）
2. 「JSONファイルを選択」から、原文・和訳・単語解説・文構造をまとめたJSONファイルを読み込む
   - まずは [`sample/sample-book.json`](sample/sample-book.json) で動作を試せます
   - 自分の読みたい小説用のJSONファイルの作り方は [`docs/json-format.md`](docs/json-format.md) を参照してください
3. 1文ずつ表示されるので、必要に応じて「翻訳」ボタンで和訳・単語・文構造を確認する
   - 和訳は見ずに単語の意味だけ確認したいときは「単語」ボタン（原文中の該当単語に下線が付きます）
4. 「次へ」ボタンで次の文に進む（翻訳せずに進んでもOK）
5. わからなかった単語は「わからない」ボタンで単語帳に登録できる（「単語帳」タブから確認・削除可能）
6. 読書位置は自動的にブラウザに保存され、次回同じJSONファイルを読み込むと続きから再開できる

このアプリ自体は翻訳・解析のためのAPI通信を一切行いません。
和訳・単語解説・文構造データは、あらかじめ利用者自身がLLM（Claudeなど）に依頼して作成したJSONファイルを読み込む方式です。

## GitHub Pagesで公開する方法

1. このリポジトリをGitHubにpushする
2. リポジトリの Settings → Pages を開く
3. Source を「Deploy from a branch」、Branch を `main` / `(root)` に設定して保存
4. しばらく待つと `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される

## ファイル構成

```
index.html            エントリーポイント
css/style.css          スタイル
js/storage.js           localStorage操作（進捗・単語帳）
js/fileLoader.js         JSONファイルの読み込み・バリデーション
js/render.js              画面描画
js/app.js                  状態管理・イベント配線
sample/sample-book.json    動作確認用サンプルデータ
docs/json-format.md         データ形式の仕様とJSON作成用プロンプト例
```
