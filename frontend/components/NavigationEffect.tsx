import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';

// Sync zustand room state with URL
export function NavigationEffect() {
  const navigate = useNavigate();
  const room = useGameStore(s => s.room);
  const connected = useGameStore(s => s.connected);
  const prevRoomId = useRef<string | null>(null);
  const prevConnected = useRef(connected);

  useEffect(() => {
    if (room) {
      if (prevRoomId.current !== room.room_id) {
        prevRoomId.current = room.room_id;
        navigate(`/room/${room.room_id}`, { replace: true });
      }
    } else if (prevRoomId.current !== null) {
      prevRoomId.current = null;
      navigate('/', { replace: true });
    }
  }, [room, navigate]);

  useEffect(() => {
    if (prevConnected.current && !connected && prevRoomId.current) {
      prevRoomId.current = null;
      navigate('/', { replace: true });
    }
    prevConnected.current = connected;
  }, [connected, navigate]);

  return null;
}
