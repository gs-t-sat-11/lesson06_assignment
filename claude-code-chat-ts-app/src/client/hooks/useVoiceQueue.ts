import { useState, useEffect, useRef, useCallback } from 'react';

interface QueueItem {
  messageId: string;
  onPlay: () => Promise<void>;
}

export const useVoiceQueue = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const currentItemRef = useRef<string | null>(null);

  // キューに追加
  const enqueue = useCallback((messageId: string, onPlay: () => Promise<void>) => {
    console.log('[VoiceQueue] エンキュー:', messageId);
    setQueue(prev => {
      // 既に存在する場合は追加しない
      if (prev.some(item => item.messageId === messageId)) {
        console.log('[VoiceQueue] 既にキューに存在:', messageId);
        return prev;
      }
      return [...prev, { messageId, onPlay }];
    });
  }, []);

  // 次のアイテムを処理
  const processNext = useCallback(async () => {
    if (isProcessing || queue.length === 0) {
      return;
    }

    const [nextItem, ...rest] = queue;
    if (!nextItem) return;

    console.log('[VoiceQueue] 処理開始:', nextItem.messageId);
    setIsProcessing(true);
    currentItemRef.current = nextItem.messageId;

    try {
      await nextItem.onPlay();
    } catch (error) {
      console.error('[VoiceQueue] 再生エラー:', error);
    } finally {
      console.log('[VoiceQueue] 処理完了:', nextItem.messageId);
      setQueue(rest);
      setIsProcessing(false);
      currentItemRef.current = null;
    }
  }, [queue, isProcessing]);

  // キューの処理を監視
  useEffect(() => {
    if (!isProcessing && queue.length > 0) {
      // 少し遅延を入れて連続再生を滑らかに
      const timer = setTimeout(() => {
        processNext();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [queue, isProcessing, processNext]);

  return {
    enqueue,
    isProcessing,
    queueLength: queue.length,
    currentMessageId: currentItemRef.current,
  };
};