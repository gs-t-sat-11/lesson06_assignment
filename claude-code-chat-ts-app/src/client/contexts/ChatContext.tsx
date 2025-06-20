import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { SDKMessage } from '@anthropic-ai/claude-code';
import type { ChatSession, ChatOptions } from '@shared/types';

interface ChatContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentSession: ChatSession | null;
  isStreaming: boolean;
  error: string | null;
  
  // Actions
  startNewChat: (prompt: string, options?: ChatOptions) => Promise<void>;
  continueChat: (sessionId: string, prompt: string, options?: ChatOptions) => Promise<void>;
  selectSession: (sessionId: string) => void;
  clearError: () => void;
  abortCurrentStream: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  const handleSSEMessage = (sessionId: string, message: SDKMessage) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, messages: [...session.messages, message], updatedAt: new Date() }
        : session
    ));
  };

  const startNewChat = async (prompt: string, options?: ChatOptions) => {
    setError(null);
    setIsStreaming(true);

    // 一時的なセッションIDを生成
    const tempSessionId = `temp-${Date.now()}`;
    
    // ユーザーメッセージを即座に表示
    const userMessage: SDKMessage = {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      },
      parent_tool_use_id: null,
      session_id: tempSessionId
    };
    
    // 一時的なセッションを作成
    const tempSession: ChatSession = {
      id: tempSessionId,
      messages: [userMessage],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };
    
    setSessions(prev => [...prev, tempSession]);
    setCurrentSessionId(tempSessionId);

    try {
      // SDKからセッションIDが返されるまで、一時的な状態を保持
      let sessionCreated = false;
      let actualSessionId: string | null = null;

      // SSE接続を開始
      const response = await fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, options })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is null');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // ストリーミング完了後もセッションはactiveのまま維持
              if (actualSessionId) {
                setSessions(prev => prev.map(s => 
                  s.id === actualSessionId 
                    ? { ...s, updatedAt: new Date() }
                    : s
                ));
              }
              continue;
            }

            try {
              const message: SDKMessage = JSON.parse(data);
              console.log(`[Client] Received message type: ${message.type}`);
              
              // 最初のメッセージからセッションIDを取得してセッションを更新
              if ('session_id' in message && !sessionCreated) {
                actualSessionId = message.session_id;
                sessionCreated = true;
                
                // 一時セッションを実際のセッションIDで更新
                setSessions(prev => prev.map(session => {
                  if (session.id === tempSessionId) {
                    // 実際のセッションIDに更新
                    return {
                      ...session,
                      id: actualSessionId!,
                      messages: session.messages.map(m => ({
                        ...m,
                        session_id: actualSessionId!
                      })),
                      updatedAt: new Date()
                    };
                  }
                  return session;
                }));
                setCurrentSessionId(actualSessionId);
              }

              if (actualSessionId) {
                handleSSEMessage(actualSessionId, message);
              }
            } catch (e) {
              console.error('Failed to parse SSE message:', e);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, status: 'error' }
          : s
      ));
    } finally {
      setIsStreaming(false);
    }
  };

  const continueChat = async (sessionId: string, prompt: string, options?: ChatOptions) => {
    setError(null);
    setIsStreaming(true);

    // ユーザーメッセージを追加
    const userMessage: SDKMessage = {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      },
      parent_tool_use_id: null,
      session_id: sessionId
    };
    
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, messages: [...session.messages, userMessage], updatedAt: new Date() }
        : session
    ));

    try {
      const response = await fetch('/api/chat/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, prompt, options })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is null');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // ストリーミング完了後もセッションはactiveのまま維持
              setSessions(prev => prev.map(s => 
                s.id === sessionId 
                  ? { ...s, updatedAt: new Date() }
                  : s
              ));
              continue;
            }

            try {
              const message: SDKMessage = JSON.parse(data);
              console.log(`[Client] Received message type: ${message.type}`);
              
              // セッションIDが変わった場合（--continueを使った場合）、新しいIDで更新
              if ('session_id' in message && message.session_id !== sessionId) {
                console.log(`Session ID updated from ${sessionId} to ${message.session_id}`);
                const newSessionId = message.session_id;
                setSessions(prev => prev.map(s => 
                  s.id === sessionId 
                    ? { ...s, id: newSessionId }
                    : s
                ));
                setCurrentSessionId(newSessionId);
                handleSSEMessage(newSessionId, message);
              } else {
                handleSSEMessage(sessionId, message);
              }
            } catch (e) {
              console.error('Failed to parse SSE message:', e);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsStreaming(false);
    }
  };

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const clearError = () => {
    setError(null);
  };

  const abortCurrentStream = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    
    if (currentSessionId) {
      fetch(`/api/chat/sessions/${currentSessionId}/abort`, { method: 'DELETE' })
        .catch(console.error);
    }
    
    setIsStreaming(false);
  };

  const value: ChatContextType = {
    sessions,
    currentSessionId,
    currentSession,
    isStreaming,
    error,
    startNewChat,
    continueChat,
    selectSession,
    clearError,
    abortCurrentStream
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};