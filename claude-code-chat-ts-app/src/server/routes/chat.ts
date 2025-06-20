import { Router, Request, Response } from 'express';
import { ClaudeCodeService } from '../services/ClaudeCodeService';
import { StartChatRequest, ContinueChatRequest } from '@shared/types';
import { ApiError } from '../middleware/errorHandler';
import { VoiceService } from '../services/VoiceService';

const router = Router();
let claudeCodeService: ClaudeCodeService;
let voiceService: VoiceService;

// サービスのインスタンスを遅延初期化
const getClaudeCodeService = () => {
  if (!claudeCodeService) {
    claudeCodeService = new ClaudeCodeService();
  }
  return claudeCodeService;
};

const getVoiceService = () => {
  if (!voiceService) {
    voiceService = new VoiceService();
  }
  return voiceService;
};

// SSEヘッダーを設定
const setSSEHeaders = (res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
};

// 新規会話開始（SSE）
router.post('/start', async (req: Request<{}, {}, StartChatRequest>, res: Response) => {
  const { prompt, options } = req.body;

  if (!prompt) {
    const error: ApiError = new Error('Prompt is required');
    error.statusCode = 400;
    throw error;
  }

  setSSEHeaders(res);
  
  try {
    let sessionId: string | undefined;
    
    for await (const message of getClaudeCodeService().streamChat(prompt, options)) {
      // 初回メッセージでセッションIDを取得
      if (!sessionId && 'session_id' in message) {
        sessionId = message.session_id;
      }
      
      // SSE形式でメッセージを送信
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    }
    
    // 完了メッセージ
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
    res.end();
  }
});

// 会話継続（SSE）
router.post('/continue', async (req: Request<{}, {}, ContinueChatRequest>, res: Response) => {
  const { sessionId, prompt, options } = req.body;

  if (!sessionId || !prompt) {
    const error: ApiError = new Error('SessionId and prompt are required');
    error.statusCode = 400;
    throw error;
  }

  setSSEHeaders(res);
  
  try {
    for await (const message of getClaudeCodeService().streamChat(prompt, options, sessionId)) {
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    }
    
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
    res.end();
  }
});

// セッション情報取得
router.get('/sessions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const session = getClaudeCodeService().getSession(id);
  
  if (!session) {
    const error: ApiError = new Error('Session not found');
    error.statusCode = 404;
    throw error;
  }
  
  res.json(session);
});

// 全セッション一覧取得
router.get('/sessions', (_req: Request, res: Response) => {
  const sessions = getClaudeCodeService().getAllSessions();
  res.json(sessions);
});

// 現在の作業ディレクトリを取得
router.get('/cwd', (_req: Request, res: Response) => {
  res.json({ cwd: process.cwd() });
});

// 処理中断
router.delete('/sessions/:id/abort', (req: Request, res: Response) => {
  const { id } = req.params;
  const aborted = getClaudeCodeService().abortSession(id);
  
  if (!aborted) {
    const error: ApiError = new Error('Session not found or already completed');
    error.statusCode = 404;
    throw error;
  }
  
  res.json({ message: 'Session aborted successfully' });
});

export default router;