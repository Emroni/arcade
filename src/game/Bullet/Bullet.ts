import * as PIXI from 'pixi.js';
import { Ship } from '../Ship/Ship';
import { BulletData } from './Bullet.types';

export class Bullet extends PIXI.Container {
    app: PIXI.Application;
    shape: PIXI.Graphics;

    playerId: string | null = null;
    velocityMultiplier = 20;
    velocityX = 0;
    velocityY = 0;

    constructor(app: PIXI.Application) {
        // Initialize parent class
        super();

        // Initialize properties
        this.app = app;
        this.reset();

        // Add shape
        this.shape = new PIXI.Graphics();
        this.addChild(this.shape);
        this.shape.clear();
        this.shape.rect(0, 0, 8, 4);
        this.shape.fill('#ffffff');
    }

    get = () => {
        return {
            playerId: this.playerId,
            position: [this.x, this.y],
            rotation: this.shape.rotation,
        } as BulletData;
    };

    set = (data: BulletData) => {
        // Update properties
        this.playerId = data.playerId;
        this.position.set(data.position[0], data.position[1]);
        this.shape.rotation = data.rotation;

        // Update velocity
        this.velocityX = Math.cos(data.rotation) * this.velocityMultiplier;
        this.velocityY = Math.sin(data.rotation) * this.velocityMultiplier;
    };

    fire = (ship: Ship) => {
        this.set({
            ...ship.get(),
            playerId: ship.label,
        });
    };

    reset = () => {
        this.playerId = null;
        this.position.set(-10, -10);
        this.rotation = 0;
    };

    tick = () => {
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Reset if out of bounds
        if (this.x < -10 || this.x > 1010 || this.y < -10 || this.y > 1010) {
            this.reset();
        }

        // Return data
        return this.get();
    };
}
