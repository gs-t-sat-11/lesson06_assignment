import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import chatRoutes from './routes/chat';

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェアの設定
app.use(cors({
  origin: [
    'http://localhost:5180',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    process.env.FRONTEND_URL || 'http://localhost:5180'
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// にじボイスのアクター一覧を直接実装（ルーターより前に配置）
app.get('/api/nijivoice/actors', async (req, res) => {
  const apiKey = req.headers['x-nijivoice-api-key'] as string;
  
  if (!apiKey) {
    res.status(401).json({ error: 'Nijivoice API key is required' });
    return;
  }

  try {
    const response = await fetch('https://api.nijivoice.com/api/platform/v1/voice-actors', {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ 
        error: `Nijivoice API error: ${response.statusText}`,
        details: errorText
      });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch voice actors',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// にじボイスの音声生成エンドポイント
app.post('/api/nijivoice/generate', async (req, res) => {
  console.log('[Nijivoice API] 音声生成リクエスト受信:', {
    actorId: req.body.actorId,
    text: req.body.text?.substring(0, 50) + '...',
    speed: req.body.speed,
    format: req.body.format
  });
  
  const apiKey = req.headers['x-nijivoice-api-key'] as string;
  const { actorId, text, speed = 1.0, format = 'wav' } = req.body;
  
  if (!apiKey) {
    res.status(401).json({ error: 'Nijivoice API key is required' });
    return;
  }

  if (!actorId || !text) {
    res.status(400).json({ error: 'actorId and text are required', received: { actorId, text: text?.substring(0, 50) } });
    return;
  }

  try {
    const requestBody = {
      script: text,
      speed: String(speed),
      format,
    };
    
    const response = await fetch(`https://api.nijivoice.com/api/platform/v1/voice-actors/${actorId}/generate-encoded-voice`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Nijivoice API] エラー:', response.status, errorText);
      res.status(response.status).json({ 
        error: `Nijivoice API error: ${response.statusText}`,
        details: errorText
      });
      return;
    }

    const data = await response.json() as any;
    
    console.log('[Nijivoice API] 音声生成成功:', {
      hasGeneratedVoice: !!data.generatedVoice,
      base64AudioLength: data.generatedVoice?.base64Audio ? data.generatedVoice.base64Audio.length : 0,
      duration: data.generatedVoice?.duration,
      remainingCredits: data.generatedVoice?.remainingCredits
    });
    
    res.json(data);
  } catch (error) {
    console.error('Voice generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate voice',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// APIルート
app.use('/api/chat', chatRoutes);


// 404ハンドラー（エラーハンドリングの前に配置）
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found', path: req.path });
  } else {
    next();
  }
});

// エラーハンドリング
app.use(errorHandler);

// 本番環境では静的ファイルを提供（APIルートの後に配置）
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../dist', 'index.html'));
  });
}

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Key configured: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No'}`);
});