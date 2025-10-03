import { Player, PlayerControlPayload, PlayerData } from '@/types';
import * as PIXI from 'pixi.js';
import { ShipData } from './Ship.types';

export class Ship extends PIXI.Container {
    app: PIXI.Application;
    nameText: PIXI.Text;
    shape: PIXI.Graphics;

    velocityDecay = 0.995;
    velocityEase = 0.1;
    velocityMultiplier = 20;

    force = 0;
    velocityX = 0;
    velocityY = 0;

    constructor(app: PIXI.Application, player: Player) {
        // Initialize parent class
        super({
            label: player.id,
        });

        // Initialize properties
        this.app = app;

        this.x = 500;
        this.y = 500;

        // Add shape
        this.shape = new PIXI.Graphics();
        this.addChild(this.shape);
        this.shape.clear();
        this.shape.moveTo(0, 0);
        this.shape.lineTo(32, 8);
        this.shape.lineTo(0, 16);
        this.shape.lineTo(0, 0);
        this.shape.fill('#ffffff');
        this.shape.pivot.set(16, 8);
        this.shape.tint = player.color || 0xffffff;

        // Add name text
        this.nameText = new PIXI.Text({
            style: new PIXI.TextStyle({
                fill: '#ffffff',
                fontSize: 12,
            }),
            text: player.name,
        });
        this.addChild(this.nameText);
        this.nameText.x = -this.nameText.width / 2;
        this.nameText.y = 16;
    }

    get = () => {
        return {
            id: this.label,
            position: [this.x, this.y],
            rotation: this.shape.rotation,
            velocity: [this.velocityX, this.velocityY],
        } as ShipData;
    };

    set = (data: ShipData) => {
        this.position.set(data.position[0], data.position[1]);
        this.shape.rotation = data.rotation;
        this.velocityX = data.velocity[0];
        this.velocityY = data.velocity[1];
    };

    control = (payload: PlayerControlPayload) => {
        // Parse angle
        if (payload.angle !== undefined) {
            this.shape.rotation = payload.angle;
        }

        // Parse force
        if (payload.force !== undefined) {
            this.force = payload.force;
        }
    };

    update = (data: PlayerData) => {
        // Parse color
        if (data.color !== undefined) {
            this.shape.tint = data.color;
        }

        // Parse name
        if (data.name !== undefined) {
            this.nameText.text = data.name;
            this.nameText.x = -this.nameText.width / 2;
        }
    };

    tick = () => {
        // Update velocity
        if (this.force) {
            const force = this.force * this.velocityMultiplier;
            const targetVelocityX = Math.cos(this.shape.rotation) * force;
            const targetVelocityY = Math.sin(this.shape.rotation) * force;
            this.velocityX += (targetVelocityX - this.velocityX) * this.velocityEase;
            this.velocityY += (targetVelocityY - this.velocityY) * this.velocityEase;
        }

        // Decay velocity
        this.velocityX *= this.velocityDecay;
        this.velocityY *= this.velocityDecay;

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Wrap around edges
        if (this.x < 0) this.x = 1000;
        if (this.x > 1000) this.x = 0;
        if (this.y < 0) this.y = 1000;
        if (this.y > 1000) this.y = 0;

        // Return data
        return this.get();
    };
}
