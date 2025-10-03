import { Player } from './player';

export interface ViewerSyncPayload {
    players: Player[];
    viewers: number;
}
