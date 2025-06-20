# Claude Code 認証方法

## Claude Code Max プランユーザー向け

Claude Code Max プランに加入している場合、API キーを使わずに Claude Code SDK を使用できる可能性があります。

### 方法 1: Claude Code CLI の認証を利用

1. Claude Code デスクトップアプリケーションにログイン
2. ターミナルで以下を確認：
   ```bash
   claude --version
   ```

3. `.env` ファイルから `ANTHROPIC_API_KEY` を削除またはコメントアウト
4. アプリケーションを起動

### 方法 2: SDK の認証確認

ClaudeCodeService.ts を以下のように修正して、認証状態を確認：

```typescript
constructor() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY is not set. Attempting to use Claude Code CLI authentication...');
    // SDK は Claude Code CLI の認証を自動的に使用する可能性
  }
}
```

### 注意事項

- Claude Code SDK は内部的に Claude Code CLI (`claude` コマンド) を使用
- Max プランの認証が CLI 経由で利用可能かは、実際に試してみる必要があります
- `apiKeySource` フィールドで認証ソースを確認できます（system メッセージ内）

### テスト方法

1. `.env` ファイルの `ANTHROPIC_API_KEY` をコメントアウト
2. サーバーを再起動
3. チャットを開始して、system メッセージの `apiKeySource` を確認

もし Claude Code CLI の認証が使用されれば、API キーなしでも動作するはずです。