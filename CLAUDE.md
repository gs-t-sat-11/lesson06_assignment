# CLAUDE.md

このファイルは、このリポジトリでコードを操作する際の Claude Code (claude.ai/code) へのガイダンスを提供します。
ユーザーとのやりとりは日本語行います。

## タスク完了時やユーザーに指示を仰ぐ際に必ず実行すること

- afplay /System/Library/Sounds/Blow.aiff を実行してください。

## プロジェクト概要

このプロジェクトは「Claude Code Chat」という、Claude Code SDK を使用してマルチターン会話ができる Web アプリケーションです。現在は仕様書のみが存在し、実装はこれから行われます。

## 技術スタック

### フロントエンド

- Vite + React + TypeScript
- CSS Modules
- WebSocket または Server-Sent Events (SSE) でストリーミングレスポンスを受信

### バックエンド

- Express.js (Node.js)
- @anthropic-ai/claude-code SDK
- TypeScript

## 実装時の重要な考慮事項

### Claude Code SDK の統合

- SDK は Node.js 環境でのみ動作するため、必ずバックエンドサーバーが必要
- ストリーミングレスポンスは `--output-format stream-json` を使用
- マルチターン会話には `--continue` または `--resume` オプションを使用
- AbortController を使用して処理のキャンセル機能を実装

### セキュリティ

- API キーは必ずサーバーサイドで管理し、クライアントに露出させない
- 環境変数 `ANTHROPIC_API_KEY` を使用

### 主要な実装項目

1. Claude Code SDK の各種設定項目を UI から設定可能にする
2. ストリーミングレスポンスのリアルタイム表示
3. 会話履歴の管理とセッションの継続機能
4. エラーハンドリングとユーザーフィードバック

## 開発開始時の手順

1. プロジェクトの初期化

```bash
npm init -y
npm install --save-dev typescript vite @vitejs/plugin-react
npm install express @anthropic-ai/claude-code react react-dom
npm install --save-dev @types/express @types/react @types/react-dom
```

2. TypeScript 設定の作成
3. Vite の設定
4. Express サーバーの実装（Claude Code SDK を統合）
5. React フロントエンドの実装

## プロジェクト構造（推奨）

```
/
├── src/
│   ├── client/          # Reactフロントエンド
│   │   ├── components/
│   │   ├── hooks/
│   │   └── App.tsx
│   └── server/          # Expressバックエンド
│       ├── routes/
│       └── index.ts
├── public/
├── docs/                # 既存のドキュメント
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env                 # ANTHROPIC_API_KEY
```

## 参考資料

- `docs/claude-code-sdk-spec.md`: Claude Code SDK の詳細な仕様書
- `docs/spec.md`: アプリケーション仕様書
