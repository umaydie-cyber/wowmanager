import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';

import type { SaveFile } from '@/game/core/types';
import { selectOperation, useGameStore } from '@/game/store/useGameStore';
import { parseSaveFile } from '@/persistence/schema';

interface PendingImport {
  fileName: string;
  json: string;
  save: SaveFile;
}

interface ConfirmDialogProps {
  title: string;
  confirmLabel: string;
  isBusy: boolean;
  danger?: boolean;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDialog({
  title,
  confirmLabel,
  isBusy,
  danger = false,
  children,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div
      className="confirm-dialog__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          onCancel();
        }
      }}
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !isBusy) {
            onCancel();
          }
        }}
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <div className="confirm-dialog__body">{children}</div>
        <div className="confirm-dialog__actions">
          <button
            className="fortress-button fortress-button--quiet"
            type="button"
            disabled={isBusy}
            autoFocus
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className={`fortress-button${danger ? ' fortress-button--danger' : ''}`}
            type="button"
            disabled={isBusy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

const downloadSave = (json: string): void => {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `wowmanager-save-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const formatSavedAt = (savedAtEpochMs: number): string =>
  new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(savedAtEpochMs));

export function SaveControls() {
  const operation = useGameStore(selectOperation);
  const saveGame = useGameStore((state) => state.saveGame);
  const exportSave = useGameStore((state) => state.exportSave);
  const importSave = useGameStore((state) => state.importSave);
  const resetSave = useGameStore((state) => state.resetSave);
  const [confirmation, setConfirmation] = useState<'export' | 'reset' | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [fileNotice, setFileNotice] = useState('');
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const isBusy = operation !== 'idle';

  const closeMenu = () => {
    if (detailsRef.current !== null) {
      detailsRef.current.open = false;
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file === undefined) {
      return;
    }

    try {
      const json = await file.text();
      const save = parseSaveFile(JSON.parse(json) as unknown);
      setFileNotice('');
      setPendingImport({ fileName: file.name, json, save });
      closeMenu();
    } catch {
      setPendingImport(null);
      setFileNotice('导入文件已损坏或版本不受支持；原存档未改变。');
    } finally {
      input.value = '';
    }
  };

  const handleConfirmedExport = async () => {
    const json = await exportSave();
    if (json !== null) {
      downloadSave(json);
      setFileNotice('存档文件已下载。');
    }
    setConfirmation(null);
  };

  const handleConfirmedImport = async () => {
    if (pendingImport === null) {
      return;
    }
    const imported = await importSave(pendingImport.json);
    if (imported) {
      setFileNotice(`已导入 ${pendingImport.fileName}。`);
    }
    setPendingImport(null);
  };

  const handleConfirmedReset = async () => {
    const reset = await resetSave();
    if (!reset) {
      setConfirmation(null);
    }
  };

  return (
    <div className="save-controls">
      <details ref={detailsRef}>
        <summary>存档工具</summary>
        <div className="save-controls__menu">
          <p>进度仅保存在当前浏览器；建议定期导出备份。</p>
          <button
            className="fortress-button fortress-button--quiet"
            type="button"
            disabled={isBusy}
            onClick={() => void saveGame()}
          >
            立即保存
          </button>
          <button
            className="fortress-button fortress-button--quiet"
            type="button"
            disabled={isBusy}
            onClick={() => {
              setConfirmation('export');
              closeMenu();
            }}
          >
            导出存档
          </button>
          <label
            className={`fortress-button fortress-button--quiet save-controls__file${
              isBusy ? ' save-controls__file--disabled' : ''
            }`}
          >
            选择存档文件
            <input
              type="file"
              accept="application/json,.json"
              disabled={isBusy}
              onChange={(event) => void handleFileChange(event)}
            />
          </label>
          <button
            className="fortress-button fortress-button--danger"
            type="button"
            disabled={isBusy}
            onClick={() => {
              setConfirmation('reset');
              closeMenu();
            }}
          >
            重置存档
          </button>
        </div>
      </details>

      {fileNotice.length > 0 ? (
        <p
          className={
            fileNotice.includes('损坏') ? 'save-controls__error' : 'save-controls__notice'
          }
          role={fileNotice.includes('损坏') ? 'alert' : 'status'}
        >
          {fileNotice}
        </p>
      ) : null}

      {confirmation === 'export' ? (
        <ConfirmDialog
          title="导出当前存档？"
          confirmLabel="保存并下载"
          isBusy={isBusy}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void handleConfirmedExport()}
        >
          <p>当前进度会先写入 IndexedDB，再下载一份可用于恢复的 JSON 文件。</p>
        </ConfirmDialog>
      ) : null}

      {pendingImport !== null ? (
        <ConfirmDialog
          title="导入并覆盖当前进度？"
          confirmLabel="确认导入"
          isBusy={isBusy}
          danger
          onCancel={() => setPendingImport(null)}
          onConfirm={() => void handleConfirmedImport()}
        >
          <dl className="save-controls__import-summary">
            <div>
              <dt>文件</dt>
              <dd>{pendingImport.fileName}</dd>
            </div>
            <div>
              <dt>保存时间</dt>
              <dd>{formatSavedAt(pendingImport.save.savedAtEpochMs)}</dd>
            </div>
            <div>
              <dt>角色</dt>
              <dd>{pendingImport.save.game.heroes.length} 名</dd>
            </div>
          </dl>
          <p>文件已通过完整校验。确认后才会替换当前本地存档。</p>
        </ConfirmDialog>
      ) : null}

      {confirmation === 'reset' ? (
        <ConfirmDialog
          title="重置本地存档？"
          confirmLabel="永久重置"
          isBusy={isBusy}
          danger
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void handleConfirmedReset()}
        >
          <p>这会删除当前浏览器中的进度并返回标题页，且无法撤销。可先取消并导出备份。</p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
