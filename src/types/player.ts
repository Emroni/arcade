export type PlayerButton = 'a' | 'b';
export type PlayerData = Partial<Player>;
export type PlayerMap = Record<string, Player>;

export interface Player {
    color: string;
    id: string;
    joystick: [number, number]; // [amount, angle]
    name: string;
}

export interface PlayerButtonPayload {
    button: PlayerButton;
    id: string;
}
