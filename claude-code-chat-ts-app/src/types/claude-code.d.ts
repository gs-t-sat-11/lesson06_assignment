// Claude Code SDK の型定義を拡張
import type { Message, MessageParam } from '@anthropic-ai/sdk/resources/messages';

declare module '@anthropic-ai/claude-code' {
  // Assistant message
  export type SDKAssistantMessage = {
    type: 'assistant';
    message: Message; // from Anthropic SDK
    session_id: string;
  };

  // User message
  export type SDKUserMessage = {
    type: 'user';
    message: MessageParam; // from Anthropic SDK
    session_id: string;
  };

  // Result message - success
  export type SDKResultSuccessMessage = {
    type: 'result';
    subtype: 'success';
    duration_ms: number;
    duration_api_ms: number;
    is_error: boolean;
    num_turns: number;
    result: string;
    session_id: string;
    total_cost_usd: number;
  };

  // Result message - error
  export type SDKResultErrorMessage = {
    type: 'result';
    subtype: 'error_max_turns' | 'error_during_execution';
    duration_ms: number;
    duration_api_ms: number;
    is_error: boolean;
    num_turns: number;
    session_id: string;
    total_cost_usd: number;
  };

  // System message
  export type SDKSystemMessage = {
    type: 'system';
    subtype: 'init';
    apiKeySource: string;
    cwd: string;
    session_id: string;
    tools: string[];
    mcp_servers: {
      name: string;
      status: string;
    }[];
    model: string;
    permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
    message?: {
      content: Array<{ type: 'text'; text: string }>;
    };
  };

  export type SDKMessage =
    | SDKAssistantMessage
    | SDKUserMessage
    | SDKResultSuccessMessage
    | SDKResultErrorMessage
    | SDKSystemMessage;
}