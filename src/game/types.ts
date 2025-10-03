import { BulletData } from './Bullet/Bullet.types';
import { ShipData } from './Ship/Ship.types';

export * from './Bullet/Bullet.types';
export * from './Ship/Ship.types';

export interface GameTick {
    bullets: BulletData[];
    ships: ShipData[];
}
