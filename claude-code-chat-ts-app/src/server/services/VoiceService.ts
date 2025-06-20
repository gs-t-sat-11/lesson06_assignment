export class VoiceService {
  async generateVoice(
    text: string, 
    actorId: string, 
    apiKey: string,
    options: { speed?: number; format?: string } = {}
  ): Promise<{ audioBase64: string; generatedVoice?: any }> {
    const { speed = 1.0, format = 'wav' } = options;
    
    const response = await fetch(
      `https://api.nijivoice.com/api/platform/v1/voice-actors/${actorId}/generate-encoded-voice`,
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: text,
          speed,
          format,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nijivoice API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as any;
    // APIレスポンスの構造に応じて調整が必要
    return {
      audioBase64: data.audioBase64 || data.audio_base64 || data.generatedVoice?.audioContent,
      generatedVoice: data.generatedVoice || data,
    };
  }

  // テキストを音声生成に適した長さに分割
  splitTextForVoice(text: string, maxLength: number = 200): string[] {
    const sentences = text.match(/[^。！？\.\!\?]+[。！？\.\!\?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}