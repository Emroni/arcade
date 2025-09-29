export type PlayerMap = Record<string, Player>;

export interface Player {
    buttons: [boolean, boolean]; // [A, B]
    id: string;
    joystick: [number, number]; // [amount, angle]
    position: [number, number]; // [x, y]
    velocity: [number, number]; // [x, y]
}
