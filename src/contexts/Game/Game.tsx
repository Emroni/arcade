'use client';
import { debugClient } from '@/debug';
import { Bullet, Ship } from '@/game';
import { GameTick } from '@/game/types';
import { Player } from '@/types';
import { compose } from '@/utils';
import _ from 'lodash';
import * as PIXI from 'pixi.js';
import { Component, createContext, useContext } from 'react';
import { withConnection } from '../Connection/Connection';
import { GameProviderProps, GameState } from './Game.types';

export const GameContext = createContext<GameState>({} as GameState);

export const useGame = () => useContext(GameContext);

export function withGame(WrappedComponent: any) {
    return function GameWrappedComponent(props: any) {
        return <GameContext.Consumer>{state => <WrappedComponent {...props} game={state} />}</GameContext.Consumer>;
    };
}

class Game extends Component<GameProviderProps, GameState> {
    app: PIXI.Application;
    background?: PIXI.TilingSprite;
    bulletsContainer: PIXI.Container<Bullet>;
    container: PIXI.Container;
    shipsContainer: PIXI.Container<Ship>;

    active = false;
    gameTick: GameTick | null = null;

    constructor(props: GameProviderProps) {
        super(props);

        // Create app
        this.app = new PIXI.Application();

        // Add container
        this.container = new PIXI.Container<Ship>();
        this.app.stage.addChild(this.container);

        // Add bullets container
        this.bulletsContainer = new PIXI.Container<Bullet>();
        this.container.addChild(this.bulletsContainer);

        // Add ships container
        this.shipsContainer = new PIXI.Container<Ship>();
        this.container.addChild(this.shipsContainer);

        // Initialize state
        this.state = {
            canvas: null,
            mountCanvas: this.mountCanvas,
        };
    }

    componentDidMount = async () => {
        const { connection } = this.props;

        // Initialize app
        await this.app.init();

        // Add background
        this.background = new PIXI.TilingSprite({
            texture: await PIXI.Assets.load('/space.png'),
        });
        this.app.stage.addChildAt(this.background, 0);
        this.background.anchor.set(0.5);

        // Update state
        this.setState({
            canvas: this.app.canvas,
        });

        // Add listeners
        connection.on('server.viewer.game.tick', this.handleViewerGameTick);
        window.addEventListener('resize', this.handleResize);

        // Initial elements
        this.updateElements();
    };

    componentWillUnmount() {
        const { connection } = this.props;

        // Remove listeners
        connection.off('server.viewer.game.tick', this.handleViewerGameTick);
        window.removeEventListener('resize', this.handleResize);
    }

    componentDidUpdate(prevProps: Readonly<GameProviderProps>) {
        const { connection } = this.props;

        // Start game loop if host
        if (!this.active && this.app.ticker && this.props.connection.host) {
            this.active = true;
            this.app.ticker.minFPS = 20;
            this.app.ticker.maxFPS = 30;
            this.app.ticker.add(this.hostTick);
        }

        // Update elements
        if (connection.players !== prevProps.connection.players) {
            this.updateElements();
        }
    }

    debug = (message: string, ...args: any[]) => {
        debugClient('game', message, ...args);
    };

    updateState = async (
        newState: Partial<GameState> | ((prevState: GameState) => Partial<GameState> | null) | null
    ) => {
        return new Promise<GameState>(resolve => {
            this.setState(newState as GameState, () => {
                resolve(this.state);
            });
        });
    };

    mountCanvas = (container: HTMLDivElement) => {
        container.appendChild(this.app.canvas);
        this.app.resizeTo = container;
        this.handleResize();
    };

    handleResize = () => {
        // Get size and position based on smallest side
        const size = Math.min(this.app.canvas.width, this.app.canvas.height);
        const scale = size / 1000;
        const centerX = this.app.canvas.width / 2;
        const centerY = this.app.canvas.height / 2;

        // Resize background
        this.background!.position.set(centerX, centerY);
        this.background!.height = size;
        this.background!.width = size;

        // Resize container
        this.container.scale.set(scale);
        this.container.position.set(centerX - size / 2, centerY - size / 2);
    };

    updateElements = () => {
        const { players } = this.props.connection;

        // Update existing ships
        this.shipsContainer.children.forEach(ship => {
            const player = players.find(p => p.id === ship.label);
            if (player) {
                // Apply updates
                ship.update(player);
            } else {
                // Remove ships of removed players
                ship.destroy(true);
            }
        });

        // Process players
        players.forEach(player => {
            this.addBullet(player);
            this.addShip(player);
        });
    };

    addBullet = (player: Player) => {
        // Check if a button is pressed on host
        if (!this.props.connection.host || (!player.buttons?.[0] && !player.buttons?.[1])) {
            return;
        }

        // Get ship
        const ship = this.shipsContainer.children.find(s => s.label === player.id);
        if (!ship) {
            return;
        }

        // Find existing bullet or create new one
        let bullet = this.bulletsContainer.children.find(b => !b.playerId);
        if (!bullet) {
            bullet = new Bullet(this.app);
            this.bulletsContainer.addChild(bullet);
        }
        bullet.fire(ship);
    };

    addShip = (player: Player) => {
        // Check if ship already exists
        if (this.shipsContainer.getChildByLabel(player.id)) {
            return;
        }

        // Add ship
        const ship = new Ship(this.app, player);
        this.shipsContainer.addChild(ship);
    };

    hostTick = () => {
        // Tick elements
        const bullets = this.bulletsContainer.children.filter(bullet => bullet.playerId).map(bullet => bullet.tick());
        const ships = this.shipsContainer.children.map(ship => ship.tick());

        // Emit event
        const newGameTick: GameTick = {
            bullets,
            ships,
        };
        if (!_.isEqual(this.gameTick, newGameTick)) {
            this.gameTick = newGameTick;
            this.props.connection.emit('host.server.game.tick', newGameTick);
        }
    };

    handleViewerGameTick = (gameTick: GameTick) => {
        this.gameTick = gameTick;

        // Set bullets
        gameTick.bullets.forEach((bulletData, index) => {
            let bullet = this.bulletsContainer.children[index];
            if (!bullet) {
                bullet = new Bullet(this.app);
                this.bulletsContainer.addChild(bullet);
            }
            bullet.set(bulletData);
        });

        // Reset unused bullets
        if (this.bulletsContainer.children.length > gameTick.bullets.length) {
            this.bulletsContainer.children.slice(gameTick.bullets.length).forEach(bullet => bullet.reset());
        }

        // Set ships
        gameTick.ships.forEach(shipData => {
            const ship = this.shipsContainer.getChildByLabel(shipData.id) as Ship | null;
            ship?.set(shipData);
        });
    };

    render() {
        return <GameContext.Provider value={this.state}>{this.props.children}</GameContext.Provider>;
    }
}

export const GameProvider = compose(withConnection)(Game);
