import React, { useEffect, useState } from 'react';
import { Message } from './Message';
import { useMessageVoice } from '../hooks/useMessageVoice';
import { useSettings } from '../contexts/SettingsContext';

interface AssistantMessageProps {
  messageId: string;
  content: string;
  isStreaming: boolean;
  onVoiceReady: (messageId: string, playFn: () => Promise<void>) => void;
  showImmediately?: boolean;
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  messageId,
  content,
  isStreaming,
  onVoiceReady,
  showImmediately = false,
}) => {
  const { settings } = useSettings();
  const [isVisible, setIsVisible] = useState(false); // 音声生成完了まで非表示
  const [hasRegisteredVoice, setHasRegisteredVoice] = useState(false);
  const previousContentRef = React.useRef(content);
  
  const isVoiceEnabled = Boolean(settings.nijivoiceApiKey && settings.nijivoiceActorId);
  

  // 音声生成のトリガー条件（ストリーミングが終了し、コンテンツがある場合）
  const shouldGenerateVoice = !isStreaming && content.trim().length > 0;
  
  const { voiceState, play, isPlaying } = useMessageVoice(
    messageId,
    content,
    shouldGenerateVoice && isVoiceEnabled
  );

  // 音声が準備できたらキューに追加し、メッセージを表示
  useEffect(() => {
    if (voiceState.status === 'ready' && isVoiceEnabled && !hasRegisteredVoice) {
      console.log('[AssistantMessage] 音声準備完了、キューに追加:', messageId);
      setHasRegisteredVoice(true);
      onVoiceReady(messageId, async () => {
        setIsVisible(true); // 音声再生開始時にメッセージを表示
        await play();
      });
    } else if (voiceState.status === 'error' && isVoiceEnabled) {
      // 音声生成エラー時もメッセージは表示
      console.log('[AssistantMessage] 音声生成エラー、メッセージのみ表示:', messageId);
      setIsVisible(true);
    }
  }, [voiceState.status, messageId, play, onVoiceReady, isVoiceEnabled, hasRegisteredVoice]);

  // 音声無効時は即座に表示
  useEffect(() => {
    if (!isVoiceEnabled) {
      setIsVisible(true);
    }
  }, [isVoiceEnabled]);


  // デバッグログ
  useEffect(() => {
    console.log('[AssistantMessage] 状態:', {
      messageId,
      isStreaming,
      contentLength: content.length,
      shouldGenerateVoice,
      voiceStatus: voiceState.status,
      isVisible,
      isVoiceEnabled,
      hasRegisteredVoice,
    });
  }, [messageId, isStreaming, content.length, shouldGenerateVoice, voiceState.status, isVisible, isVoiceEnabled, hasRegisteredVoice]);


  // 音声生成中の表示
  if (!isVisible && isVoiceEnabled && voiceState.status === 'generating') {
    return (
      <>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ 
          padding: '12px 24px', 
          color: '#64748b',
          fontStyle: 'italic',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>🎵</span>
          音声を生成しています...
        </div>
      </>
    );
  }

  if (!isVisible) {
    return null;
  }

  return (
    <Message
      role="assistant"
      content={content}
      isVoiceEnabled={isVoiceEnabled}
      isPlaying={isPlaying}
      onPlayVoice={voiceState.status === 'ready' ? play : undefined}
    />
  );
};