import React from 'react';
import type { SDKMessage } from '@anthropic-ai/claude-code';
import styles from './MessageDetail.module.css';

interface MessageDetailProps {
  message: SDKMessage;
  onClose: () => void;
}

export const MessageDetail: React.FC<MessageDetailProps> = ({ message, onClose }) => {

  const formatMessage = () => {
    if (message.type === 'assistant' && 'message' in message) {
      return {
        type: 'Assistant Message',
        content: message.message.content,
        role: message.message.role,
        name: message.message.name,
        model: message.message.model,
        stopReason: message.message.stop_reason,
        stopSequence: message.message.stop_sequence,
        usage: message.message.usage,
      };
    }

    if (message.type === 'user' && 'message' in message) {
      return {
        type: 'User Message',
        content: message.message.content,
        role: message.message.role,
        name: message.message.name,
      };
    }

    if (message.type === 'system' && message.subtype === 'init') {
      return {
        type: 'System Init',
        model: message.model,
        tools: message.tools,
        apiKeySource: message.apiKeySource,
        cwd: message.cwd,
        mcp_servers: message.mcp_servers,
        permissionMode: message.permissionMode,
      };
    }

    if (message.type === 'result') {
      const resultData: any = {
        type: 'Result',
        subtype: message.subtype,
        durationMs: message.duration_ms,
        durationApiMs: message.duration_api_ms,
        isError: message.is_error,
        numTurns: message.num_turns,
        sessionId: message.session_id,
        totalCostUsd: message.total_cost_usd,
      };
      
      if ('usage' in message) {
        resultData.usage = message.usage;
      }
      
      if ('result' in message) {
        resultData.result = message.result;
      }
      
      return resultData;
    }

    return message;
  };

  const data = formatMessage();

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>メッセージ詳細</h3>
          <button onClick={onClose} className={styles.closeButton}>✕</button>
        </div>
        <div className={styles.content}>
          <pre className={styles.json}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};