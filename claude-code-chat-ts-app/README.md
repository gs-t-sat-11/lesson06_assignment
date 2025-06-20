# Claude Code Chat App

Claude Code SDKを使用したチャットアプリケーション

## セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. 環境変数の設定
```bash
cp .env.example .env
# .envファイルを編集

# Claude Code Max プランの場合：
# APIキーは不要です。.envファイルのANTHROPIC_API_KEYはコメントアウトのままで構いません
# Claude Codeデスクトップアプリにログインしていれば、その認証が使用されます

# 通常のAnthropic APIを使用する場合：
# ANTHROPIC_API_KEY=your_api_key_here を設定してください
```

3. 開発サーバーの起動
```bash
# バックエンドサーバーのみ
npm run dev:server

# フロントエンドのみ
npm run dev

# 両方同時に起動
npm run dev:all
```

## APIのテスト方法

### 1. 新規チャットの開始（SSE）

```bash
# curlでServer-Sent Eventsをテスト
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, Claude! Please respond with a simple greeting.",
    "options": {
      "maxTurns": 1
    }
  }'
```

### 2. セッション一覧の取得

```bash
curl http://localhost:3000/api/chat/sessions
```

### 3. 特定のセッション情報の取得

```bash
curl http://localhost:3000/api/chat/sessions/{session-id}
```

### 4. 会話の継続

```bash
curl -X POST http://localhost:3000/api/chat/continue \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "{session-id}",
    "prompt": "Can you tell me more?",
    "options": {
      "maxTurns": 1
    }
  }'
```

### 5. セッションの中断

```bash
curl -X DELETE http://localhost:3000/api/chat/sessions/{session-id}/abort
```

## セッション管理について

Claude Code SDKのセッション管理には以下の特徴があります：

- **セッションIDは各リクエストごとに新しく生成されます**
- これは正常な動作で、実際の会話コンテキストはサーバー側で管理されています
- `--resume`オプションを使用することで、特定のセッションの会話を継続できます
- セッションIDが変わっても、会話の継続性は保たれます

詳細は[session-management.md](docs/session-management.md)を参照してください。

## テスト用HTTPファイル

VSCodeのREST Client拡張機能やIntelliJ IDEAで使用できます：