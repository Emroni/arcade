import { ShipData } from '@/game/Ship/Ship.types';
import { ConnectionState } from '../Connection/Connection.types';

export interface GameProviderProps {
    children: React.ReactNode;
    connection: ConnectionState;
}

export interface GameState {
    canvas: HTMLCanvasElement | null;
    config: GameConfig;
    mountCanvas: (container: HTMLDivElement) => void;
    updateConfig: (config: Partial<GameConfig>) => void;
}

export interface GameTickPayload {
    ships: Record<string, ShipData>;
}

export interface GameConfig {
    color: string;
    name: string;
}
