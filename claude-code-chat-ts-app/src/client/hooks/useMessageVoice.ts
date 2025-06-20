import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { convertAbbreviationsToKatakana } from '../utils/textToSpeechHelper';

interface MessageVoiceState {
  status: 'idle' | 'generating' | 'ready' | 'playing' | 'error';
  audioBase64?: string;
  error?: string;
}

export const useMessageVoice = (messageId: string, text: string, shouldGenerate: boolean) => {
  const { settings } = useSettings();
  const [voiceState, setVoiceState] = useState<MessageVoiceState>({ status: 'idle' });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasGeneratedRef = useRef(false);
  
  // 音声を生成
  const generateVoice = useCallback(async () => {
    if (!settings.nijivoiceApiKey || !settings.nijivoiceActorId || !text.trim()) {
      return;
    }

    if (hasGeneratedRef.current) {
      console.log('[MessageVoice] 既に生成済み:', messageId);
      return;
    }

    console.log('[MessageVoice] 音声生成開始:', {
      messageId,
      textLength: text.length,
      actorId: settings.nijivoiceActorId
    });

    setVoiceState({ status: 'generating' });
    hasGeneratedRef.current = true;

    try {
      // 音声合成用にテキストを変換（略称をカタカナに）
      const textForSpeech = convertAbbreviationsToKatakana(text);
      
      const response = await fetch('/api/nijivoice/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nijivoice-api-key': settings.nijivoiceApiKey,
        },
        body: JSON.stringify({
          actorId: settings.nijivoiceActorId,
          text: textForSpeech,
          speed: 1.0,
          format: 'wav',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate voice');
      }

      const data = await response.json();
      const audioData = data.generatedVoice?.base64Audio || 
                       data.generatedVoice?.audioContent || 
                       data.audioFileUrl || 
                       data.audio_file_url;
      
      if (!audioData) {
        throw new Error('No audio data in response');
      }

      console.log('[MessageVoice] 音声生成完了:', messageId);
      setVoiceState({ status: 'ready', audioBase64: audioData });
    } catch (error) {
      console.error('[MessageVoice] 音声生成エラー:', error);
      setVoiceState({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, [messageId, text, settings.nijivoiceApiKey, settings.nijivoiceActorId]);

  // 音声を再生
  const play = useCallback(async () => {
    if (voiceState.status !== 'ready' || !voiceState.audioBase64) {
      return;
    }

    console.log('[MessageVoice] 音声再生開始:', messageId);
    setVoiceState(prev => ({ ...prev, status: 'playing' }));

    try {
      const audioSrc = voiceState.audioBase64.startsWith('http') 
        ? voiceState.audioBase64 
        : `data:audio/wav;base64,${voiceState.audioBase64}`;
      
      const audio = new Audio(audioSrc);
      audioRef.current = audio;
      
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          console.log('[MessageVoice] 音声再生終了:', messageId);
          resolve();
        };
        audio.onerror = () => reject(new Error('Audio playback failed'));
        audio.play().catch(reject);
      });

      setVoiceState(prev => ({ ...prev, status: 'ready' }));
    } catch (error) {
      console.error('[MessageVoice] 音声再生エラー:', error);
      setVoiceState(prev => ({ 
        ...prev, 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [messageId, voiceState]);

  // 音声を停止
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (voiceState.status === 'playing') {
      setVoiceState(prev => ({ ...prev, status: 'ready' }));
    }
  }, [voiceState.status]);

  // 音声生成のトリガー
  useEffect(() => {
    if (shouldGenerate && voiceState.status === 'idle' && !hasGeneratedRef.current) {
      generateVoice();
    }
  }, [shouldGenerate, voiceState.status, generateVoice]);

  return {
    voiceState,
    play,
    stop,
    isPlaying: voiceState.status === 'playing',
    isReady: voiceState.status === 'ready',
    isGenerating: voiceState.status === 'generating',
    hasError: voiceState.status === 'error',
  };
};