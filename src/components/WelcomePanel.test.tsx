import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { App } from '@/app/App';
import { useGameStore } from '@/game/store/useGameStore';

describe('WelcomePanel', () => {
  beforeEach(() => {
    useGameStore.setState({
      gameState: null,
      operation: 'idle',
      message: '',
    });
  });

  it('waits for restore, then creates a new game and exposes public save controls', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'WowManager' })).toBeInTheDocument();

    const startButton = await screen.findByRole('button', { name: '开始新游戏' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('新游戏已创建并保存。')).toBeInTheDocument();
    });
    expect(screen.getAllByText('艾澜').length).toBeGreaterThan(0);
    expect(screen.getByText('存档工具')).toBeInTheDocument();
  });
});
