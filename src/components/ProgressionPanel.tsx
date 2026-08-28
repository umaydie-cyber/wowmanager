import { useState } from 'react';

import { isRegionUnlocked, regionDefinitions } from '@/game/content/regions';
import {
  equipmentSlots,
  getAffixDefinition,
  getCombatSkillDefinition,
  getEquipmentDefinition,
  getEquipmentQuality,
  getRuneChoiceName,
  runeResetConfig,
  runeTreeNodes,
} from '@/game/content/progression';
import { calculateEquipmentAttributes } from '@/game/core/actions/equipment';
import { getRuneResetCost } from '@/game/core/actions/runes';
import type {
  EquipmentInstance,
  ExpeditionPhase,
  GameState,
  Hero,
  HeroAttributes,
  RuneChoiceId,
} from '@/game/core/types';
import { inventoryItemLabels } from '@/game/content/items';
import { useGameStore } from '@/game/store/useGameStore';

const attributeLabels: Record<keyof HeroAttributes, string> = {
  stamina: '耐力',
  strength: '力量',
  agility: '敏捷',
  intelligence: '智力',
  knowledge: '学识',
};

const expeditionPhaseLabels: Record<ExpeditionPhase, string> = {
  GATHERING: '队伍集结中',
  MOBS: '清理敌群',
  BOSS_READY: 'Boss 已就绪',
  BOSS_BATTLE: 'Boss 战斗中',
  VICTORY: '远征胜利',
  DEFEAT: '远征失败',
};

const ascensionKey = (instance: EquipmentInstance): string =>
  `${instance.definitionId}:${instance.itemLevel}:${instance.qualityId}`;

const findThreeMatching = (
  equipmentInventory: readonly EquipmentInstance[],
): EquipmentInstance[] => {
  const groups = new Map<string, EquipmentInstance[]>();
  for (const instance of equipmentInventory) {
    const key = ascensionKey(instance);
    groups.set(key, [...(groups.get(key) ?? []), instance]);
  }
  return [...groups.values()].find((group) => group.length >= 3)?.slice(0, 3) ?? [];
};

const formatEquipment = (instance: EquipmentInstance): string => {
  const definition = getEquipmentDefinition(instance.definitionId);
  const quality = getEquipmentQuality(instance.qualityId);
  return `${quality.name} · ${definition.name} · Lv.${instance.itemLevel}`;
};

const formatEquipmentPower = (instance: EquipmentInstance): string => {
  const bonus = calculateEquipmentAttributes(instance);
  return (Object.entries(bonus) as [keyof HeroAttributes, number][])
    .filter(([, value]) => value > 0)
    .map(([attribute, value]) => `${attributeLabels[attribute]} +${value}`)
    .join(' · ');
};

interface ProgressionPanelProps {
  game: GameState;
  hero: Hero;
}

export function ProgressionPanel({ game, hero }: ProgressionPanelProps) {
  const [hammerStars, setHammerStars] = useState<1 | 2 | 3>(3);
  const startEquipmentAscension = useGameStore((state) => state.startEquipmentAscension);
  const completeEquipmentAscension = useGameStore(
    (state) => state.completeEquipmentAscension,
  );
  const equipItem = useGameStore((state) => state.equipItem);
  const unlockRuneNode = useGameStore((state) => state.unlockRuneNode);
  const resetRunes = useGameStore((state) => state.resetRunes);
  const rerollCombatSkill = useGameStore((state) => state.rerollCombatSkill);
  const dispatchRegion = useGameStore((state) => state.dispatchRegion);
  const startBossBattle = useGameStore((state) => state.startBossBattle);
  const winBossBattle = useGameStore((state) => state.winBossBattle);
  const closeExpedition = useGameStore((state) => state.closeExpedition);

  const matchingCopies = findThreeMatching(game.equipmentInventory);
  const premiumBase = game.equipmentInventory[0];
  const pending = game.progression.pendingEquipmentAscension;
  const hasInsightShrine = game.fortress.buildings.some(
    (building) => building.definitionId === 'insight-shrine-basic',
  );
  const active = game.expedition.active;
  const expeditionHeroIds = game.heroes
    .filter((entry) => entry.homeBuildingId !== null)
    .slice(0, 5)
    .map((entry) => entry.id);

  return (
    <div className="progression-panel">
      <section className="progression-section" aria-labelledby="equipment-title">
        <div className="progression-section__heading">
          <div>
            <p className="hero-panel__eyebrow">装备成长</p>
            <h4 id="equipment-title">11 槽位与 3 合 1 升阶</h4>
          </div>
          <label>
            精金锤
            <select
              value={hammerStars}
              onChange={(event) =>
                setHammerStars(Number(event.target.value) as 1 | 2 | 3)
              }
            >
              <option value={1}>1★ · 1 候选</option>
              <option value={2}>2★ · 2 候选</option>
              <option value={3}>3★ · 3 候选</option>
            </select>
          </label>
        </div>

        <div className="equipment-slots" aria-label="装备槽位">
          {equipmentSlots.map((slot) => {
            const equipped = hero.equipment[slot.id];
            return (
              <div key={slot.id} className="equipment-slot">
                <span>{slot.name}</span>
                <strong>
                  {equipped === undefined ? '空' : formatEquipment(equipped)}
                </strong>
                {equipped === undefined ? null : (
                  <small>{formatEquipmentPower(equipped)}</small>
                )}
              </div>
            );
          })}
        </div>

        {pending === null ? (
          <div className="progression-actions">
            <button
              className="fortress-button"
              type="button"
              disabled={matchingCopies.length < 3}
              onClick={() =>
                startEquipmentAscension(
                  matchingCopies.map((entry) => entry.id),
                  'copies',
                  hammerStars,
                )
              }
            >
              同款 3 合 1
            </button>
            <button
              className="fortress-button fortress-button--quiet"
              type="button"
              disabled={premiumBase === undefined}
              onClick={() =>
                premiumBase === undefined
                  ? undefined
                  : startEquipmentAscension(
                      [premiumBase.id],
                      'premium-plates',
                      hammerStars,
                    )
              }
            >
              本体 + 氪金板替代
            </button>
          </div>
        ) : (
          <div className="affix-choice" aria-label="升阶词条候选">
            <strong>
              {formatEquipment({
                id: pending.outputInstanceId,
                definitionId: pending.definitionId,
                itemLevel: pending.itemLevel,
                qualityId: pending.targetQualityId,
                affixIds: pending.retainedAffixIds,
              })}
            </strong>
            <span>候选已锁定，请选择一个：</span>
            <div className="progression-actions">
              {pending.candidateAffixIds.map((affixId) => (
                <button
                  className="fortress-button"
                  type="button"
                  key={affixId}
                  onClick={() => completeEquipmentAscension(affixId)}
                >
                  {getAffixDefinition(affixId).name}
                </button>
              ))}
            </div>
          </div>
        )}

        {game.equipmentInventory.length === 0 ? (
          <p className="progression-empty">装备库为空；完成 Boss 战后可获得地区装备。</p>
        ) : (
          <ul className="equipment-inventory" aria-label="要塞装备库">
            {game.equipmentInventory.map((instance) => (
              <li key={instance.id}>
                <span>
                  {formatEquipment(instance)}
                  <small>{formatEquipmentPower(instance)}</small>
                </span>
                <button
                  className="fortress-button fortress-button--quiet"
                  type="button"
                  onClick={() => equipItem(hero.id, instance.id)}
                >
                  穿戴
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="progression-section" aria-labelledby="rune-title">
        <div className="progression-section__heading">
          <div>
            <p className="hero-panel__eyebrow">五条符文树</p>
            <h4 id="rune-title">剩余符文点 {hero.runePoints}</h4>
          </div>
          <button
            className="fortress-button fortress-button--quiet"
            type="button"
            disabled={hero.unlockedRuneNodeIds.length === 0}
            onClick={() => resetRunes(hero.id)}
          >
            重置（{getRuneResetCost(hero)}{' '}
            {runeResetConfig.itemId === 'rune-dust' ? '符文尘' : ''}）
          </button>
        </div>
        <div className="rune-trees">
          {(Object.keys(attributeLabels) as (keyof HeroAttributes)[]).map((line) => (
            <div className="rune-tree" key={line}>
              <strong>{attributeLabels[line]}</strong>
              {runeTreeNodes
                .filter((node) => node.line === line)
                .map((node) => {
                  const unlocked = hero.unlockedRuneNodeIds.includes(node.id);
                  const ready = node.prerequisiteIds.every((id) =>
                    hero.unlockedRuneNodeIds.includes(id),
                  );
                  const selectedChoice = hero.runeChoiceSelections[node.id];
                  if (node.kind === 'choice' && !unlocked) {
                    return (
                      <div className="rune-node rune-node--choice" key={node.id}>
                        <span>⑤ 分支选择</span>
                        {(node.choicePoolIds ?? []).map((choiceId) => (
                          <button
                            type="button"
                            key={choiceId}
                            disabled={
                              !ready || hero.runePoints < node.runePointCost.value
                            }
                            onClick={() =>
                              unlockRuneNode(hero.id, node.id, choiceId as RuneChoiceId)
                            }
                          >
                            {getRuneChoiceName(choiceId)}
                          </button>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <button
                      className={`rune-node${unlocked ? ' rune-node--unlocked' : ''}`}
                      type="button"
                      key={node.id}
                      disabled={
                        unlocked || !ready || hero.runePoints < node.runePointCost.value
                      }
                      onClick={() => unlockRuneNode(hero.id, node.id)}
                    >
                      {node.step === 5
                        ? `⑤ ${
                            selectedChoice === undefined
                              ? '旧存档分支待重选'
                              : getRuneChoiceName(selectedChoice)
                          }`
                        : `${node.step} ${attributeLabels[line]} +${node.attributeBonus?.value ?? 0}`}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </section>

      <section className="progression-section" aria-labelledby="combat-skill-title">
        <div className="progression-section__heading">
          <div>
            <p className="hero-panel__eyebrow">职业战斗成长</p>
            <h4 id="combat-skill-title">战斗等级 {hero.combatLevel}</h4>
          </div>
          <span>
            顿悟点 {game.progression.insightPoints} ·{' '}
            {hasInsightShrine ? '圣坛就绪' : '未建造圣坛'}
          </span>
        </div>
        <ul className="skill-list">
          {hero.combatSkillIds.map((skillId) => (
            <li key={skillId}>
              <span>
                <strong>{getCombatSkillDefinition(skillId).name}</strong>
                <small>{getCombatSkillDefinition(skillId).description}</small>
              </span>
              <button
                className="fortress-button fortress-button--quiet"
                type="button"
                disabled={!hasInsightShrine || game.progression.insightPoints < 1}
                onClick={() => rerollCombatSkill(hero.id, skillId)}
              >
                顿悟重随
              </button>
            </li>
          ))}
        </ul>
        {hero.combatSkillRollHistory.length === 0 ? (
          <p className="progression-hint">5 级起在配置里程碑随机获得职业技能。</p>
        ) : (
          <p className="progression-hint">
            最近结果：
            {
              getCombatSkillDefinition(hero.combatSkillRollHistory.at(-1)!.resultSkillId)
                .name
            }
            （
            {hero.combatSkillRollHistory.at(-1)!.source === 'milestone'
              ? '里程碑'
              : '顿悟'}
            ）
          </p>
        )}
      </section>

      <section className="progression-section" aria-labelledby="region-title">
        <div className="progression-section__heading">
          <div>
            <p className="hero-panel__eyebrow">地区扩展</p>
            <h4 id="region-title">远征进度</h4>
          </div>
          <span>
            {active === null
              ? '队伍空闲'
              : `当前：${expeditionPhaseLabels[active.phase]}`}
          </span>
        </div>
        {active !== null ? (
          <p className="expedition-status" role="status">
            {active.phase === 'MOBS'
              ? `正在推进第 ${active.currentWaveIndex + 1} 波，完成后自动进入下一波。`
              : expeditionPhaseLabels[active.phase]}
          </p>
        ) : null}
        <div className="region-list">
          {regionDefinitions.map((region) => {
            const progress = game.expedition.regionProgress[region.id];
            const unlocked = isRegionUnlocked(game.expedition, region.id);
            const progressPercent =
              ((progress.completedWaveCount + (progress.bossDefeated ? 1 : 0)) /
                (region.waves.length + 1)) *
              100;
            return (
              <article
                className={`region-card${unlocked ? '' : ' region-card--locked'}`}
                key={region.id}
              >
                <div>
                  <strong>{region.name}</strong>
                  <span>{unlocked ? region.description : region.unlock.label}</span>
                </div>
                <div
                  className="region-progress"
                  aria-label={`${region.name} ${progressPercent}%`}
                >
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
                <small>
                  波次 {progress.completedWaveCount}/{region.waves.length} · Boss{' '}
                  {progress.bossDefeated ? '已击败' : '未击败'} · 通关{' '}
                  {progress.victoryCount}
                </small>
                <button
                  className="fortress-button"
                  type="button"
                  disabled={
                    !unlocked || active !== null || expeditionHeroIds.length === 0
                  }
                  onClick={() => dispatchRegion(region.id, expeditionHeroIds)}
                >
                  派遣队伍
                </button>
              </article>
            );
          })}
        </div>
        {active?.phase === 'BOSS_READY' ? (
          <button
            className="fortress-button"
            type="button"
            onClick={() => startBossBattle()}
          >
            进入 Boss 战
          </button>
        ) : null}
        {active?.phase === 'BOSS_BATTLE' ? (
          <button
            className="fortress-button"
            type="button"
            onClick={() => winBossBattle()}
          >
            结算胜利
          </button>
        ) : null}
        {active?.phase === 'VICTORY' || active?.phase === 'DEFEAT' ? (
          <div className="expedition-result">
            <strong>{active.phase === 'VICTORY' ? 'Boss 已击败' : '远征失败'}</strong>
            {active.rewards.length === 0 ? (
              <span>本次没有获得奖励。</span>
            ) : (
              <span>
                奖励：
                {active.rewards
                  .map(
                    (reward) =>
                      `${inventoryItemLabels[reward.itemId]} × ${reward.quantity}`,
                  )
                  .join(' · ')}
              </span>
            )}
            <button
              className="fortress-button"
              type="button"
              onClick={() => closeExpedition()}
            >
              关闭结算
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
