import React from 'react';
import styles from './Message.module.css';

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  isVoiceEnabled?: boolean;
  isPlaying?: boolean;
  onPlayVoice?: () => void;
}

export const Message: React.FC<MessageProps> = ({ role, content, timestamp, isVoiceEnabled, isPlaying, onPlayVoice }) => {
  return (
    <div className={`${styles.message} ${styles[role]}`}>
      <div className={styles.avatar}>
        {role === 'user' ? '👤' : role === 'assistant' ? '🤖' : 'ℹ️'}
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.role}>
            {role === 'user' ? 'You' : role === 'assistant' ? 'Claude' : 'System'}
          </span>
          {timestamp && (
            <span className={styles.timestamp}>
              {timestamp.toLocaleTimeString()}
            </span>
          )}
          {role === 'assistant' && isVoiceEnabled && (
            <button 
              className={`${styles.voiceButton} ${isPlaying ? styles.playing : ''} ${!onPlayVoice ? styles.disabled : ''}`}
              onClick={onPlayVoice}
              disabled={!onPlayVoice}
              title={isPlaying ? '再生中...' : onPlayVoice ? '音声を再生' : '音声を準備中...'}
            >
              {isPlaying ? '⏸️' : '🔊'}
            </button>
          )}
        </div>
        <div className={styles.text}>
          {content.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < content.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};