import { useState, useEffect } from 'react';
import { X, Save, RefreshCw, User, Mail, Globe, GitBranch, Shield } from 'lucide-react';
import * as api from '../services/api';
import type { HookInfo } from '../services/api';

interface RepoSettingsPanelProps {
  repoPath: string;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

type SettingsTab = 'general' | 'remotes' | 'hooks';

interface ConfigState {
  'user.name': string;
  'user.email': string;
  'core.autocrlf': string;
  'core.eol': string;
  'core.ignorecase': string;
  'pull.rebase': string;
  'push.default': string;
  'merge.ff': string;
  [key: string]: string;
}

interface RemoteEntry {
  name: string;
  url: string;
  originalUrl: string;
}

export default function RepoSettingsPanel({ repoPath, onClose, onSuccess, onError }: RepoSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(true);

  // General config
  const [config, setConfig] = useState<ConfigState>({
    'user.name': '',
    'user.email': '',
    'core.autocrlf': '',
    'core.eol': '',
    'core.ignorecase': '',
    'pull.rebase': '',
    'push.default': '',
    'merge.ff': '',
  });
  const [originalConfig, setOriginalConfig] = useState<ConfigState>({} as ConfigState);

  // Remotes
  const [remotes, setRemotes] = useState<RemoteEntry[]>([]);

  // Hooks
  const [hooks, setHooks] = useState<HookInfo[]>([]);

  useEffect(() => {
    loadAll();
  }, [repoPath]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [configData, remotesData, hooksData] = await Promise.allSettled([
        api.getGitConfig(repoPath),
        api.listRemotes(repoPath),
        api.listGitHooks(repoPath),
      ]);

      if (configData.status === 'fulfilled') {
        const c = { ...config, ...configData.value };
        setConfig(c);
        setOriginalConfig({ ...c });
      }

      if (remotesData.status === 'fulfilled') {
        const entries: RemoteEntry[] = [];
        for (const r of remotesData.value) {
          try {
            const url = await api.getRemoteUrl(repoPath, r.name);
            entries.push({ name: r.name, url, originalUrl: url });
          } catch {
            entries.push({ name: r.name, url: '', originalUrl: '' });
          }
        }
        setRemotes(entries);
      }

      if (hooksData.status === 'fulfilled') {
        setHooks(hooksData.value);
      }
    } catch {
      onError?.('설정 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      for (const key of Object.keys(config)) {
        if (config[key] !== originalConfig[key] && config[key].trim()) {
          await api.setGitConfig(repoPath, key, config[key].trim());
        }
      }
      setOriginalConfig({ ...config });
      onSuccess?.('설정 저장 완료');
    } catch (e) {
      onError?.(`설정 저장 실패: ${e}`);
    }
  };

  const saveRemoteUrl = async (remote: RemoteEntry) => {
    if (remote.url === remote.originalUrl) return;
    try {
      await api.setRemoteUrl(repoPath, remote.name, remote.url);
      setRemotes(prev => prev.map(r =>
        r.name === remote.name ? { ...r, originalUrl: r.url } : r
      ));
      onSuccess?.(`${remote.name} URL 변경 완료`);
    } catch (e) {
      onError?.(`URL 변경 실패: ${e}`);
    }
  };

  const handleToggleHook = async (hookName: string, enable: boolean) => {
    try {
      await api.toggleGitHook(repoPath, hookName, enable);
      setHooks(prev => prev.map(h =>
        h.name === hookName ? { ...h, enabled: enable, has_sample: !enable } : h
      ));
      onSuccess?.(`${hookName} ${enable ? '활성화' : '비활성화'} 완료`);
    } catch (e) {
      onError?.(`Hook 변경 실패: ${e}`);
    }
  };

  const hasConfigChanges = Object.keys(config).some(k => config[k] !== originalConfig[k]);

  const renderGeneralTab = () => (
    <div className="p-4 space-y-4">
      {/* User */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-2 flex items-center gap-1.5">
          <User size={11} />
          User
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[#888] w-[80px] flex-shrink-0">user.name</label>
            <input
              value={config['user.name']}
              onChange={e => setConfig(prev => ({ ...prev, 'user.name': e.target.value }))}
              className="flex-1 bg-[#333] text-[12px] text-[#ccc] px-2 py-1 rounded border border-[#3c3c3c] outline-none focus:border-[#0078d4]"
              placeholder="Your Name"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[#888] w-[80px] flex-shrink-0">user.email</label>
            <input
              value={config['user.email']}
              onChange={e => setConfig(prev => ({ ...prev, 'user.email': e.target.value }))}
              className="flex-1 bg-[#333] text-[12px] text-[#ccc] px-2 py-1 rounded border border-[#3c3c3c] outline-none focus:border-[#0078d4]"
              placeholder="you@example.com"
            />
          </div>
        </div>
      </div>

      {/* Core */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-2 flex items-center gap-1.5">
          <GitBranch size={11} />
          Core
        </div>
        <div className="space-y-2">
          <ConfigSelect
            label="core.autocrlf"
            value={config['core.autocrlf']}
            options={['', 'true', 'false', 'input']}
            onChange={v => setConfig(prev => ({ ...prev, 'core.autocrlf': v }))}
          />
          <ConfigSelect
            label="core.eol"
            value={config['core.eol']}
            options={['', 'lf', 'crlf', 'native']}
            onChange={v => setConfig(prev => ({ ...prev, 'core.eol': v }))}
          />
          <ConfigSelect
            label="core.ignorecase"
            value={config['core.ignorecase']}
            options={['', 'true', 'false']}
            onChange={v => setConfig(prev => ({ ...prev, 'core.ignorecase': v }))}
          />
        </div>
      </div>

      {/* Workflow */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-2">Workflow</div>
        <div className="space-y-2">
          <ConfigSelect
            label="pull.rebase"
            value={config['pull.rebase']}
            options={['', 'true', 'false', 'merges']}
            onChange={v => setConfig(prev => ({ ...prev, 'pull.rebase': v }))}
          />
          <ConfigSelect
            label="push.default"
            value={config['push.default']}
            options={['', 'simple', 'current', 'upstream', 'matching']}
            onChange={v => setConfig(prev => ({ ...prev, 'push.default': v }))}
          />
          <ConfigSelect
            label="merge.ff"
            value={config['merge.ff']}
            options={['', 'true', 'false', 'only']}
            onChange={v => setConfig(prev => ({ ...prev, 'merge.ff': v }))}
          />
        </div>
      </div>

      {/* Save button */}
      {hasConfigChanges && (
        <div className="pt-2 border-t border-[#3c3c3c]">
          <button
            onClick={saveConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0078d4] text-white text-[12px] rounded hover:bg-[#1a8ae8] transition-colors"
          >
            <Save size={12} />
            저장
          </button>
        </div>
      )}
    </div>
  );

  const renderRemotesTab = () => (
    <div className="p-4 space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-2 flex items-center gap-1.5">
        <Globe size={11} />
        Remote URLs
      </div>
      {remotes.length === 0 ? (
        <div className="text-[12px] text-[#555] text-center py-4">No remotes configured</div>
      ) : (
        remotes.map(remote => (
          <div key={remote.name} className="space-y-1">
            <div className="text-[11px] font-semibold text-[#ccc]">{remote.name}</div>
            <div className="flex gap-2">
              <input
                value={remote.url}
                onChange={e => {
                  const newUrl = e.target.value;
                  setRemotes(prev => prev.map(r =>
                    r.name === remote.name ? { ...r, url: newUrl } : r
                  ));
                }}
                className="flex-1 bg-[#333] text-[12px] text-[#ccc] font-mono px-2 py-1 rounded border border-[#3c3c3c] outline-none focus:border-[#0078d4]"
              />
              {remote.url !== remote.originalUrl && (
                <button
                  onClick={() => saveRemoteUrl(remote)}
                  className="px-2 py-1 bg-[#0078d4] text-white text-[11px] rounded hover:bg-[#1a8ae8] transition-colors"
                >
                  <Save size={11} />
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderHooksTab = () => (
    <div className="p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-2 flex items-center gap-1.5">
        <Shield size={11} />
        Git Hooks
      </div>
      <div className="text-[10px] text-[#666] mb-3">
        Hook을 활성화/비활성화할 수 있습니다. (.sample 파일로 토글)
      </div>
      {hooks.length === 0 ? (
        <div className="text-[12px] text-[#555] text-center py-4">No hooks found</div>
      ) : (
        <div className="space-y-1">
          {hooks.map(hook => (
            <div
              key={hook.name}
              className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#2a2d2e] transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${hook.enabled ? 'bg-green-400' : 'bg-[#555]'}`} />
                <span className="text-[12px] text-[#ccc] font-mono">{hook.name}</span>
              </div>
              {(hook.enabled || hook.has_sample) && (
                <button
                  onClick={() => handleToggleHook(hook.name, !hook.enabled)}
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                    hook.enabled
                      ? 'text-[#e57373] hover:bg-[#3a1e1e]'
                      : 'text-[#81c784] hover:bg-[#1e3a1e]'
                  }`}
                >
                  {hook.enabled ? 'Disable' : 'Enable'}
                </button>
              )}
              {!hook.enabled && !hook.has_sample && (
                <span className="text-[10px] text-[#555] italic">없음</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c] flex-shrink-0">
        <h3 className="text-[13px] font-semibold text-white">Repository Settings</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="p-1 text-[#888] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
            title="새로고침"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-[#888] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center h-[28px] bg-[#252526] border-b border-[#3c3c3c] flex-shrink-0 select-none">
        {(['general', 'remotes', 'hooks'] as SettingsTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 h-full text-[12px] border-b-2 transition-colors ${
              activeTab === tab
                ? 'text-white border-[#0078d4]'
                : 'text-[#888] border-transparent hover:text-[#ccc]'
            }`}
          >
            {tab === 'general' ? 'General' : tab === 'remotes' ? 'Remotes' : 'Hooks'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />
          </div>
        ) : (
          <>
            {activeTab === 'general' && renderGeneralTab()}
            {activeTab === 'remotes' && renderRemotesTab()}
            {activeTab === 'hooks' && renderHooksTab()}
          </>
        )}
      </div>
    </div>
  );
}

function ConfigSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] text-[#888] w-[80px] flex-shrink-0 font-mono">{label.split('.').pop()}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-[#333] text-[12px] text-[#ccc] px-2 py-1 rounded border border-[#3c3c3c] outline-none focus:border-[#0078d4]"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt || '(not set)'}</option>
        ))}
      </select>
    </div>
  );
}
