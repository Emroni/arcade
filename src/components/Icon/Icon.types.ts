export type IconType = 'close' | 'github' | 'host' | 'player' | 'settings' | 'viewer';

export interface IconProps {
    size?: number;
    type: IconType;
}
