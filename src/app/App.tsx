import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { WelcomePanel } from '@/components/WelcomePanel';
import { simulationBalance } from '@/game/balance/simulation';
import {
  selectGameState,
  selectMessage,
  selectOperation,
  useGameStore,
} from '@/game/store/useGameStore';

const FortressWorkspace = lazy(async () => {
  const module = await import('@/components/FortressWorkspace');
  return { default: module.FortressWorkspace };
});

export function App() {
  const createNewGame = useGameStore((state) => state.createNewGame);
  const loadGame = useGameStore((state) => state.loadGame);
  const saveGame = useGameStore((state) => state.saveGame);
  const advanceBy = useGameStore((state) => state.advanceBy);
  const gameState = useGameStore(selectGameState);
  const message = useGameStore(selectMessage);
  const operation = useGameStore(selectOperation);
  const hasRequestedRestore = useRef(false);
  const [hasFinishedRestore, setHasFinishedRestore] = useState(false);
  const hasGame = gameState !== null;

  useEffect(() => {
    if (hasRequestedRestore.current) {
      return;
    }
    hasRequestedRestore.current = true;
    void loadGame().finally(() => setHasFinishedRestore(true));
  }, [loadGame]);

  useEffect(() => {
    if (!hasGame || operation !== 'idle') {
      return undefined;
    }

    let frameId = 0;
    let previousTimestamp = performance.now();
    let unsimulatedMs = 0;
    const tick = (timestamp: number) => {
      // Keep React snapshots on simulation steps; rendering frames do not mutate game state.
      unsimulatedMs += Math.min(
        timestamp - previousTimestamp,
        simulationBalance.maxFrameDeltaMs,
      );
      previousTimestamp = timestamp;
      if (unsimulatedMs >= simulationBalance.fixedStepMs) {
        advanceBy(unsimulatedMs, false);
        unsimulatedMs = 0;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [advanceBy, hasGame, operation]);

  useEffect(() => {
    const saveWhenHidden = () => {
      const state = useGameStore.getState();
      if (
        document.visibilityState === 'hidden' &&
        state.gameState !== null &&
        state.operation === 'idle'
      ) {
        void saveGame();
      }
    };

    document.addEventListener('visibilitychange', saveWhenHidden);
    return () => document.removeEventListener('visibilitychange', saveWhenHidden);
  }, [saveGame]);

  return (
    <main className="app-shell">
      {gameState === null ? (
        <div className="app-layout app-layout--single">
          <WelcomePanel
            isPreparing={!hasFinishedRestore || operation !== 'idle'}
            status={hasFinishedRestore ? message : '正在检查浏览器中的本地存档……'}
            onStartNewGame={() => void createNewGame()}
          />
        </div>
      ) : (
        <div className="game-layout game-layout--single">
          <Suspense
            fallback={
              <section className="loading-panel" aria-live="polite">
                正在载入要塞界面……
              </section>
            }
          >
            <FortressWorkspace />
          </Suspense>
        </div>
      )}
    </main>
  );
}
