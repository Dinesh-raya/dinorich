import { useEffect, useRef } from 'react';
import type { GameState } from '../../stores/slices/types';
import { calculateStandings } from '../../utils/standings';
import type { Standing } from '../../utils/standings';

// Custom hook for Bankruptcy and Game Over detection
export function useBankruptcyAndGameOver(
  game: GameState | null,
  myId: string | null,
  setBankruptPlayer: (p: { name: string; creditorName?: string }) => void,
  setShowBankruptModal: (show: boolean) => void,
  setGameWinner: (w: { name: string; isWinner: boolean }) => void,
  setGameStandings: (s: Standing[]) => void,
  setShowGameOverModal: (show: boolean) => void
) {
  const prevBankruptStatus = useRef<Record<string, boolean>>({});
  const gameOverShown = useRef<boolean>(false);
  const prevGameId = useRef<string | null>(null);

  // Reset when a new game starts (different room/game)
  useEffect(() => {
    if (game && game.room.room_id !== prevGameId.current) {
      prevGameId.current = game.room.room_id;
      gameOverShown.current = false;
      prevBankruptStatus.current = {};
    }
  }, [game?.room.room_id]);

  useEffect(() => {
    if (!game) return;

    const players = game.room.players;

    // Check for newly bankrupt players
    for (const [id, player] of Object.entries(players)) {
      const wasBankrupt = prevBankruptStatus.current[id] || false;
      if (player.is_bankrupt && !wasBankrupt) {
        // Find the actual creditor from the game history log
        // Backend logs: "{name} went bankrupt and transferred assets to {creditor}"
        const bankruptEntry = [...(game.history_log || [])].reverse().find(
          (entry: string) => entry.includes(player.name) && entry.includes('went bankrupt')
        );
        let creditorName: string | undefined;
        if (bankruptEntry && bankruptEntry.includes('transferred assets to')) {
          const match = bankruptEntry.match(/transferred assets to (.+)$/);
          if (match) creditorName = match[1].trim();
        }
        setBankruptPlayer({ name: player.name, creditorName });
        setShowBankruptModal(true);
      }
      prevBankruptStatus.current[id] = player.is_bankrupt;
    }

    // Check for game over — only show once per game
    const activePlayers = Object.values(players).filter((p) => !p.is_bankrupt);
    if (game.room.status === 'finished' && activePlayers.length === 1 && !gameOverShown.current) {
      gameOverShown.current = true;
      const winner = activePlayers[0];
      setGameWinner({
        name: winner.name,
        isWinner: winner.id === myId
      });

      const standings = calculateStandings(players, game);
      setGameStandings(standings);
      setShowGameOverModal(true);
    }
  }, [game, myId, setBankruptPlayer, setShowBankruptModal, setGameWinner, setGameStandings, setShowGameOverModal]);
}
