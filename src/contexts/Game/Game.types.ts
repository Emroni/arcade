import { PlayerMap } from '@/types';
import { ConnectionState } from '../Connection/Connection.types';

export interface GameProviderProps {
    children: React.ReactNode;
    connection: ConnectionState;
}

export interface GameState {
    canvas: HTMLCanvasElement | null;
    players: PlayerMap;
    mountCanvas: (container: HTMLDivElement) => void;
}
