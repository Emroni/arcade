import { PlayerMap } from '@/types';
import { SocketState } from '../Socket/Socket.types';

export interface GameProviderProps {
    children: React.ReactNode;
    socket: SocketState;
}

export interface GameState {
    canvas: HTMLCanvasElement | null;
    players: PlayerMap;
    mountCanvas: (container: HTMLDivElement) => void;
}
