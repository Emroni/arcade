export type PlayerButton = 'a' | 'b';
export type PlayerData = Partial<Player>;

export interface Player {
    color: string;
    id: string;
    name: string;
}

export interface PlayerButtonPayload {
    button: PlayerButton;
    id: string;
}

export interface PlayerControlPayload {
    angle: number;
    force: number;
    id: string;
}
