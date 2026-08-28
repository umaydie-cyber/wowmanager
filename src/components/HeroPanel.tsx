import { useState } from 'react';

import { growthBalance } from '@/game/balance/growth';
import { getBuildingDefinition } from '@/game/content/buildings';
import { inventoryItemLabels } from '@/game/content/items';
import { getProfessionArchetype } from '@/game/content/progression';
import { deriveHeroAttributes } from '@/game/core/formulas/attributes';
import { calculateHeroEquipmentAttributes } from '@/game/core/actions/equipment';
import { calculateRuneAttributes } from '@/game/core/actions/runes';
import { xpToNext } from '@/game/core/formulas/experience';
import type {
  Building,
  GameState,
  Hero,
  HeroAttributes,
  HeroActivity,
  InventoryItemId,
  SkillProgress,
} from '@/game/core/types';
import { selectGameState, selectMessage, useGameStore } from '@/game/store/useGameStore';

import { ProgressionPanel } from './ProgressionPanel';

const activityLabels: Record<HeroActivity['type'], string> = {
  UNPLACED: '待安置',
  IDLE: '待命',
  TO_REST: '前往帐篷',
  RESTING: '休息中',
  SELECTING_WORK: '选择工作',
  TO_WORK: '前往设施',
  WORKING: '工作中',
  TO_GUILD: '前往工会',
  WAITING_PARTY: '等待队伍',
  EXPEDITION: '远征中',
  BOSS_READY: 'Boss 就绪',
  BOSS_BATTLE: 'Boss 战斗中',
};

const attributeLabels = {
  stamina: '耐力',
  strength: '力量',
  agility: '敏捷',
  intelligence: '智力',
  knowledge: '学识',
} as const;

const getActivityBuildingId = (activity: HeroActivity): string | null => {
  switch (activity.type) {
    case 'TO_REST':
    case 'RESTING':
    case 'TO_WORK':
    case 'WORKING':
      return activity.buildingId;
    default:
      return null;
  }
};

const formatBuilding = (game: GameState, buildingId: string): string => {
  const building = game.fortress.buildings.find((entry) => entry.id === buildingId);
  return building === undefined
    ? `已移除设施（${buildingId}）`
    : `${getBuildingDefinition(building.definitionId).name} · ${building.id}`;
};

const getBehaviorQueue = (game: GameState, hero: Hero): string[] => {
  const activity = hero.activity;
  switch (activity.type) {
    case 'UNPLACED':
      return ['等待分配空帐篷'];
    case 'IDLE':
      return ['返回帐篷', '完整休息', '选择工作设施'];
    case 'TO_REST':
      return [formatBuilding(game, activity.buildingId), '完整休息', '选择工作设施'];
    case 'RESTING':
      return ['完成本次休息', '选择工作设施'];
    case 'SELECTING_WORK':
      return [
        ...activity.buildingIds
          .slice(activity.nextIndex)
          .map((buildingId) => formatBuilding(game, buildingId)),
        '返回帐篷',
      ];
    case 'TO_WORK':
    case 'WORKING':
      return [
        formatBuilding(game, activity.buildingId),
        ...activity.buildingIds
          .slice(activity.nextIndex + 1)
          .map((buildingId) => formatBuilding(game, buildingId)),
        '返回帐篷',
      ];
    case 'TO_GUILD':
      return ['抵达工会', '等待队伍'];
    case 'WAITING_PARTY':
      return ['等待队伍', '开始远征'];
    case 'EXPEDITION':
      return ['推进地区', '挑战 Boss'];
    case 'BOSS_READY':
      return ['等待进入 Boss 战'];
    case 'BOSS_BATTLE':
      return ['完成 Boss 战', '返回帐篷'];
  }
};

const formatSkillProgress = (progress: SkillProgress): string => {
  const isCapped =
    progress.kind === 'profession' &&
    progress.level >= growthBalance.experience.professionSkillCap.value;
  return isCapped
    ? `${progress.level} 点 · 已满级`
    : `${progress.level} 点 · ${progress.xp} / ${xpToNext(progress.level)} XP`;
};

const availableTentsFor = (game: GameState, hero: Hero): Building[] =>
  game.fortress.buildings.filter(
    (building) =>
      building.definitionId === 'tent-basic' &&
      (building.ownerHeroId === null || building.ownerHeroId === hero.id),
  );

export function HeroPanel() {
  const game = useGameStore(selectGameState);
  const message = useGameStore(selectMessage);
  const recruitHero = useGameStore((state) => state.recruitHero);
  const assignHeroTent = useGameStore((state) => state.assignHeroTent);
  const changeWorkPreference = useGameStore((state) => state.changeWorkPreference);
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  if (game === null) {
    return null;
  }

  const selectedHero =
    game.heroes.find((hero) => hero.id === selectedHeroId) ?? game.heroes[0] ?? null;
  const backpackEntries = (
    Object.entries(game.inventory.items) as [InventoryItemId, number][]
  ).filter(([, quantity]) => quantity > 0);
  const ticketItemId = growthBalance.recruitment.ticketItemId;
  const ticketCount = game.inventory.items[ticketItemId] ?? 0;
  const ticketCost = growthBalance.recruitment.ticketCost.value;
  const heroMessage = /招募|帐篷已分配|工作偏好/.test(message) ? message : '';

  const handleRecruit = () => {
    const previousIds = new Set(game.heroes.map((hero) => hero.id));
    if (recruitHero()) {
      const recruited = useGameStore
        .getState()
        .gameState?.heroes.find((hero) => !previousIds.has(hero.id));
      if (recruited !== undefined) {
        setSelectedHeroId(recruited.id);
      }
    }
  };

  return (
    <section className="hero-panel" aria-labelledby="hero-panel-title">
      <div className="hero-panel__heading">
        <div>
          <p className="hero-panel__eyebrow">角色管理</p>
          <h2 id="hero-panel-title">名册与成长</h2>
        </div>
        <div className="hero-panel__recruitment">
          <span>招募券 {ticketCount}</span>
          <button
            className="fortress-button"
            type="button"
            disabled={ticketCount < ticketCost}
            onClick={handleRecruit}
          >
            随机招募（-{ticketCost}）
          </button>
        </div>
      </div>

      <p className="hero-panel__message" aria-live="polite">
        {heroMessage}
      </p>

      <ul className="hero-panel__list" aria-label="角色状态">
        {game.heroes.map((hero) => {
          const energyPercent = (hero.energy / hero.maxEnergy) * 100;
          const archetype = getProfessionArchetype(hero.archetypeId);
          const isSelected = selectedHero?.id === hero.id;
          return (
            <li
              key={hero.id}
              className={`hero-card${isSelected ? ' hero-card--selected' : ''}`}
            >
              <button
                className="hero-card__select"
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedHeroId(hero.id)}
              >
                <span className="hero-card__heading">
                  <strong>{hero.name}</strong>
                  <span>{activityLabels[hero.activity.type]}</span>
                </span>
                <span className="hero-card__role">
                  {archetype.name} · {archetype.role}
                </span>
                <span
                  className="hero-card__energy"
                  aria-label={`${hero.name} 精力 ${hero.energy.toFixed(1)} / ${hero.maxEnergy}`}
                >
                  <span style={{ width: `${energyPercent}%` }} />
                </span>
                <span className="hero-card__energy-label">
                  精力 {hero.energy.toFixed(1)} / {hero.maxEnergy}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selectedHero === null ? null : (
        <HeroDetails
          game={game}
          hero={selectedHero}
          onAssignTent={(tentId) => assignHeroTent(selectedHero.id, tentId)}
          onChangeWorkPreference={(preference) =>
            changeWorkPreference(selectedHero.id, preference)
          }
        />
      )}

      <div className="hero-panel__backpack">
        <h3>要塞背包</h3>
        {backpackEntries.length === 0 ? (
          <p>暂无物品。</p>
        ) : (
          <ul>
            {backpackEntries.map(([itemId, quantity]) => (
              <li key={itemId}>
                <span>{inventoryItemLabels[itemId]}</span>
                <strong>× {quantity}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface HeroDetailsProps {
  game: GameState;
  hero: Hero;
  onAssignTent: (tentId: string) => void;
  onChangeWorkPreference: (preference: 'gather' | 'training') => void;
}

function HeroDetails({
  game,
  hero,
  onAssignTent,
  onChangeWorkPreference,
}: HeroDetailsProps) {
  const archetype = getProfessionArchetype(hero.archetypeId);
  const equipmentAttributes = calculateHeroEquipmentAttributes(hero.equipment);
  const runeAttributes = calculateRuneAttributes(hero);
  const effectiveAttributes = (
    Object.keys(hero.attributes) as (keyof HeroAttributes)[]
  ).reduce<HeroAttributes>(
    (result, attribute) => ({
      ...result,
      [attribute]:
        hero.attributes[attribute] +
        equipmentAttributes[attribute] +
        runeAttributes[attribute],
    }),
    { stamina: 0, strength: 0, agility: 0, intelligence: 0, knowledge: 0 },
  );
  const derived = deriveHeroAttributes(effectiveAttributes);
  const currentBuildingId = getActivityBuildingId(hero.activity);
  const queue = getBehaviorQueue(game, hero);
  const availableTents = availableTentsFor(game, hero);
  const homeTent = game.fortress.buildings.find(
    (building) => building.id === hero.homeBuildingId,
  );
  const preference = homeTent?.workPreference ?? hero.workPreference;

  return (
    <article className="hero-details" aria-labelledby="hero-details-title">
      <div className="hero-details__heading">
        <div>
          <p className="hero-panel__eyebrow">角色详情</p>
          <h3 id="hero-details-title">
            {hero.name} · {archetype.name}
          </h3>
        </div>
        <span className={hero.homeBuildingId === null ? 'status-warn' : 'status-ready'}>
          {hero.homeBuildingId === null ? '待安置' : '已安置'}
        </span>
      </div>

      {hero.homeBuildingId === null ? (
        <section className="hero-details__housing" aria-label="帐篷分配">
          <strong>需要分配帐篷后才会自动工作</strong>
          {availableTents.length === 0 ? (
            <p>暂无空帐篷，请先从建造栏建造一顶。</p>
          ) : (
            <div>
              {availableTents.map((tent) => (
                <button
                  className="fortress-button"
                  key={tent.id}
                  type="button"
                  onClick={() => onAssignTent(tent.id)}
                >
                  分配 {tent.id}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <label className="hero-card__preference">
          帐篷工作偏好
          <select
            value={preference}
            onChange={(event) =>
              onChangeWorkPreference(
                event.target.value === 'training' ? 'training' : 'gather',
              )
            }
          >
            <option value="gather">制造 / 采集</option>
            <option value="training">锻炼</option>
          </select>
        </label>
      )}

      <div className="hero-details__columns">
        <section>
          <h4>基础属性</h4>
          <dl className="hero-details__stats">
            {Object.entries(effectiveAttributes).map(([attribute, value]) => (
              <div key={attribute}>
                <dt>{attributeLabels[attribute as keyof typeof attributeLabels]}</dt>
                <dd>
                  {value}
                  {value === hero.attributes[attribute as keyof typeof hero.attributes]
                    ? ''
                    : `（基础 ${hero.attributes[attribute as keyof typeof hero.attributes]}）`}
                </dd>
              </div>
            ))}
            <div>
              <dt>推导生命</dt>
              <dd>{derived.maxHealth}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h4>经验与专业</h4>
          <dl className="hero-details__progress">
            <div>
              <dt>耐力经验</dt>
              <dd>{formatSkillProgress(hero.skills.staminaTraining)}</dd>
            </div>
            <div>
              <dt>采矿</dt>
              <dd>{formatSkillProgress(hero.skills.mining)}</dd>
            </div>
            <div>
              <dt>草药学</dt>
              <dd>{formatSkillProgress(hero.skills.herbalism)}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h4>当前位置与行为队列</h4>
          <p className="hero-details__current">
            当前建筑：
            {currentBuildingId === null ? '无' : formatBuilding(game, currentBuildingId)}
          </p>
          <ol className="hero-details__queue">
            {queue.map((entry, index) => (
              <li key={`${index}-${entry}`}>{entry}</li>
            ))}
          </ol>
        </section>
      </div>

      <ProgressionPanel game={game} hero={hero} />
    </article>
  );
}
