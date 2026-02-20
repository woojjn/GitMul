import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { BundleRefInfo, BundleVerifyResult } from '../types/git';
import {
  Package, Download, Upload, CheckCircle, XCircle,
  X, FileArchive, RefreshCw, FolderOpen
} from 'lucide-react';

interface BundleManagerProps {
  repoPath: string;
  onClose?: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const BundleManager: React.FC<BundleManagerProps> = ({
  repoPath,
  onClose,
  onSuccess,
  onError,
}) => {
  const [refs, setRefs] = useState<BundleRefInfo[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'import' | 'verify'>('create');
  const [verifyResult, setVerifyResult] = useState<BundleVerifyResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    loadRefs();
  }, [repoPath]);

  const loadRefs = async () => {
    try {
      setLoading(true);
      const data = await api.listBundleRefs(repoPath);
      setRefs(data);
      // Select all by default
      setSelectedRefs(new Set(data.map(r => r.name)));
    } catch (err: any) {
      onError?.(`Ref 목록 조회 실패: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleRef = (name: string) => {
    setSelectedRefs(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => setSelectedRefs(new Set(refs.map(r => r.name)));
  const selectNone = () => setSelectedRefs(new Set());

  const handleCreateBundle = async () => {
    try {
      const savePath = await api.saveFileDialog(
        '번들 파일 저장',
        'repo.bundle',
        [{ name: 'Git Bundle', extensions: ['bundle'] }]
      );
      if (!savePath) return;

      setLoading(true);
      setStatusMessage('번들 생성 중...');

      const result = await api.createBundle(
        repoPath,
        savePath,
        Array.from(selectedRefs)
      );

      if (result.success) {
        const sizeKB = (result.file_size / 1024).toFixed(1);
        setStatusMessage(`✅ ${result.message} (${sizeKB} KB)`);
        onSuccess?.(result.message);
      }
    } catch (err: any) {
      setStatusMessage(`❌ ${err}`);
      onError?.(`번들 생성 실패: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportBundle = async () => {
    try {
      const filePath = await api.openFileDialog(
        '번들 파일 선택',
        [{ name: 'Git Bundle', extensions: ['bundle'] }]
      );
      if (!filePath) return;

      setLoading(true);
      setStatusMessage('번들에서 페치 중...');

      const result = await api.fetchFromBundle(repoPath, filePath as string);
      setStatusMessage(`✅ ${result}`);
      onSuccess?.(result);
    } catch (err: any) {
      setStatusMessage(`❌ ${err}`);
      onError?.(`번들 임포트 실패: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBundle = async () => {
    try {
      const filePath = await api.openFileDialog(
        '번들 파일 선택',
        [{ name: 'Git Bundle', extensions: ['bundle'] }]
      );
      if (!filePath) return;

      setLoading(true);
      setStatusMessage('번들 검증 중...');
      setVerifyResult(null);

      const result = await api.verifyBundle(repoPath, filePath as string);
      setVerifyResult(result);
      setStatusMessage(result.valid ? '✅ 번들이 유효합니다' : '❌ 번들이 유효하지 않습니다');
    } catch (err: any) {
      setStatusMessage(`❌ ${err}`);
      onError?.(`번들 검증 실패: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloneFromBundle = async () => {
    try {
      const filePath = await api.openFileDialog(
        '번들 파일 선택',
        [{ name: 'Git Bundle', extensions: ['bundle'] }]
      );
      if (!filePath) return;

      const targetPath = await api.openDirectoryDialog('클론 대상 폴더 선택');
      if (!targetPath) return;

      setLoading(true);
      setStatusMessage('번들에서 클론 중...');

      const result = await api.cloneFromBundle(filePath as string, targetPath as string);
      setStatusMessage(`✅ ${result}`);
      onSuccess?.(result);
    } catch (err: any) {
      setStatusMessage(`❌ ${err}`);
      onError?.(`번들 클론 실패: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="min-h-[3rem] border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Package size={18} />
          Git Bundle
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {([
          { key: 'create', label: '번들 생성', icon: Upload },
          { key: 'import', label: '번들 임포트', icon: Download },
          { key: 'verify', label: '번들 검증', icon: CheckCircle },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setStatusMessage(''); setVerifyResult(null); }}
            className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${
              activeTab === key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* === Create Tab === */}
        {activeTab === 'create' && (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                선택한 브랜치와 태그를 <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.bundle</code> 파일로 내보냅니다.
                네트워크 없이 레포지토리를 전달할 수 있습니다.
              </p>
            </div>

            {/* Ref selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  포함할 Ref 선택 ({selectedRefs.size}/{refs.length})
                </h4>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">전체 선택</button>
                  <button onClick={selectNone} className="text-xs text-gray-500 hover:underline">선택 해제</button>
                  <button onClick={loadRefs} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto">
                {refs.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">Ref가 없습니다</div>
                ) : (
                  refs.map(ref_ => (
                    <label
                      key={ref_.name}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRefs.has(ref_.name)}
                        onChange={() => toggleRef(ref_.name)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        ref_.ref_type === 'branch'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {ref_.ref_type === 'branch' ? '브랜치' : '태그'}
                      </span>
                      <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{ref_.name}</span>
                      <span className="text-xs font-mono text-gray-500">{ref_.commit_sha}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={handleCreateBundle}
              disabled={loading || selectedRefs.size === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload size={16} />
              {loading ? '생성 중...' : '번들 파일 생성'}
            </button>
          </>
        )}

        {/* === Import Tab === */}
        {activeTab === 'import' && (
          <>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-800 dark:text-green-300">
                <code className="bg-green-100 dark:bg-green-800 px-1 rounded">.bundle</code> 파일에서 커밋을 가져옵니다 (fetch).
                또는 번들에서 새로운 레포지토리를 클론할 수 있습니다.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleImportBundle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download size={16} />
                {loading ? '임포트 중...' : '번들에서 Fetch (현재 레포에 가져오기)'}
              </button>

              <button
                onClick={handleCloneFromBundle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FolderOpen size={16} />
                {loading ? '클론 중...' : '번들에서 Clone (새 레포 생성)'}
              </button>
            </div>
          </>
        )}

        {/* === Verify Tab === */}
        {activeTab === 'verify' && (
          <>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                번들 파일의 무결성을 확인하고 포함된 Ref를 조회합니다.
              </p>
            </div>

            <button
              onClick={handleVerifyBundle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileArchive size={16} />
              {loading ? '검증 중...' : '번들 파일 검증'}
            </button>

            {verifyResult && (
              <div className={`border rounded-lg p-4 ${
                verifyResult.valid
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {verifyResult.valid ? (
                    <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle size={20} className="text-red-600 dark:text-red-400" />
                  )}
                  <span className={`font-medium ${
                    verifyResult.valid
                      ? 'text-green-800 dark:text-green-300'
                      : 'text-red-800 dark:text-red-300'
                  }`}>
                    {verifyResult.message}
                  </span>
                </div>

                {verifyResult.refs.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      포함된 Ref ({verifyResult.refs.length})
                    </h5>
                    <div className="space-y-1">
                      {verifyResult.refs.map((ref_, idx) => (
                        <div
                          key={idx}
                          className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-2 py-1.5 rounded"
                        >
                          {ref_}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default BundleManager;
