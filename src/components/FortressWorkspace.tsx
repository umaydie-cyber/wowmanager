import { useCallback, useMemo, useState } from 'react';

import { buildingDefinitions, getBuildingDefinition } from '@/game/content/buildings';
import { inventoryItemLabels } from '@/game/content/items';
import type {
  BuildingDefinitionId,
  BuildingId,
  ItemId,
  InventoryItemId,
  Position,
} from '@/game/core/types';
import type { FortressCellClick } from '@/game/phaser/createGame';
import { selectGameState, selectMessage, useGameStore } from '@/game/store/useGameStore';

import { FortressCanvas } from './FortressCanvas';
import { HeroPanel } from './HeroPanel';
import { SaveControls } from './SaveControls';

type InteractionMode =
  | { type: 'inspect' }
  | { type: 'build'; definitionId: BuildingDefinitionId }
  | { type: 'move'; buildingId: BuildingId };

const formatCost = (definitionId: BuildingDefinitionId): string => {
  const cost = getBuildingDefinition(definitionId).buildCost.value;
  const entries = Object.entries(cost) as [ItemId, number][];
  return entries.length === 0
    ? '免费'
    : entries
        .map(([itemId, quantity]) => `${inventoryItemLabels[itemId]} ${quantity}`)
        .join(' · ');
};

export function FortressWorkspace() {
  const game = useGameStore(selectGameState);
  const message = useGameStore(selectMessage);
  const buildBuilding = useGameStore((state) => state.buildBuilding);
  const moveBuilding = useGameStore((state) => state.moveBuilding);
  const demolishBuilding = useGameStore((state) => state.demolishBuilding);
  const undoFortressCommand = useGameStore((state) => state.undoFortressCommand);
  const undoStack = useGameStore((state) => state.undoStack);
  const [mode, setMode] = useState<InteractionMode>({ type: 'inspect' });
  const [selectedCell, setSelectedCell] = useState<Position | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId | null>(null);

  const selectedBuilding = useMemo(
    () =>
      game?.fortress.buildings.find((building) => building.id === selectedBuildingId) ??
      null,
    [game, selectedBuildingId],
  );

  const handleCellClick = useCallback(
    ({ position, buildingId }: FortressCellClick) => {
      setSelectedCell(position);

      if (mode.type === 'build') {
        if (buildBuilding(mode.definitionId, position)) {
          setMode({ type: 'inspect' });
          setSelectedBuildingId(null);
        }
        return;
      }

      if (mode.type === 'move') {
        if (moveBuilding(mode.buildingId, position)) {
          setMode({ type: 'inspect' });
          setSelectedBuildingId(mode.buildingId);
        }
        return;
      }

      setSelectedBuildingId(buildingId);
    },
    [buildBuilding, mode, moveBuilding],
  );

  if (game === null) {
    return null;
  }

  const previewDefinitionId =
    mode.type === 'build'
      ? mode.definitionId
      : mode.type === 'move'
        ? (selectedBuilding?.definitionId ?? null)
        : null;

  const inspectorModeMessage =
    mode.type === 'build'
      ? `正在放置：${getBuildingDefinition(mode.definitionId).name}`
      : mode.type === 'move'
        ? '正在移动：点击目标格子。'
        : selectedCell === null
          ? '选择一个格子或建筑。'
          : `当前格子：(${selectedCell.x}, ${selectedCell.y})`;
  const resourceEntries = (
    Object.entries(game.inventory.items) as [InventoryItemId, number][]
  ).filter(([, quantity]) => quantity > 0);
  const statusIsError = /失败|不足|不能|无法|损坏|未知|重叠|超出|必须/.test(message);

  return (
    <section className="fortress-workspace" aria-label="要塞建造工作区">
      <header className="resource-bar" aria-label="资源栏">
        <div>
          <p className="resource-bar__eyebrow">本地存档 · 自动保存</p>
          <h2>资源</h2>
        </div>
        <ul>
          {resourceEntries.length === 0 ? (
            <li className="resource-bar__empty">暂无资源</li>
          ) : (
            resourceEntries.map(([itemId, quantity]) => (
              <li key={itemId}>
                <span>{inventoryItemLabels[itemId]}</span>
                <strong>{quantity}</strong>
              </li>
            ))
          )}
        </ul>
      </header>

      <div className="game-status-bar">
        <p
          className={statusIsError ? 'status-error' : ''}
          role={statusIsError ? 'alert' : 'status'}
        >
          {message || '要塞正在自动运行，进度会定期保存。'}
        </p>
        <SaveControls />
      </div>

      <div className="fortress-workspace__body">
        <FortressCanvas
          snapshot={{
            fortress: game.fortress,
            heroes: game.heroes,
            selectedCell,
            selectedBuildingId,
            previewDefinitionId,
          }}
          onCellClick={handleCellClick}
          onCellFocus={setSelectedCell}
          onCancel={() => setMode({ type: 'inspect' })}
        />

        <aside className="fortress-inspector" aria-labelledby="fortress-inspector-title">
          <div className="fortress-inspector__heading">
            <div>
              <p className="fortress-inspector__eyebrow">建筑检查器</p>
              <h2 id="fortress-inspector-title">
                {selectedBuilding === null
                  ? '未选择建筑'
                  : getBuildingDefinition(selectedBuilding.definitionId).name}
              </h2>
            </div>
            <button
              className="fortress-button fortress-button--quiet"
              type="button"
              onClick={() => undoFortressCommand()}
              disabled={undoStack.length === 0}
            >
              撤销
            </button>
          </div>

          <p className="fortress-inspector__mode">{inspectorModeMessage}</p>

          {selectedBuilding === null ? (
            <p className="fortress-inspector__empty">
              从画布中选择一栋建筑以移动或拆除。
            </p>
          ) : (
            <>
              <dl className="fortress-inspector__details">
                <div>
                  <dt>位置</dt>
                  <dd>
                    ({selectedBuilding.position.x}, {selectedBuilding.position.y})
                  </dd>
                </div>
                <div>
                  <dt>占地</dt>
                  <dd>
                    {
                      getBuildingDefinition(selectedBuilding.definitionId).footprint.width
                        .value
                    }{' '}
                    ×{' '}
                    {
                      getBuildingDefinition(selectedBuilding.definitionId).footprint
                        .height.value
                    }
                  </dd>
                </div>
                <div>
                  <dt>建筑 ID</dt>
                  <dd>{selectedBuilding.id}</dd>
                </div>
              </dl>
              <div className="fortress-inspector__actions">
                <button
                  className="fortress-button"
                  type="button"
                  onClick={() =>
                    setMode({ type: 'move', buildingId: selectedBuilding.id })
                  }
                >
                  移动建筑
                </button>
                <button
                  className="fortress-button fortress-button--danger"
                  type="button"
                  onClick={() => {
                    if (demolishBuilding(selectedBuilding.id)) {
                      setSelectedBuildingId(null);
                      setMode({ type: 'inspect' });
                    }
                  }}
                >
                  拆除
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      <section className="building-bar" aria-labelledby="building-bar-title">
        <div className="building-bar__heading">
          <div>
            <p className="building-bar__eyebrow">建造栏</p>
            <h2 id="building-bar-title">选择设施后点击要塞格子</h2>
          </div>
          {mode.type !== 'inspect' ? (
            <button
              className="fortress-button fortress-button--quiet"
              type="button"
              onClick={() => setMode({ type: 'inspect' })}
            >
              取消
            </button>
          ) : null}
        </div>
        <div className="building-bar__items">
          {buildingDefinitions.map((definition) => {
            const isSelected =
              mode.type === 'build' && mode.definitionId === definition.id;
            return (
              <button
                key={definition.id}
                className={`building-card${isSelected ? ' building-card--selected' : ''}`}
                type="button"
                onClick={() => {
                  setMode({ type: 'build', definitionId: definition.id });
                  setSelectedBuildingId(null);
                }}
              >
                <span className="building-card__name">{definition.name}</span>
                <span>
                  {definition.footprint.width.value} × {definition.footprint.height.value}{' '}
                  格
                </span>
                <span>{formatCost(definition.id)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <HeroPanel />
    </section>
  );
}
