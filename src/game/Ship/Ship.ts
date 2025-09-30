import { Player } from '@/types';
import _ from 'lodash';
import * as PIXI from 'pixi.js';
import { ShipData } from './Ship.types';

export class Ship extends PIXI.Container {
    app: PIXI.Application;
    playerId: string;

    velocityDecay = 0.995;
    velocityMax = 3;
    velocityX = 0;
    velocityY = 0;

    constructor(app: PIXI.Application, playerId: string) {
        // Initialize parent class
        super({
            label: playerId,
        });

        // Initialize properties
        this.app = app;
        this.playerId = playerId;

        // Add shape
        const shape = new PIXI.Graphics();
        this.addChild(shape);
        shape.clear();
        shape.moveTo(0, 0);
        shape.lineTo(32, 8);
        shape.lineTo(0, 16);
        shape.lineTo(0, 0);
        shape.fill('white');
        shape.x = -16;
        shape.y = -8;
    }

    get = () => {
        return {
            position: [this.x, this.y],
            rotation: this.rotation,
        } as ShipData;
    };

    set = (data: ShipData) => {
        this.position.set(data.position[0], data.position[1]);
        this.rotation = data.rotation;
    };

    update = (data: Partial<Player>) => {
        // Parse joystick
        if (data.joystick) {
            const [amount, angle] = data.joystick;

            // Update rotation
            this.rotation = angle;

            // Update velocity
            this.velocityX = this.velocityX + Math.cos(angle) * amount * this.velocityDecay;
            this.velocityX = _.clamp(this.velocityX, -this.velocityMax, this.velocityMax);
            this.velocityY = this.velocityY + Math.sin(angle) * amount * this.velocityDecay;
            this.velocityY = _.clamp(this.velocityY, -this.velocityMax, this.velocityMax);
        }
    };

    tick = () => {
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Wrap around edges
        if (this.x < 0) this.x = this.app.canvas.width;
        if (this.x > this.app.canvas.width) this.x = 0;
        if (this.y < 0) this.y = this.app.canvas.height;
        if (this.y > this.app.canvas.height) this.y = 0;
    };
}
