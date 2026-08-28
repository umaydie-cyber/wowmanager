/**
 * Post-campaign rules deliberately live outside the base 3-to-1 ascension flow.
 * Enabling one flag must be paired with its own command/config implementation.
 */
export const progressionFeatureFlags = {
  mythicExclusiveAffixes: false,
  postCampaignMythicPlusOne: false,
  postMythicAffixRules: false,
} as const;

export type ProgressionFeatureFlag = keyof typeof progressionFeatureFlags;
