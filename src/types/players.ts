export type PlayerMap = Record<string, Player>;

export interface Player extends PlayerMove {
    id: string;
}

export interface PlayerMove {
    buttons: [boolean, boolean]; // [A, B]
    joystick: [number, number]; // [amount, angle]
}
