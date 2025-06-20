import type { SDKMessage } from '@anthropic-ai/claude-code';

export interface ChatSession {
  id: string;
  messages: SDKMessage[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed' | 'error';
  abortController?: AbortController;
}

export interface MessageVoiceData {
  messageId: string;
  audioBase64: string;
  actorId: string;
  actorName: string;
}

export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers?: Record<string, MCPServerConfig>;
}

export interface ChatOptions {
  maxTurns?: number;
  systemPrompt?: string;
  appendSystemPrompt?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  outputFormat?: 'text' | 'json' | 'stream-json';
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
  model?: string;
  cwd?: string;
  apiKey?: string;
  mcpConfig?: string; // JSON string of MCPConfig
}

export interface StartChatRequest {
  prompt: string;
  options?: ChatOptions;
}

export interface ContinueChatRequest {
  sessionId: string;
  prompt: string;
  options?: ChatOptions;
}

export interface AppSettings {
  systemPrompt?: string;
  appendSystemPrompt?: string;
  maxTurns: number;
  allowedTools: string[];
  disallowedTools: string[];
  outputFormat: 'text' | 'json' | 'stream-json';
  permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
  model?: string;
  cwd?: string;
  apiKey?: string;
  nijivoiceApiKey?: string;
  nijivoiceActorId?: string;
  mcpConfig?: string; // JSON string of MCPConfig
}

export const DEFAULT_SETTINGS: AppSettings = {
  systemPrompt: '',
  appendSystemPrompt: '',
  maxTurns: 10,
  allowedTools: [],
  disallowedTools: [],
  outputFormat: 'stream-json',
  permissionMode: 'default',
  model: 'claude-sonnet-4-20250514',
  cwd: '',
  apiKey: '',
  nijivoiceApiKey: '',
  nijivoiceActorId: '',
  mcpConfig: '',
};

export const AVAILABLE_TOOLS = [
  'Bash',
  'Read',
  'Write',
  'Edit',
  'MultiEdit',
  'Grep',
  'Glob',
  'LS',
  'NotebookRead',
  'NotebookEdit',
  'WebFetch',
  'WebSearch',
  'TodoRead',
  'TodoWrite',
  'Task',
  'exit_plan_mode',
];

export const AVAILABLE_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Recommended)' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
];

export interface NijivoiceActor {
  id: string;
  name: string;
  styles: Array<{
    id: string;
    name: string;
  }>;
  sampleVoiceUrl?: string;
  sample_voice_url?: string;
  smallImageUrl?: string;
  pictureUrl?: string;
  picture_url?: string;
}