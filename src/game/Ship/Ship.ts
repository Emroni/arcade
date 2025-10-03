import { Player, PlayerControlPayload, PlayerData } from '@/types';
import _ from 'lodash';
import * as PIXI from 'pixi.js';
import { ShipData } from './Ship.types';

export class Ship extends PIXI.Container {
    app: PIXI.Application;
    healthBar: PIXI.Graphics;
    nameText: PIXI.Text;
    shape: PIXI.Graphics;

    velocityDecay = 0.995;
    velocityEase = 0.1;
    velocityMultiplier = 20;

    force = 0;
    health = 0;
    velocityX = 0;
    velocityY = 0;

    constructor(app: PIXI.Application, player: Player) {
        // Initialize parent class
        super({
            label: player.id,
        });

        // Initialize properties
        this.app = app;

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
        this.shape.tint = player.color || '#ffffff';

        // Add health bar
        this.healthBar = new PIXI.Graphics();
        this.addChild(this.healthBar);
        this.healthBar.x = -16;
        this.healthBar.y = 18;

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
        this.nameText.y = 24;

        // Initialize state
        this.reset();
        this.flash(2);
    }

    reset = () => {
        this.force = 0;
        this.health = 3;
        this.velocityX = 0;
        this.velocityY = 0;
        this.x = _.random(0, 1000);
        this.y = _.random(0, 1000);
        this.updateHealth();
    };

    flash = (times: number, callback?: () => void) => {
        // Trigger callback if no times remain
        if (!times) {
            callback?.();
            return;
        }

        // Flash opacity
        this.shape.alpha = 0.7;
        setTimeout(() => {
            this.shape.alpha = 1;

            // Flash again
            setTimeout(() => {
                this.flash(times - 1, callback);
            }, 100);
        }, 100);
    };

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

    hit = () => {
        // Check current health
        if (!this.health) {
            return;
        }

        // Decrease health
        this.health = Math.max(0, this.health - 1);
        this.updateHealth();

        // Flash if hit or reset if killed
        if (this.health) {
            this.flash(1);
        } else {
            this.flash(5, this.reset);
        }
    };

    updateHealth = () => {
        // Fill red
        this.healthBar.clear();
        this.healthBar.rect(0, 0, 32, 2);
        this.healthBar.fill('#ff0000');

        // Overlay green
        this.healthBar.rect(0, 0, (32 * this.health) / 3, 2);
        this.healthBar.fill('#00ff00');
    };

    tick = () => {
        // Update velocity
        if (this.force && this.health) {
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
