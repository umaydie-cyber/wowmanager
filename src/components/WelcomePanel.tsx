import { gameMetadata } from '@/game/content/gameMetadata';

interface WelcomePanelProps {
  isPreparing: boolean;
  status: string;
  onStartNewGame: () => void;
}

export function WelcomePanel({ isPreparing, status, onStartNewGame }: WelcomePanelProps) {
  return (
    <section className="welcome-panel" aria-labelledby="game-title">
      <p className="welcome-panel__eyebrow">原创像素奇幻</p>
      <h1 id="game-title">{gameMetadata.title}</h1>
      <p className="welcome-panel__description">{gameMetadata.tagline}</p>
      <button
        className="welcome-panel__start"
        type="button"
        disabled={isPreparing}
        onClick={onStartNewGame}
      >
        {isPreparing ? '准备中……' : '开始新游戏'}
      </button>
      <p className="welcome-panel__status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
