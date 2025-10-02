'use client';
import { debugClient } from '@/debug';
import { Bullet, Ship } from '@/game';
import { compose } from '@/utils';
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

        // Add listeners
        // connection.on('host.player.update', this.handleHostPlayerUpdate);
        // connection.on('viewers.game.tick', this.handleViewersGameTick);
        // connection.on('viewers.players.add', this.handleViewersPlayersAdd);
        // connection.on('viewers.players.remove', this.handleViewersPlayersRemove);
        window.addEventListener('resize', this.handleResize);

        // Update state
        this.setState({
            canvas: this.app.canvas,
        });

        // Initialize elements
        this.updateShips();
    };

    componentWillUnmount() {
        const { connection } = this.props;

        // Remove listeners
        // connection.off('host.player.update', this.handleHostPlayerUpdate);
        // connection.off('viewers.game.tick', this.handleViewersGameTick);
        // connection.off('viewers.players.add', this.handleViewersPlayersAdd);
        // connection.off('viewers.players.remove', this.handleViewersPlayersRemove);
        window.removeEventListener('resize', this.handleResize);
    }

    componentDidUpdate(prevProps: Readonly<GameProviderProps>, prevState: Readonly<GameState>, snapshot?: any): void {
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

        // Add ships for added players
        players.forEach(player => {
            if (!this.shipsContainer.getChildByLabel(player.id)) {
                const ship = new Ship(this.app, player);
                this.shipsContainer.addChild(ship);
            }
        });
    };

    // handleHostPlayerUpdate = (payload: PlayerData, playerId?: string) => {
    //     // Update ship
    //     const ship = this.shipsContainer.children.find(s => s.playerId === playerId);
    //     ship?.update(payload);

    //     // Add bullet if any button is pressed
    //     if (ship && (payload.buttons?.[0] || payload.buttons?.[1])) {
    //         let bullet = this.bulletsContainer.children.find(b => !b.playerId);
    //         if (!bullet) {
    //             bullet = new Bullet(this.app);
    //             this.bulletsContainer.addChild(bullet);
    //         }
    //         bullet.fire(ship);
    //     }
    // };

    // handleViewersPlayersAdd = (players: Player[]) => {
    //     this.debug('Add players', players);

    //     // Add ships to canvas
    //     players.forEach(player => {
    //         const ship = new Ship(this.app, player);
    //         this.shipsContainer.addChild(ship);
    //     });
    // };

    // handleViewersPlayersRemove = (playerIds: string[]) => {
    //     this.debug('Remove players', playerIds);

    //     // Remove ships from canvas
    //     playerIds.forEach(playerId => {
    //         const ship = this.shipsContainer.getChildByLabel(playerId);
    //         ship?.removeFromParent();
    //     });
    // };

    // handleViewersGameTick = (payload: GameTickPayload) => {
    //     // Make sure there are enough bullets
    //     while (payload.bullets.length > this.bulletsContainer.children.length) {
    //         const bullet = new Bullet(this.app);
    //         this.bulletsContainer.addChild(bullet);
    //     }

    //     // Set bullets
    //     this.bulletsContainer.children.forEach((bullet, index) => {
    //         const bulletData = payload.bullets[index];
    //         if (bulletData) {
    //             bullet.set(bulletData);
    //         } else {
    //             bullet.reset();
    //         }
    //     });

    //     // Set ships
    //     payload.ships.forEach(shipData => {
    //         const ship = this.shipsContainer.getChildByLabel(shipData.playerId) as Ship | null;
    //         ship?.set(shipData);
    //     });
    // };

    hostTick = () => {
        // Tick elements
        // const bullets = this.bulletsContainer.children.filter(bullet => bullet.playerId).map(bullet => bullet.tick());
        // const ships = this.shipsContainer.children.map(ship => ship.tick());
        // Notify viewers
        // const payload: GameTickPayload = {
        //     bullets,
        //     ships,
        // };
        // this.props.connection.notifyViewers('viewers.game.tick', payload);
    };

    render() {
        return <GameContext.Provider value={this.state}>{this.props.children}</GameContext.Provider>;
    }
}

export const GameProvider = compose(withConnection)(Game);
