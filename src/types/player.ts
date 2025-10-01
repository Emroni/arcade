export type PlayerData = Partial<Player>;
export type PlayerMap = Record<string, Player>;

export interface Player {
    buttons: [boolean, boolean]; // [A, B]
    color: string;
    id: string;
    joystick: [number, number]; // [amount, angle]
    name: string;
}
