import { createNewGame } from './newGame';
import {
  calculateRuneAttributes,
  getRuneResetCost,
  resetRunes,
  unlockRuneNode,
} from './runes';

describe('rune trees', () => {
  it('enforces configured prerequisites and rune-point costs', () => {
    const game = createNewGame();
    expect(() => unlockRuneNode(game, 'hero-aelan', 'stamina-2')).toThrow('前置符文节点');

    const next = unlockRuneNode(game, 'hero-aelan', 'stamina-1');
    expect(next.heroes[0]?.runePoints).toBe(9);
    expect(calculateRuneAttributes(next.heroes[0]!).stamina).toBe(1);
  });

  it('requires an explicit passive or skill choice on every fifth node', () => {
    let state = createNewGame();
    for (const step of [1, 2, 3, 4] as const) {
      state = unlockRuneNode(state, 'hero-aelan', `stamina-${step}`);
    }
    expect(() => unlockRuneNode(state, 'hero-aelan', 'stamina-5')).toThrow(
      '必须从配置候选中选择',
    );

    state = unlockRuneNode(state, 'hero-aelan', 'stamina-5', 'iron-roots');
    expect(state.heroes[0]).toMatchObject({
      runePoints: 5,
      runeChoiceSelections: { 'stamina-5': 'iron-roots' },
    });
    expect(calculateRuneAttributes(state.heroes[0]!).stamina).toBe(4);
  });

  it('uses the configured reset cost and refunds all spent rune points', () => {
    let state = createNewGame();
    for (const step of [1, 2, 3, 4] as const) {
      state = unlockRuneNode(state, 'hero-aelan', `strength-${step}`);
    }
    state = unlockRuneNode(state, 'hero-aelan', 'strength-5', 'shield-slam');
    expect(getRuneResetCost(state.heroes[0]!)).toBe(7);

    const reset = resetRunes(state, 'hero-aelan');
    expect(reset.inventory.items['rune-dust']).toBe(5);
    expect(reset.heroes[0]).toMatchObject({
      runePoints: 10,
      unlockedRuneNodeIds: [],
      runeChoiceSelections: {},
    });
  });
});
