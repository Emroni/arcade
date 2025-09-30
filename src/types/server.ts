export type PlayerMap = Record<string, Player>;
export type ViewerMap = Record<string, Viewer>;

export interface Player {
    buttons: [boolean, boolean]; // [A, B]
    id: string;
    joystick: [number, number]; // [amount, angle]
    position: [number, number]; // [x, y]
    velocity: [number, number]; // [x, y]
}

export interface Viewer {
    host: boolean;
    id: string;
}
