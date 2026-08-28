import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { getBuildingDefinition } from '@/game/content/buildings';
import type { Position } from '@/game/core/types';
import type {
  FortressCellClick,
  FortressSceneSnapshot,
  PhaserFortressGame,
} from '@/game/phaser/createGame';

interface FortressCanvasProps {
  snapshot: FortressSceneSnapshot;
  onCellClick: (click: FortressCellClick) => void;
  onCellFocus: (position: Position) => void;
  onCancel: () => void;
}

const getBuildingAtCell = (snapshot: FortressSceneSnapshot, position: Position) =>
  snapshot.fortress.buildings.find((building) => {
    const footprint = getBuildingDefinition(building.definitionId).footprint;
    return (
      position.x >= building.position.x &&
      position.x < building.position.x + footprint.width.value &&
      position.y >= building.position.y &&
      position.y < building.position.y + footprint.height.value
    );
  });

export function FortressCanvas({
  snapshot,
  onCellClick,
  onCellFocus,
  onCancel,
}: FortressCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserFortressGame | null>(null);
  const snapshotRef = useRef(snapshot);
  const onCellClickRef = useRef(onCellClick);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    onCellClickRef.current = onCellClick;
  }, [onCellClick]);

  useEffect(() => {
    snapshotRef.current = snapshot;
    gameRef.current?.updateSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    const host = hostRef.current;
    // JSDOM has no usable canvas implementation; browser builds always create Phaser.
    if (host === null || import.meta.env.MODE === 'test') {
      return undefined;
    }

    let isMounted = true;
    setLoadState('loading');
    void import('@/game/phaser/createGame')
      .then(({ createPhaserGame }) => {
        if (!isMounted) {
          return;
        }

        const game = createPhaserGame(host, snapshotRef.current, (click) => {
          onCellClickRef.current(click);
        });
        gameRef.current = game;
        setLoadState('ready');
      })
      .catch(() => {
        if (isMounted) {
          setLoadState('error');
        }
      });

    return () => {
      isMounted = false;
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [loadAttempt]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = snapshot.selectedCell ?? { x: 0, y: 0 };
    let next: Position;

    switch (event.key) {
      case 'ArrowLeft':
        next = { ...current, x: Math.max(0, current.x - 1) };
        break;
      case 'ArrowRight':
        next = {
          ...current,
          x: Math.min(snapshot.fortress.width - 1, current.x + 1),
        };
        break;
      case 'ArrowUp':
        next = { ...current, y: Math.max(0, current.y - 1) };
        break;
      case 'ArrowDown':
        next = {
          ...current,
          y: Math.min(snapshot.fortress.height - 1, current.y + 1),
        };
        break;
      case 'Home':
        next = { x: 0, y: 0 };
        break;
      case 'End':
        next = {
          x: snapshot.fortress.width - 1,
          y: snapshot.fortress.height - 1,
        };
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onCellClick({
          position: current,
          buildingId: getBuildingAtCell(snapshot, current)?.id ?? null,
        });
        return;
      case 'Escape':
        event.preventDefault();
        onCancel();
        return;
      default:
        return;
    }

    event.preventDefault();
    onCellFocus(next);
  };

  return (
    <section className="fortress-canvas" aria-labelledby="fortress-canvas-title">
      <div className="fortress-canvas__heading">
        <div>
          <p className="fortress-canvas__eyebrow">PHASER 主场景</p>
          <h1 id="fortress-canvas-title">晨星要塞</h1>
        </div>
        <span>320 × 180 像素画布</span>
      </div>
      <div
        ref={hostRef}
        className="fortress-canvas__host"
        role="application"
        tabIndex={0}
        aria-busy={loadState === 'loading'}
        aria-label={`8 × 8 要塞格子。方向键移动，回车选择或建造，Escape 取消。当前格子：${
          snapshot.selectedCell === null
            ? '未选择'
            : `${snapshot.selectedCell.x}, ${snapshot.selectedCell.y}`
        }`}
        onFocus={() => {
          if (snapshot.selectedCell === null) {
            onCellFocus({ x: 0, y: 0 });
          }
        }}
        onPointerDown={() => hostRef.current?.focus({ preventScroll: true })}
        onKeyDown={handleKeyDown}
      >
        {loadState === 'loading' ? (
          <span className="fortress-canvas__loading">正在载入像素场景……</span>
        ) : null}
        {loadState === 'error' ? (
          <span className="fortress-canvas__loading" role="alert">
            场景载入失败。
          </span>
        ) : null}
      </div>
      <p className="fortress-canvas__hint">
        {loadState === 'error' ? (
          <button
            className="fortress-button fortress-button--quiet"
            type="button"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          >
            重试载入场景
          </button>
        ) : snapshot.previewDefinitionId === null ? (
          '点击建筑查看详情；键盘可用方向键移动、回车确认。'
        ) : (
          '点击或按回车确认位置；规则层会校验边界、重叠与资源。'
        )}
      </p>
    </section>
  );
}
