import { useState, useRef, useCallback, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface VoiceQueueItem {
  messageId: string;
  text: string;
  audioBase64?: string;
  isGenerating?: boolean;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
}

export const useVoicePlayer = () => {
  const { settings } = useSettings();
  const [voiceQueue, setVoiceQueue] = useState<VoiceQueueItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingRef = useRef(false);

  // 音声を生成
  const generateVoice = useCallback(async (text: string, messageId: string) => {
    if (!settings.nijivoiceApiKey || !settings.nijivoiceActorId) {
      return null;
    }

    try {
      
      const response = await fetch('/api/nijivoice/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nijivoice-api-key': settings.nijivoiceApiKey,
        },
        body: JSON.stringify({
          actorId: settings.nijivoiceActorId,
          text,
          speed: 1.0,
          format: 'wav',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate voice');
      }

      const data = await response.json();
      // Nijivoice APIのレスポンス形式に応じて調整
      const audioData = data.generatedVoice?.base64Audio || 
                       data.generatedVoice?.audioContent || 
                       data.generatedVoice?.audioFileUrl ||
                       data.audioFileUrl || data.audio_file_url || 
                       data.audioBase64 || data.audio_base64;
      
      
      return audioData;
    } catch (error) {
      console.error('Voice generation error:', error);
      return null;
    }
  }, [settings.nijivoiceApiKey, settings.nijivoiceActorId]);

  // 音声をキューに追加
  const addToQueue = useCallback((messageId: string, text: string, onPlayStart?: () => void, onPlayEnd?: () => void) => {
    console.log('[VoicePlayer] addToQueue呼び出し:', {
      messageId,
      hasApiKey: !!settings.nijivoiceApiKey,
      hasActorId: !!settings.nijivoiceActorId,
      textLength: text.length
    });
    
    if (!settings.nijivoiceApiKey || !settings.nijivoiceActorId) {
      console.log('[VoicePlayer] APIキーまたはActorIDが未設定');
      return;
    }

    setVoiceQueue(prev => [...prev, {
      messageId,
      text,
      isGenerating: true,
      onPlayStart,
      onPlayEnd,
    }]);

    // 音声生成を開始
    generateVoice(text, messageId).then(audioBase64 => {
      setVoiceQueue(prev => 
        prev.map(item => 
          item.messageId === messageId 
            ? { ...item, audioBase64, isGenerating: false }
            : item
        )
      );
      console.log('[VoicePlayer] 音声生成完了:', { messageId, hasAudio: !!audioBase64 });
    });
  }, [settings.nijivoiceApiKey, settings.nijivoiceActorId, generateVoice]);

  // 次の音声を再生
  const playNext = useCallback(async () => {
    if (isProcessingRef.current) return;
    
    const nextItem = voiceQueue.find(item => !item.isGenerating && item.audioBase64);
    if (!nextItem) {
      setIsPlaying(false);
      setCurrentPlayingId(null);
      return;
    }

    isProcessingRef.current = true;
    setCurrentPlayingId(nextItem.messageId);
    setIsPlaying(true);
    
    // 再生開始時のコールバックを実行
    if (nextItem.onPlayStart) {
      nextItem.onPlayStart();
    }

    try {
      // 音声を再生（URLまたはBase64に対応）
      if (!nextItem.audioBase64) {
        throw new Error('Audio data is missing');
      }
      const audioSrc = nextItem.audioBase64.startsWith('http') 
        ? nextItem.audioBase64 
        : `data:audio/wav;base64,${nextItem.audioBase64}`;
      const audio = new Audio(audioSrc);
      audioRef.current = audio;
      
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('Audio playback failed'));
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('Audio playback error:', error);
    } finally {
      // 再生終了時のコールバックを実行
      if (nextItem.onPlayEnd) {
        nextItem.onPlayEnd();
      }
      
      // キューから削除
      setVoiceQueue(prev => prev.filter(item => item.messageId !== nextItem.messageId));
      isProcessingRef.current = false;
      
      // 次の音声を再生
      setTimeout(() => playNext(), 500);
    }
  }, [voiceQueue]);

  // 特定のメッセージの音声を再生
  const playMessage = useCallback(async (messageId: string, text: string) => {
    if (!settings.nijivoiceApiKey || !settings.nijivoiceActorId) {
      return;
    }

    setIsPlaying(true);
    setCurrentPlayingId(messageId);

    try {
      const audioBase64 = await generateVoice(text, messageId);
      if (!audioBase64) {
        throw new Error('Failed to generate voice');
      }

      const audioSrc = audioBase64.startsWith('http') 
        ? audioBase64 
        : `data:audio/wav;base64,${audioBase64}`;
      const audio = new Audio(audioSrc);
      audioRef.current = audio;
      
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('Audio playback failed'));
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('Audio playback error:', error);
    } finally {
      setIsPlaying(false);
      setCurrentPlayingId(null);
    }
  }, [settings.nijivoiceApiKey, settings.nijivoiceActorId, generateVoice]);

  // 再生を停止
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPlayingId(null);
    setVoiceQueue([]);
    isProcessingRef.current = false;
  }, []);

  // キューに音声がある場合は自動再生を開始
  useEffect(() => {
    const hasReadyItems = voiceQueue.some(item => !item.isGenerating && item.audioBase64);
    console.log('[VoicePlayer] キュー状態:', {
      queueLength: voiceQueue.length,
      hasReadyItems,
      isPlaying,
      isProcessing: isProcessingRef.current
    });
    if (hasReadyItems && !isPlaying && !isProcessingRef.current) {
      console.log('[VoicePlayer] 自動再生開始');
      playNext();
    }
  }, [voiceQueue, isPlaying, playNext]);

  return {
    isPlaying,
    currentPlayingId,
    addToQueue,
    playMessage,
    stop,
    voiceQueue,
    isVoiceEnabled: Boolean(settings.nijivoiceApiKey && settings.nijivoiceActorId),
  };
};