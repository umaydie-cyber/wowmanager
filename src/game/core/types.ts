export const GAME_SCHEMA_VERSION = 2 as const;

export type HeroId = string;
export type BuildingId = string;
export type BuildingDefinitionId =
  | 'tent-basic'
  | 'mine-basic'
  | 'herb-garden-basic'
  | 'gym-basic'
  | 'insight-shrine-basic';
export type OreItemId = 'copper-ore' | 'iron-ore' | 'silver-ore';
export type HerbItemId = 'sunleaf' | 'moonbell';
export type RecruitmentItemId = 'recruit-ticket';
export type EquipmentMaterialItemId =
  | 'adamant-hammer-1-star'
  | 'adamant-hammer-2-star'
  | 'adamant-hammer-3-star'
  | 'premium-plate'
  | 'rune-dust';
export type ExpeditionItemId =
  | 'ember-shard'
  | 'frost-core'
  | 'astral-fragment'
  | 'recipe-ember-tonic-placeholder'
  | 'recipe-frostguard-placeholder'
  | 'recipe-astral-tea-placeholder'
  | 'equipment-ember-hollow-placeholder'
  | 'equipment-frostmarch-placeholder'
  | 'equipment-astral-rift-placeholder';
export type ItemId =
  OreItemId | HerbItemId | RecruitmentItemId | EquipmentMaterialItemId | ExpeditionItemId;
export type OreStar = 1 | 2 | 3;
export type StarredOreItemId = `${OreItemId}-${OreStar}-star`;
export type InventoryItemId = ItemId | StarredOreItemId;
export type WorkType = 'gather' | 'training';
export type SkillId = 'mining' | 'herbalism' | 'staminaTraining';
export type SkillKind = 'profession' | 'training';
export type ProfessionArchetypeId = 'stonewarden' | 'windstrider' | 'starweaver';
export type CombatSkillId =
  | 'guarding-strike'
  | 'stone-rally'
  | 'shield-slam'
  | 'gale-shot'
  | 'trail-mark'
  | 'windstep'
  | 'star-spark'
  | 'astral-mend'
  | 'comet-fall';
export type EquipmentSlotId =
  | 'head'
  | 'shoulders'
  | 'chest'
  | 'legs'
  | 'gloves'
  | 'weapon'
  | 'trinket-1'
  | 'trinket-2'
  | 'ring-1'
  | 'ring-2'
  | 'necklace';
export type EquipmentDefinitionId =
  | 'warden-helm'
  | 'warden-spaulders'
  | 'warden-cuirass'
  | 'warden-greaves'
  | 'warden-gauntlets'
  | 'emberblade'
  | 'star-compass'
  | 'echo-talisman'
  | 'copper-band'
  | 'moon-band'
  | 'sunleaf-chain';
export type EquipmentQualityId =
  'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type AffixId =
  | 'steadfast'
  | 'forceful'
  | 'nimble'
  | 'insightful'
  | 'learned'
  | 'vital'
  | 'brutal'
  | 'fleet'
  | 'arcane'
  | 'sagacious';
export type RuneTreeId = keyof HeroAttributes;
export type RuneStep = 1 | 2 | 3 | 4 | 5;
export type RuneNodeId = `${RuneTreeId}-${RuneStep}`;
export type RunePassiveId =
  'iron-roots' | 'decisive-force' | 'tailwind' | 'arcane-current' | 'field-scholar';
export type RuneChoiceId = CombatSkillId | RunePassiveId;
export type RegionId = 'ember-hollow' | 'frostmarch' | 'astral-rift';

export interface Position {
  x: number;
  y: number;
}

export interface HeroAttributes {
  stamina: number;
  strength: number;
  agility: number;
  intelligence: number;
  knowledge: number;
}

export interface SkillProgress {
  skillId: SkillId;
  kind: SkillKind;
  level: number;
  xp: number;
}

interface WorkPlanActivity {
  buildingIds: BuildingId[];
  nextIndex: number;
}

export type HeroActivity =
  | { type: 'UNPLACED' }
  | { type: 'IDLE' }
  | { type: 'TO_REST'; buildingId: BuildingId }
  | { type: 'RESTING'; buildingId: BuildingId; elapsedMs: number }
  | ({ type: 'SELECTING_WORK' } & WorkPlanActivity)
  | ({ type: 'TO_WORK'; buildingId: BuildingId } & WorkPlanActivity)
  | ({
      type: 'WORKING';
      buildingId: BuildingId;
      interactionElapsedMs: number;
      roundsCompleted: number;
    } & WorkPlanActivity)
  | { type: 'TO_GUILD' }
  | { type: 'WAITING_PARTY' }
  | { type: 'EXPEDITION' }
  | { type: 'BOSS_READY' }
  | { type: 'BOSS_BATTLE' };

export interface CombatSkillRollRecord {
  source: 'milestone' | 'insight';
  resultSkillId: CombatSkillId;
  milestoneLevel?: number | undefined;
  previousSkillId?: CombatSkillId | undefined;
}

export interface Hero {
  id: HeroId;
  name: string;
  archetypeId: ProfessionArchetypeId;
  position: Position;
  energy: number;
  maxEnergy: number;
  attributes: HeroAttributes;
  skills: Record<SkillId, SkillProgress>;
  homeBuildingId: BuildingId | null;
  workPreference: WorkType;
  activity: HeroActivity;
  combatLevel: number;
  combatSkillIds: CombatSkillId[];
  combatSkillRollHistory: CombatSkillRollRecord[];
  equipment: Partial<Record<EquipmentSlotId, EquipmentInstance>>;
  unlockedRuneNodeIds: RuneNodeId[];
  runeChoiceSelections: Partial<Record<RuneNodeId, RuneChoiceId>>;
  runePoints: number;
}

export interface EquipmentInstance {
  id: string;
  definitionId: EquipmentDefinitionId;
  itemLevel: number;
  qualityId: EquipmentQualityId;
  affixIds: AffixId[];
}

export interface PendingEquipmentAscension {
  outputInstanceId: string;
  definitionId: EquipmentDefinitionId;
  itemLevel: number;
  targetQualityId: EquipmentQualityId;
  retainedAffixIds: AffixId[];
  candidateAffixIds: AffixId[];
}

export interface Building {
  id: BuildingId;
  definitionId: BuildingDefinitionId;
  position: Position;
  ownerHeroId: HeroId | null;
  /** Only tents use this; omitted on legacy saves and ordinary work buildings. */
  workPreference?: WorkType | undefined;
}

export interface Fortress {
  width: number;
  height: number;
  buildings: Building[];
}

export interface Inventory {
  items: Partial<Record<InventoryItemId, number>>;
}

export type ExpeditionPhase =
  'GATHERING' | 'MOBS' | 'BOSS_READY' | 'BOSS_BATTLE' | 'VICTORY' | 'DEFEAT';

export interface ExpeditionReward {
  itemId: InventoryItemId;
  quantity: number;
}

export interface ActiveExpedition {
  regionId: RegionId;
  heroIds: HeroId[];
  phase: ExpeditionPhase;
  /** Zero-based active wave. It remains at wave count once the Boss is unlocked. */
  currentWaveIndex: number;
  waveElapsedMs: number;
  rewards: ExpeditionReward[];
}

export interface RegionProgress {
  completedWaveCount: number;
  bossDefeated: boolean;
  victoryCount: number;
}

export interface ExpeditionState {
  regionProgress: Record<RegionId, RegionProgress>;
  active: ActiveExpedition | null;
}

export interface ProgressionState {
  insightPoints: number;
  nextEquipmentInstanceNumber: number;
  pendingEquipmentAscension: PendingEquipmentAscension | null;
}

export interface GameState {
  schemaVersion: typeof GAME_SCHEMA_VERSION;
  elapsedMs: number;
  /** Time accepted by the real-time loop but not yet simulated as a fixed step. */
  simulationRemainderMs: number;
  fortress: Fortress;
  heroes: Hero[];
  inventory: Inventory;
  equipmentInventory: EquipmentInstance[];
  progression: ProgressionState;
  expedition: ExpeditionState;
}

export interface SaveFile {
  schemaVersion: typeof GAME_SCHEMA_VERSION;
  savedAtEpochMs: number;
  game: GameState;
}

export type RandomSource = () => number;

export const isOreItemId = (itemId: ItemId): itemId is OreItemId =>
  itemId === 'copper-ore' || itemId === 'iron-ore' || itemId === 'silver-ore';

export const toStarredOreItemId = (itemId: OreItemId, stars: OreStar): StarredOreItemId =>
  `${itemId}-${stars}-star`;
