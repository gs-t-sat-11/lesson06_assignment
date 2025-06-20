import React, { useState, useEffect } from 'react';
import { ChatProvider, useChatContext } from './contexts/ChatContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { SessionList } from './components/SessionList';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { SettingsPanel } from './components/SettingsPanel';
import { VoiceActorAvatar } from './components/VoiceActorAvatar';
import { ChatOptions } from '@shared/types';
import styles from './App.module.css';

function ChatApp() {
  const {
    sessions,
    currentSessionId,
    currentSession,
    isStreaming,
    error,
    startNewChat,
    continueChat,
    selectSession,
    clearError
  } = useChatContext();
  
  const { settings } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [defaultCwd, setDefaultCwd] = useState<string>('');

  useEffect(() => {
    // デフォルトのcwdを取得
    fetch('/api/chat/cwd')
      .then(res => res.json())
      .then(data => setDefaultCwd(data.cwd))
      .catch(err => console.error('Failed to fetch default cwd:', err));
  }, []);

  const handleSendMessage = async (message: string) => {
    const options: ChatOptions = {
      maxTurns: settings.maxTurns,
      systemPrompt: settings.systemPrompt,
      appendSystemPrompt: settings.appendSystemPrompt,
      allowedTools: settings.allowedTools.length > 0 ? settings.allowedTools : undefined,
      disallowedTools: settings.disallowedTools.length > 0 ? settings.disallowedTools : undefined,
      outputFormat: settings.outputFormat,
      permissionMode: settings.permissionMode,
      model: settings.model,
      cwd: settings.cwd,
      apiKey: settings.apiKey,
      mcpConfig: settings.mcpConfig,
    };
    
    if (currentSession && currentSession.status === 'active') {
      await continueChat(currentSession.id, message, options);
    } else {
      await startNewChat(message, options);
    }
  };

  const handleNewSession = () => {
    // Simply clear the current session to start fresh
    selectSession('');
  };

  const handleSelectSession = (sessionId: string) => {
    selectSession(sessionId);
    // モバイルでは選択後にサイドバーを閉じる
    setIsSidebarOpen(false);
  };

  return (
    <div className={styles.container}>
      {/* モバイル用オーバーレイ */}
      <div 
        className={`${styles.mobileOverlay} ${isSidebarOpen ? styles.visible : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
        <SessionList
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
        />
      </aside>
      
      <main className={styles.mainContent}>
        <header className={styles.header}>
          {/* モバイル用ハンバーガーメニュー */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={styles.menuButton}
            aria-label="メニュー"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <h1 className={styles.logo}>Claude Code Chat</h1>
          <VoiceActorAvatar size="small" className={styles.mobileVoiceActor} />
          {currentSession && (
            <span 
              className={styles.sessionInfo}
              title={currentSession.id}
            >
              Session: {currentSession.id}
            </span>
          )}
          {(settings.cwd || defaultCwd) && (
            <span 
              className={styles.cwdInfo}
              title={settings.cwd || defaultCwd}
            >
              📁 {settings.cwd || defaultCwd}
            </span>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={styles.settingsButton}
            aria-label="設定"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
              <path d="M20.5 7.5L16 12l4.5 4.5M3.5 7.5L8 12l-4.5 4.5" />
            </svg>
          </button>
        </header>
        
        <div className={styles.chatArea}>
          <ChatMessages
            messages={currentSession?.messages || []}
            isStreaming={isStreaming}
          />
          
          {error && (
            <div className={styles.error}>
              <span>{error}</span>
              <button onClick={clearError}>✕</button>
            </div>
          )}
          
          <ChatInput
            onSend={handleSendMessage}
            disabled={isStreaming}
            placeholder={isStreaming ? "Claude is thinking..." : "メッセージを入力..."}
          />
        </div>
      </main>
      
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <ChatProvider>
        <ChatApp />
      </ChatProvider>
    </SettingsProvider>
  );
}

export default App;