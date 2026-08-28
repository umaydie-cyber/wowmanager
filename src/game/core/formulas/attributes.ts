import { growthBalance } from '@/game/balance/growth';
import type { HeroAttributes } from '@/game/core/types';

export interface DerivedHeroAttributes {
  maxHealth: number;
  physicalPower: number;
  agilePower: number;
  spellPower: number;
  healingPower: number;
  physicalDamageReduction: number;
  spellDamageReduction: number;
  dodgeChance: number;
  focusGain: number;
}

const softCap = (rawValue: number, cap: number): number =>
  rawValue <= 0 ? 0 : (cap * rawValue) / (cap + rawValue);

export const deriveHeroAttributes = (
  attributes: HeroAttributes,
): DerivedHeroAttributes => {
  const balance = growthBalance.derivedAttributes;

  return {
    maxHealth:
      balance.baseHealth.value + attributes.stamina * balance.healthPerStamina.value,
    physicalPower:
      balance.basePower.value +
      attributes.strength * balance.powerPerPrimaryAttribute.value,
    agilePower:
      balance.basePower.value +
      attributes.agility * balance.powerPerPrimaryAttribute.value,
    spellPower:
      balance.basePower.value +
      attributes.intelligence * balance.powerPerPrimaryAttribute.value,
    healingPower:
      balance.basePower.value +
      attributes.knowledge * balance.powerPerPrimaryAttribute.value,
    physicalDamageReduction: softCap(
      attributes.strength * balance.physicalReductionPerStrength.value,
      balance.physicalReductionCap.value,
    ),
    spellDamageReduction: softCap(
      attributes.intelligence * balance.spellReductionPerIntelligence.value,
      balance.spellReductionCap.value,
    ),
    dodgeChance: softCap(
      attributes.agility * balance.dodgePerAgility.value,
      balance.dodgeCap.value,
    ),
    focusGain: attributes.knowledge * balance.focusPerKnowledge.value,
  };
};
