export type Players = Record<string, Player>;

export interface Player extends Point {
    id: string;
}

export interface Point {
    x: number;
    y: number;
}
