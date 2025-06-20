import React, { useEffect, useState } from 'react';
import type { ChatSession, NijivoiceActor } from '@shared/types';
import { useSettings } from '../contexts/SettingsContext';
import { VoiceActorAvatar } from './VoiceActorAvatar';
import styles from './SessionList.module.css';

interface SessionListProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession
}) => {
  const { settings } = useSettings();
  const [selectedActor, setSelectedActor] = useState<NijivoiceActor | null>(null);

  // Voice Actorの情報を取得
  useEffect(() => {
    if (settings.nijivoiceActorId) {
      // LocalStorageからキャッシュを確認
      const storageKey = 'claude-code-chat-voice-actors';
      const cached = localStorage.getItem(storageKey);
      
      if (cached) {
        try {
          const data = JSON.parse(cached);
          const actors = data.actors || [];
          const actor = actors.find((a: NijivoiceActor) => a.id === settings.nijivoiceActorId);
          if (actor) {
            setSelectedActor(actor);
          }
        } catch (error) {
          console.error('Failed to parse cached voice actors:', error);
        }
      }
    } else {
      setSelectedActor(null);
    }
  }, [settings.nijivoiceActorId]);
  const formatDate = (date: Date) => {
    const now = new Date();
    const sessionDate = new Date(date);
    const diffMs = now.getTime() - sessionDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}時間前`;
    return sessionDate.toLocaleDateString();
  };

  const getSessionTitle = (session: ChatSession): string => {
    const firstUserMessage = session.messages.find(m => m.type === 'user');
    if (firstUserMessage && 'message' in firstUserMessage) {
      const content = firstUserMessage.message.content.find(c => c.type === 'text')?.text || '';
      return content.slice(0, 50) + (content.length > 50 ? '...' : '');
    }
    return '新しい会話';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>会話履歴</h2>
        <button onClick={onNewSession} className={styles.newButton}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新規
        </button>
      </div>
      
      <div className={styles.list}>
        {sessions.length === 0 ? (
          <div className={styles.empty}>
            <p>会話履歴がありません</p>
          </div>
        ) : (
          sessions.map(session => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`${styles.sessionItem} ${currentSessionId === session.id ? styles.active : ''}`}
            >
              <div className={styles.sessionTitle}>
                {getSessionTitle(session)}
              </div>
              <div className={styles.sessionMeta}>
                <span className={styles.sessionDate}>
                  {formatDate(session.updatedAt)}
                </span>
                {session.status === 'active' && (
                  <span className={styles.statusIndicator} title="アクティブ">●</span>
                )}
                {session.status === 'completed' && (
                  <span className={styles.statusIndicator} title="完了" style={{ color: '#4ade80' }}>✓</span>
                )}
                {session.status === 'error' && (
                  <span className={styles.statusIndicator} title="エラー" style={{ color: '#f87171' }}>!</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
      
      {/* Voice Actorの画像表示 */}
      {selectedActor && (
        <div className={styles.voiceActorSection}>
          <div className={styles.voiceActorHeader}>
            <span className={styles.voiceActorLabel}>Voice Actor</span>
          </div>
          <VoiceActorAvatar size="large" />
        </div>
      )}
    </div>
  );
};