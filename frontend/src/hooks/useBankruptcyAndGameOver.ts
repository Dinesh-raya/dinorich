import { useEffect, useRef } from 'react';
import type { GameState } from '../../stores/slices/types';
import { calculateStandings, type Standing } from '../utils/helpers';
import { recordGameEnd } from '../../utils/playerProfile';

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

  useEffect(() => {
    if (!game) return;

    const players = game.room.players;

    // Check for newly bankrupt players
    for (const [id, player] of Object.entries(players)) {
      const wasBankrupt = prevBankruptStatus.current[id] || false;
      if (player.is_bankrupt && !wasBankrupt) {
        const creditorId = game.turn_order.find((tid: string) => tid !== id && !players[tid]?.is_bankrupt);
        setBankruptPlayer({
          name: player.name,
          creditorName: creditorId ? players[creditorId]?.name : undefined
        });
        setShowBankruptModal(true);
      }
      prevBankruptStatus.current[id] = player.is_bankrupt;
    }

    // Check for game over
    const activePlayers = Object.values(players).filter((p) => !p.is_bankrupt);
    if (game.room.status === 'finished' && activePlayers.length === 1) {
      const winner = activePlayers[0];
      setGameWinner({
        name: winner.name,
        isWinner: winner.id === myId
      });

      const standings = calculateStandings(players, game);
      setGameStandings(standings);
      setShowGameOverModal(true);

      // Record stats for the current player
      const me = players[myId!];
      if (me) {
        const isWinner = winner.id === myId;
        const myStanding = standings.find(s => s.id === myId);
        recordGameEnd(
          isWinner,
          myStanding?.money ?? me.money,
          me.properties_owned?.length ?? 0,
          me.jail_turns ?? 0
        );
      }
    }
  }, [game, myId, setBankruptPlayer, setShowBankruptModal, setGameWinner, setGameStandings, setShowGameOverModal]);
}
