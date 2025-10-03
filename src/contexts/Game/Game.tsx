'use client';
import { debugClient } from '@/debug';
import { Bullet, Ship } from '@/game';
import { GameTick } from '@/game/types';
import { PlayerButtonPayload, PlayerControlPayload } from '@/types';
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
        connection.on('server.host.player.button', this.handleHostPlayerButton);
        connection.on('server.host.player.control', this.handleHostPlayerControl);
        connection.on('server.viewer.game.tick', this.handleViewerGameTick);
        window.addEventListener('resize', this.handleResize);

        // Mark as ready
        connection.emit('viewer.server.ready');
    };

    componentWillUnmount() {
        const { connection } = this.props;

        // Remove listeners
        connection.off('server.host.player.button', this.handleHostPlayerButton);
        connection.off('server.host.player.control', this.handleHostPlayerControl);
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
            this.updateShips();
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

    updateShips = () => {
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

        // Add new ships
        players.forEach(player => {
            if (!this.shipsContainer.getChildByLabel(player.id)) {
                // Add new ship
                const ship = new Ship(this.app, player);
                this.shipsContainer.addChild(ship);
            }
        });
    };

    // Host
    hostTick = () => {
        const { connection } = this.props;

        // Tick elements
        const bullets = this.bulletsContainer.children.filter(bullet => bullet.playerId).map(bullet => bullet.tick());
        const ships = this.shipsContainer.children.map(ship => ship.tick());

        // Check collisions
        for (const bullet of this.bulletsContainer.children) {
            // Skip inactive bullets
            if (!bullet.playerId) {
                continue;
            }

            // Check against ships
            for (const ship of this.shipsContainer.children) {
                // Skip dead ships and own bullets
                if (!ship.health || ship.label === bullet.playerId) {
                    continue;
                }

                // Check distance
                const dx = ship.x - bullet.position.x;
                const dy = ship.y - bullet.position.y;
                const distance = 1; // TODO: Math.sqrt(dx * dx + dy * dy);
                if (distance > 16) {
                    continue;
                }

                // Hit ship
                bullet.reset();
                if (ship.hit()) {
                    connection.emit('host.server.player.dead', ship.label);
                }
                break;
            }
        }

        // Emit event
        const gameTick: GameTick = {
            bullets,
            ships,
        };
        if (!_.isEqual(this.gameTick, gameTick)) {
            this.gameTick = gameTick;
            connection.emit('host.server.game.tick', gameTick);
        }
    };

    handleHostPlayerButton = (payload: PlayerButtonPayload) => {
        // Get ship
        const ship = this.shipsContainer.children.find(s => s.label === payload.id);
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

    handleHostPlayerControl = (payload: PlayerControlPayload) => {
        const ship = this.shipsContainer.getChildByLabel(payload.id) as Ship | null;
        ship?.control(payload);
    };

    // Viewer
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
