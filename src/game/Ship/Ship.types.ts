export interface ShipData {
    health: number;
    id: string;
    position: [number, number]; // [x, y]
    rotation: number;
    velocity: [number, number]; // [x, y]
}
