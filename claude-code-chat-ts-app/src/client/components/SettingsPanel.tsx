import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { AVAILABLE_TOOLS, AVAILABLE_MODELS, NijivoiceActor } from '@shared/types';
import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const VOICE_ACTORS_STORAGE_KEY = 'claude-code-chat-voice-actors';
const VOICE_ACTORS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings, exportSettings, importSettings } = useSettings();
  const [importError, setImportError] = useState<string | null>(null);
  const [voiceActors, setVoiceActors] = useState<NijivoiceActor[]>([]);
  const [isLoadingActors, setIsLoadingActors] = useState(false);
  const [actorsError, setActorsError] = useState<string | null>(null);

  // コンポーネント初期化時にLocalStorageからVoice Actorsを読み込む
  useEffect(() => {
    const loadCachedVoiceActors = () => {
      try {
        const cached = localStorage.getItem(VOICE_ACTORS_STORAGE_KEY);
        if (cached) {
          const { actors, timestamp } = JSON.parse(cached);
          const now = Date.now();
          // キャッシュが有効期限内の場合のみ使用
          if (now - timestamp < VOICE_ACTORS_CACHE_DURATION) {
            setVoiceActors(actors);
          } else {
            // 期限切れの場合は削除
            localStorage.removeItem(VOICE_ACTORS_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Failed to load cached voice actors:', error);
        localStorage.removeItem(VOICE_ACTORS_STORAGE_KEY);
      }
    };

    loadCachedVoiceActors();
  }, []);

  if (!isOpen) return null;

  const handleSystemPromptChange = (value: string) => {
    updateSettings({ systemPrompt: value });
  };

  const handleAppendSystemPromptChange = (value: string) => {
    updateSettings({ appendSystemPrompt: value });
  };

  const handleMaxTurnsChange = (value: number) => {
    updateSettings({ maxTurns: value });
  };

  const handleToolToggle = (tool: string, allowed: boolean) => {
    if (allowed) {
      updateSettings({
        allowedTools: [...settings.allowedTools, tool],
        disallowedTools: settings.disallowedTools.filter(t => t !== tool),
      });
    } else {
      updateSettings({
        allowedTools: settings.allowedTools.filter(t => t !== tool),
        disallowedTools: [...settings.disallowedTools, tool],
      });
    }
  };

  const getToolState = (tool: string): 'allowed' | 'disallowed' | 'default' => {
    if (settings.allowedTools.includes(tool)) return 'allowed';
    if (settings.disallowedTools.includes(tool)) return 'disallowed';
    return 'default';
  };

  const handleExport = () => {
    const json = exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claude-code-chat-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (importSettings(content)) {
        setImportError(null);
      } else {
        setImportError('設定ファイルの形式が正しくありません');
      }
    };
    reader.readAsText(file);
  };

  const fetchVoiceActors = async () => {
    if (!settings.nijivoiceApiKey) {
      setActorsError('にじボイスAPIキーが設定されていません');
      return;
    }

    setIsLoadingActors(true);
    setActorsError(null);

    try {
      const response = await fetch('/api/nijivoice/actors', {
        headers: {
          'X-Nijivoice-Api-Key': settings.nijivoiceApiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch voice actors: ${response.statusText}`);
      }

      const data = await response.json();
      // Nijivoice APIのレスポンス構造に合わせて調整
      const actors = data.generationVoiceActors || data.voiceActors || data.voice_actors || [];
      setVoiceActors(actors);
      
      // LocalStorageに保存
      try {
        localStorage.setItem(VOICE_ACTORS_STORAGE_KEY, JSON.stringify({
          actors,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.error('Failed to cache voice actors:', error);
      }
    } catch (error) {
      setActorsError(error instanceof Error ? error.message : 'Voice Actor一覧の取得に失敗しました');
    } finally {
      setIsLoadingActors(false);
    }
  };

  const selectedActor = voiceActors.find(actor => actor.id === settings.nijivoiceActorId);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>設定</h2>
          <button onClick={onClose} className={styles.closeButton}>✕</button>
        </div>

        <div className={styles.content}>
          {/* モデル選択 */}
          <section className={styles.section}>
            <h3>モデル</h3>
            <select
              value={settings.model || 'claude-sonnet-4-20250514'}
              onChange={e => updateSettings({ model: e.target.value })}
              className={styles.select}
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </section>

          {/* システムプロンプト */}
          <section className={styles.section}>
            <h3>システムプロンプト</h3>
            <textarea
              value={settings.systemPrompt || ''}
              onChange={e => handleSystemPromptChange(e.target.value)}
              placeholder="デフォルトのシステムプロンプトを上書きします..."
              className={styles.textarea}
              rows={4}
            />
          </section>

          {/* 追加システムプロンプト */}
          <section className={styles.section}>
            <h3>追加システムプロンプト</h3>
            <textarea
              value={settings.appendSystemPrompt || ''}
              onChange={e => handleAppendSystemPromptChange(e.target.value)}
              placeholder="デフォルトのシステムプロンプトに追加します..."
              className={styles.textarea}
              rows={3}
            />
          </section>

          {/* APIキー */}
          <section className={styles.section}>
            <h3>Anthropic API Key</h3>
            <input
              type="password"
              value={settings.apiKey || ''}
              onChange={e => updateSettings({ apiKey: e.target.value })}
              placeholder="sk-ant-api03-..."
              className={styles.input}
              autoComplete="off"
            />
            <p className={styles.hint}>APIキーを設定します（設定されていない場合はClaude Codeの認証情報を使用）</p>
            {settings.apiKey && (
              <button 
                onClick={() => updateSettings({ apiKey: '' })}
                className={`${styles.button} ${styles.small}`}
                style={{ marginTop: '8px' }}
              >
                APIキーを削除
              </button>
            )}
          </section>

          {/* にじボイスAPIキー */}
          <section className={styles.section}>
            <h3>にじボイス API Key</h3>
            <input
              type="password"
              value={settings.nijivoiceApiKey || ''}
              onChange={e => {
                updateSettings({ nijivoiceApiKey: e.target.value });
                // APIキーが変更されたらキャッシュをクリア
                if (e.target.value !== settings.nijivoiceApiKey) {
                  localStorage.removeItem(VOICE_ACTORS_STORAGE_KEY);
                  setVoiceActors([]);
                }
              }}
              placeholder="にじボイスのAPIキーを入力"
              className={styles.input}
              autoComplete="off"
            />
            <p className={styles.hint}>にじボイスAPIキーを設定します</p>
            {settings.nijivoiceApiKey && (
              <button 
                onClick={() => {
                  updateSettings({ nijivoiceApiKey: '', nijivoiceActorId: '' });
                  // APIキーを削除したらキャッシュもクリア
                  localStorage.removeItem(VOICE_ACTORS_STORAGE_KEY);
                  setVoiceActors([]);
                }}
                className={`${styles.button} ${styles.small}`}
                style={{ marginTop: '8px' }}
              >
                APIキーを削除
              </button>
            )}
          </section>

          {/* Voice Actor選択 */}
          <section className={styles.section}>
            <h3>Voice Actor</h3>
            <div className={styles.actorSelector}>
              <select
                value={settings.nijivoiceActorId || ''}
                onChange={e => updateSettings({ nijivoiceActorId: e.target.value })}
                className={styles.select}
                disabled={!settings.nijivoiceApiKey || voiceActors.length === 0}
              >
                <option value="">選択してください</option>
                {voiceActors.map(actor => (
                  <option key={actor.id} value={actor.id}>
                    {actor.name}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchVoiceActors}
                disabled={!settings.nijivoiceApiKey || isLoadingActors}
                className={styles.button}
                title={voiceActors.length > 0 ? '一覧を更新' : '一覧を取得'}
              >
                {isLoadingActors ? '読み込み中...' : voiceActors.length > 0 ? 'Voice Actor一覧更新' : 'Voice Actor一覧取得'}
              </button>
            </div>
            {actorsError && (
              <div className={styles.error}>{actorsError}</div>
            )}
            {selectedActor && (
              <div className={styles.actorDetails}>
                {selectedActor.smallImageUrl && (
                  <div className={styles.actorImage}>
                    <img 
                      src={selectedActor.smallImageUrl} 
                      alt={selectedActor.name}
                      onError={(e) => {
                          e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {(selectedActor.sampleVoiceUrl || selectedActor.sample_voice_url) && (
                  <div className={styles.voicePlayer}>
                    <audio 
                      controls 
                      src={selectedActor.sampleVoiceUrl || selectedActor.sample_voice_url}
                      className={styles.audioPlayer}
                    >
                      お使いのブラウザは音声再生に対応していません。
                    </audio>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* カレントワーキングディレクトリ */}
          <section className={styles.section}>
            <h3>作業ディレクトリ（cwd）</h3>
            <input
              type="text"
              value={settings.cwd || ''}
              onChange={e => updateSettings({ cwd: e.target.value })}
              placeholder="例: /Users/username/projects/myapp"
              className={styles.input}
            />
            <p className={styles.hint}>Claude Codeが実行される基準ディレクトリを指定します</p>
          </section>

          {/* 最大ターン数 */}
          <section className={styles.section}>
            <h3>最大ターン数: {settings.maxTurns}</h3>
            <input
              type="range"
              min="1"
              max="50"
              value={settings.maxTurns}
              onChange={e => handleMaxTurnsChange(parseInt(e.target.value))}
              className={styles.slider}
            />
            <div className={styles.sliderLabels}>
              <span>1</span>
              <span>25</span>
              <span>50</span>
            </div>
          </section>

          {/* 出力形式 */}
          <section className={styles.section}>
            <h3>出力形式</h3>
            <div className={styles.radioGroup}>
              {(['text', 'json', 'stream-json'] as const).map(format => (
                <label key={format} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="outputFormat"
                    value={format}
                    checked={settings.outputFormat === format}
                    onChange={() => updateSettings({ outputFormat: format })}
                  />
                  <span>{format}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ツール権限 */}
          <section className={styles.section}>
            <h3>ツール権限</h3>
            <div className={styles.toolsList}>
              {AVAILABLE_TOOLS.map(tool => {
                const state = getToolState(tool);
                return (
                  <div key={tool} className={styles.toolItem}>
                    <span className={styles.toolName}>{tool}</span>
                    <div className={styles.toolButtons}>
                      <button
                        className={`${styles.toolButton} ${state === 'allowed' ? styles.active : ''}`}
                        onClick={() => handleToolToggle(tool, true)}
                      >
                        許可
                      </button>
                      <button
                        className={`${styles.toolButton} ${state === 'default' ? styles.active : ''}`}
                        onClick={() => updateSettings({
                          allowedTools: settings.allowedTools.filter(t => t !== tool),
                          disallowedTools: settings.disallowedTools.filter(t => t !== tool),
                        })}
                      >
                        デフォルト
                      </button>
                      <button
                        className={`${styles.toolButton} ${state === 'disallowed' ? styles.active : ''}`}
                        onClick={() => handleToolToggle(tool, false)}
                      >
                        禁止
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* MCP設定 */}
          <section className={styles.section}>
            <h3>MCP (Model Context Protocol) 設定</h3>
            <div className={styles.mcpSection}>
              <p className={styles.hint}>
                MCPを使用すると、ファイルシステム、GitHub、データベースなどの外部ツールを利用できます。
                <a 
                  href="https://docs.anthropic.com/ja/docs/claude-code/sdk#mcp" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.helpLink}
                >
                  詳細はこちら
                </a>
              </p>
              <textarea
                value={settings.mcpConfig || ''}
                onChange={e => updateSettings({ mcpConfig: e.target.value })}
                placeholder={`{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/files"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      }
    }
  }
}`}
                className={styles.mcpTextarea}
                rows={12}
              />
              {settings.mcpConfig && (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(settings.mcpConfig || '{}');
                      updateSettings({ mcpConfig: JSON.stringify(parsed, null, 2) });
                    } catch (e) {
                      alert('無効なJSON形式です: ' + (e as Error).message);
                    }
                  }}
                  className={`${styles.button} ${styles.small}`}
                  style={{ marginTop: '8px' }}
                >
                  JSONをフォーマット
                </button>
              )}
              <div className={styles.mcpExamples}>
                <h4>設定例：</h4>
                <ul>
                  <li><code>filesystem</code> - ファイルシステムへのアクセス</li>
                  <li><code>github</code> - GitHubリポジトリの操作</li>
                  <li><code>postgres</code> - PostgreSQLデータベースへの接続</li>
                </ul>
              </div>
            </div>
          </section>

          {/* インポート/エクスポート */}
          <section className={styles.section}>
            <h3>設定の管理</h3>
            <div className={styles.buttonGroup}>
              <button onClick={handleExport} className={styles.button}>
                設定をエクスポート
              </button>
              <label className={styles.button}>
                設定をインポート
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
              <button onClick={resetSettings} className={`${styles.button} ${styles.danger}`}>
                設定をリセット
              </button>
            </div>
            {importError && (
              <div className={styles.error}>{importError}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};