import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { SDKMessage } from '@anthropic-ai/claude-code';
import { Message } from './Message';
import { MessageDetail } from './MessageDetail';
import { AssistantMessage } from './AssistantMessage';
import { useVoiceQueue } from '../hooks/useVoiceQueue';
import { useSettings } from '../contexts/SettingsContext';
import styles from './ChatMessages.module.css';

interface ChatMessagesProps {
  messages: SDKMessage[];
  isStreaming?: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isStreaming = false }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<SDKMessage | null>(null);
  const { settings } = useSettings();
  const { enqueue } = useVoiceQueue();
  const enqueuedMessagesRef = useRef<Set<string>>(new Set());
  
  const isVoiceEnabled = Boolean(settings.nijivoiceApiKey && settings.nijivoiceActorId);
  const isUsingApiKey = Boolean(settings.apiKey);

  useEffect(() => {
    // 新しいメッセージが追加されたら下にスクロール
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 音声準備完了時のコールバック
  const handleVoiceReady = useCallback((messageId: string, playFn: () => Promise<void>) => {
    if (!enqueuedMessagesRef.current.has(messageId)) {
      console.log('[ChatMessages] 音声をキューに追加:', messageId);
      enqueuedMessagesRef.current.add(messageId);
      enqueue(messageId, playFn);
    }
  }, [enqueue]);

  const renderMessage = (message: SDKMessage, index: number) => {
    if (message.type === 'user' && 'message' in message) {
      const content = message.message.content.find(c => c.type === 'text')?.text || '';
      // 空のメッセージは表示しない
      if (!content.trim()) {
        return null;
      }
      return (
        <Message
          key={`${message.type}-${index}`}
          role="user"
          content={content}
        />
      );
    }

    if (message.type === 'assistant' && 'message' in message) {
      const textContent = message.message.content.find(c => c.type === 'text')?.text || '';
      const toolUseContent = message.message.content.filter(c => c.type === 'tool_use');
      
      // テキストコンテンツもツール使用もない場合はスキップ
      if (!textContent.trim() && toolUseContent.length === 0) {
        return null;
      }
      
      // メッセージIDを一意にするため、コンテンツのハッシュも含める
      const contentHash = textContent.trim().substring(0, 20).replace(/\s+/g, '-');
      const messageId = `assistant-${index}-${contentHash}-${message.session_id || 'unknown'}`;
      
      return (
        <div key={`${message.type}-${index}`} className={styles.assistantBlock}>
          {/* ツール使用情報を表示 */}
          {toolUseContent.length > 0 && (
            <div className={styles.toolUseSection}>
              {toolUseContent.map((tool, toolIndex) => (
                <div key={toolIndex} className={styles.toolUseItem}>
                  <div className={styles.toolUseHeader}>
                    <span className={styles.toolIcon}>🔧</span>
                    <span className={styles.toolName}>{tool.name}</span>
                  </div>
                  <details className={styles.toolUseDetails}>
                    <summary>入力パラメータ</summary>
                    <pre className={styles.toolInput}>
                      {JSON.stringify(tool.input, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
          
          {/* テキストメッセージを表示 */}
          {textContent.trim() && (
            <div className={styles.messageWrapper}>
              <AssistantMessage
                messageId={messageId}
                content={textContent}
                isStreaming={isStreaming && index === messages.length - 1}
                onVoiceReady={handleVoiceReady}
                showImmediately={!isVoiceEnabled}
              />
              <button 
                className={styles.detailButton}
                onClick={() => setSelectedMessage(message)}
                title="詳細を表示"
              >
                📋
              </button>
            </div>
          )}
        </div>
      );
    }

    if (message.type === 'system' && message.subtype === 'init') {
      // SDKSystemMessageのプロパティから直接情報を取得
      const cwd = message.cwd || '';
      const model = message.model || '';
      const sessionId = message.session_id || '';
      
      
      return (
        <div key={`${message.type}-${index}`} className={styles.systemMessage}>
          <div className={styles.systemIcon}>🚀</div>
          <div className={styles.systemContent}>
            <span className={styles.systemTitle}>セッション開始</span>
            <span className={styles.separator}>・</span>
            {model && <span>{model}</span>}
            <span className={styles.separator}>・</span>
            <span>{isUsingApiKey ? 'APIキー使用' : 'Claude Code Max'}</span>
            {sessionId && (
              <>
                <span className={styles.separator}>・</span>
                <span className={styles.sessionId}>ID: {sessionId.slice(0, 8)}...</span>
              </>
            )}
          </div>
        </div>
      );
    }

    // セッション終了メッセージ（resultメッセージ）
    if (message.type === 'result') {
      // resultメッセージは直接プロパティを持っている
      const isError = 'is_error' in message && message.is_error;
      const subtype = 'subtype' in message ? message.subtype : '';
      const numTurns = 'num_turns' in message ? message.num_turns : null;
      const durationMs = 'duration_ms' in message ? message.duration_ms : null;
      const totalCostUsd = 'total_cost_usd' in message ? message.total_cost_usd : null;
      
      return (
        <div key={`${message.type}-${index}`} className={`${styles.resultMessage} ${isError ? styles.errorResult : ''}`}>
          <div className={styles.resultIcon}>{isError ? '❌' : '✅'}</div>
          <div className={styles.resultContent}>
            <span className={styles.resultTitle}>セッション終了</span>
            {isError && <span className={styles.errorBadge}>エラー</span>}
            {subtype === 'error_max_turns' && <span className={styles.errorBadge}>最大ターン数到達</span>}
            {numTurns !== null && (
              <>
                <span className={styles.separator}>・</span>
                <span>{numTurns}ターン</span>
              </>
            )}
            {durationMs !== null && (
              <>
                <span className={styles.separator}>・</span>
                <span>{(durationMs / 1000).toFixed(1)}秒</span>
              </>
            )}
            {totalCostUsd !== null && (
              <>
                <span className={styles.separator}>・</span>
                <span className={styles.costHighlight}>${totalCostUsd.toFixed(3)}</span>
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.messageList}>
        {messages.map((message, index) => renderMessage(message, index))}
        {isStreaming && (
          <div className={styles.streamingIndicator}>
            <span className={styles.streamingDot}></span>
            <span className={styles.streamingDot}></span>
            <span className={styles.streamingDot}></span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {selectedMessage && (
        <MessageDetail
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </div>
  );
};