'use client';
import { useConnection } from '@/contexts/Connection/Connection';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { SliderPicker } from 'react-color';
import { PlayerConfigProps } from './PlayerConfig.types';

export function PlayerConfig({ onClose }: PlayerConfigProps) {
    const connection = useConnection();

    if (!connection.player) {
        return null;
    }

    return (
        <div className="p-2">
            <button className="h-8 w-8" onClick={onClose}>
                <XMarkIcon />
            </button>

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
                        value={connection.player.name}
                        onChange={e => connection.updatePlayer({ name: e.currentTarget.value })}
                    />
                </div>

                {/* Color input */}
                <div>
                    <label className="block mb-2 font-bold">Color</label>
                    <SliderPicker
                        color={connection.player.color}
                        onChange={e => connection.updatePlayer({ color: e.hex })}
                    />
                </div>
            </div>
        </div>
    );
}
