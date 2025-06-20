import { query, type SDKMessage, type Options } from '@anthropic-ai/claude-code';
import { v4 as uuidv4 } from 'uuid';
import { ChatSession, ChatOptions, MCPConfig } from '@shared/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// import { ApiError } from '../middleware/errorHandler';

export class ClaudeCodeService {
  private sessions: Map<string, ChatSession> = new Map();
  private mcpConfigFiles: Map<string, string> = new Map(); // sessionId -> configFilePath

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('WARNING: ANTHROPIC_API_KEY is not set in environment variables');
    }
  }

  private async createMcpConfigFile(mcpConfigJson: string, sessionId: string): Promise<string | null> {
    try {
      // MCPConfigのJSONをパース
      const mcpConfig: MCPConfig = JSON.parse(mcpConfigJson);
      
      // 一時ディレクトリにMCP設定ファイルを作成
      const tempDir = os.tmpdir();
      const configFileName = `claude-code-mcp-${sessionId}.json`;
      const configFilePath = path.join(tempDir, configFileName);
      
      // ファイルに書き込み
      await fs.promises.writeFile(configFilePath, JSON.stringify(mcpConfig, null, 2), 'utf-8');
      
      // セッションIDとファイルパスをマッピング
      this.mcpConfigFiles.set(sessionId, configFilePath);
      
      return configFilePath;
    } catch (error) {
      console.error('Failed to create MCP config file:', error);
      return null;
    }
  }

  private async cleanupMcpConfigFile(sessionId: string): Promise<void> {
    const configFilePath = this.mcpConfigFiles.get(sessionId);
    if (configFilePath) {
      try {
        await fs.promises.unlink(configFilePath);
        this.mcpConfigFiles.delete(sessionId);
      } catch (error) {
        console.error('Failed to cleanup MCP config file:', error);
      }
    }
  }

  async startChat(prompt: string, options?: ChatOptions): Promise<ChatSession> {
    const sessionId = uuidv4();
    const abortController = new AbortController();
    
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      abortController,
    };

    this.sessions.set(sessionId, session);

    // APIキーの優先順位: 1. 設定からのAPIキー, 2. 環境変数, 3. Claude Codeのデフォルト認証
    const originalApiKey = process.env.ANTHROPIC_API_KEY;
    
    try {
      const queryOptions: Options = {
        maxTurns: options?.maxTurns,
        customSystemPrompt: options?.systemPrompt,
        appendSystemPrompt: options?.appendSystemPrompt,
        allowedTools: options?.allowedTools,
        disallowedTools: options?.disallowedTools,
        permissionMode: options?.permissionMode as any,
        model: options?.model,
        cwd: options?.cwd,
      };

      // MCP設定がある場合は設定ファイルを作成
      if (options?.mcpConfig) {
        const mcpConfigPath = await this.createMcpConfigFile(options.mcpConfig, sessionId);
        if (mcpConfigPath) {
          (queryOptions as any).mcpConfig = mcpConfigPath;
          console.log(`MCP config file created for session ${sessionId}: ${mcpConfigPath}`);
        }
      }

      if (options?.apiKey) {
        // Claude Code SDKは環境変数経由でのみAPIキーを受け取るため、一時的に環境変数を設定
        process.env.ANTHROPIC_API_KEY = options.apiKey;
      }

      // ストリーミングではなく、メッセージを収集
      const messages: SDKMessage[] = [];
      for await (const message of query({
        prompt,
        abortController,
        options: queryOptions,
      })) {
        messages.push(message);
        session.messages.push(message);
        session.updatedAt = new Date();
      }

      // セッションを継続可能にするため、statusは'active'のまま維持
      this.sessions.set(sessionId, session);
      
      // APIキーを元に戻す
      if (options?.apiKey && originalApiKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalApiKey;
      } else if (options?.apiKey && originalApiKey === undefined) {
        delete process.env.ANTHROPIC_API_KEY;
      }
      
      // MCP設定ファイルのクリーンアップ
      await this.cleanupMcpConfigFile(sessionId);
      
      return session;

    } catch (error) {
      session.status = 'error';
      this.sessions.set(sessionId, session);
      
      // APIキーを元に戻す
      if (options?.apiKey && originalApiKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalApiKey;
      } else if (options?.apiKey && originalApiKey === undefined) {
        delete process.env.ANTHROPIC_API_KEY;
      }
      
      // MCP設定ファイルのクリーンアップ
      await this.cleanupMcpConfigFile(sessionId);
      
      throw error;
    }
  }

  async* streamChat(
    prompt: string,
    options?: ChatOptions,
    sessionId?: string
  ): AsyncGenerator<SDKMessage, void, unknown> {
    const abortController = new AbortController();
    
    let session: ChatSession | null = null;
    let isNewSession = false;
    
    if (sessionId && this.sessions.has(sessionId)) {
      console.log(`Continuing existing session: ${sessionId}`);
      session = this.sessions.get(sessionId)!;
      session.abortController = abortController;
      session.status = 'active';
    } else {
      console.log(`New session will be created when SDK returns session_id`);
      isNewSession = true;
    }

    // APIキーの優先順位: 1. 設定からのAPIキー, 2. 環境変数, 3. Claude Codeのデフォルト認証
    const originalApiKey = process.env.ANTHROPIC_API_KEY;
    
    try {
      const queryOptions: Options = {
        maxTurns: options?.maxTurns,
        customSystemPrompt: options?.systemPrompt,
        appendSystemPrompt: options?.appendSystemPrompt,
        allowedTools: options?.allowedTools,
        disallowedTools: options?.disallowedTools,
        permissionMode: options?.permissionMode as any,
        model: options?.model,
        cwd: options?.cwd,
      };

      if (options?.apiKey) {
        // Claude Code SDKは環境変数経由でのみAPIキーを受け取るため、一時的に環境変数を設定
        process.env.ANTHROPIC_API_KEY = options.apiKey;
      }

      // 既存セッションの場合はresumeを使用
      if (sessionId && !isNewSession) {
        console.log(`\n=== Resuming conversation with session ID: ${sessionId} ===`);
        // resumeを使用して特定のセッションを再開
        queryOptions.resume = sessionId;
        console.log('Using --resume with session ID for conversation continuity');
        
        // 既存セッションの場合はMCP設定を引き継ぐ（新しいMCP設定がある場合）
        if (options?.mcpConfig) {
          const mcpConfigPath = await this.createMcpConfigFile(options.mcpConfig, sessionId);
          if (mcpConfigPath) {
            (queryOptions as any).mcpConfig = mcpConfigPath;
            console.log(`MCP config file created for resumed session ${sessionId}: ${mcpConfigPath}`);
          }
        }
      } else {
        console.log(`Starting new conversation`);
        // 新規セッションの場合は一時的なセッションIDを使用
        const tempSessionId = uuidv4();
        if (options?.mcpConfig) {
          const mcpConfigPath = await this.createMcpConfigFile(options.mcpConfig, tempSessionId);
          if (mcpConfigPath) {
            (queryOptions as any).mcpConfig = mcpConfigPath;
            console.log(`MCP config file created for new session (temp ID: ${tempSessionId}): ${mcpConfigPath}`);
          }
        }
      }

      for await (const message of query({
        prompt,
        abortController,
        options: queryOptions,
      })) {
        // 新しいセッションの場合、SDKからのセッションIDを使って作成
        if (isNewSession && 'session_id' in message) {
          const sdkSessionId = message.session_id;
          console.log(`Creating new conversation tracking with ID: ${sdkSessionId}`);
          session = {
            id: sdkSessionId,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'active',
            abortController,
          };
          this.sessions.set(sdkSessionId, session);
          isNewSession = false;
        }
        
        // 既存セッションでセッションIDが変わった場合の処理
        if (!isNewSession && session && 'session_id' in message && message.session_id !== sessionId) {
          console.log(`Session ID changed from ${sessionId} to ${message.session_id} (expected with --resume)`);
          // 古いセッションを削除して新しいIDで保存
          if (sessionId) {
            this.sessions.delete(sessionId);
          }
          session.id = message.session_id;
          this.sessions.set(message.session_id, session);
        }
        
        if (session) {
          session.messages.push(message);
          session.updatedAt = new Date();
        }
        
        // デバッグ: メッセージタイプをログ出力
        console.log(`[SDK Message] Type: ${message.type}${message.type === 'assistant' && 'message' in message ? `, Content: ${message.message.content.slice(0, 100)}...` : ''}`);
        
        // resultメッセージの場合はセッションを完了状態にする
        if (message.type === 'result' && session) {
          session.status = 'completed';
        }
        
        yield message;
      }
    } catch (error) {
      if (session) {
        session.status = 'error';
      }
      throw error;
    } finally {
      // APIキーを元に戻す
      if (options?.apiKey && originalApiKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalApiKey;
      } else if (options?.apiKey && originalApiKey === undefined) {
        delete process.env.ANTHROPIC_API_KEY;
      }
      
      // MCP設定ファイルのクリーンアップ（セッションがある場合）
      if (session) {
        await this.cleanupMcpConfigFile(session.id);
        this.sessions.set(session.id, session);
      }
    }
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  abortSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session?.abortController) {
      session.abortController.abort();
      session.status = 'completed';
      // MCP設定ファイルのクリーンアップ
      this.cleanupMcpConfigFile(sessionId).catch(error => {
        console.error('Failed to cleanup MCP config on abort:', error);
      });
      return true;
    }
    return false;
  }

  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }
}