'use client';
import { useConnection } from '@/contexts/Connection/Connection';
import { HuePicker } from 'react-color';
import { Icon } from '../Icon/Icon';
import { PlayerConfigProps } from './PlayerConfig.types';

export function PlayerConfig({ onClose }: PlayerConfigProps) {
    const connection = useConnection();

    // Destructure player
    const { color, name } = connection.player!;

    return (
        <div className="p-2">
            <div className="text-right">
                <button className="h-8 w-8" onClick={onClose}>
                    <Icon size={20} type="close" />
                </button>
            </div>

            <div className="p-4 space-y-6">
                {/* Name input */}
                <div>
                    <label className="block mb-2 font-bold" htmlFor="name">
                        Name
                    </label>
                    <input
                        className="w-full p-2 border border-gray-300 rounded"
                        id="name"
                        type="text"
                        value={name}
                        onChange={e => connection.updatePlayer({ name: e.currentTarget.value })}
                    />
                </div>

                {/* Color input */}
                <div>
                    <label className="block mb-2 font-bold">Color</label>
                    <HuePicker color={color} width="100%" onChange={e => connection.updatePlayer({ color: e.hex })} />
                </div>
            </div>
        </div>
    );
}
