'use client';
import { useGame } from '@/contexts/Game/Game';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { SliderPicker } from 'react-color';
import { PlayerConfigProps } from './PlayerConfig.types';

export function PlayerConfig({ onClose }: PlayerConfigProps) {
    const game = useGame();

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
                        value={game.config.name}
                        onChange={e => game.updateConfig({ name: e.currentTarget.value })}
                    />
                </div>

                {/* Color input */}
                <div>
                    <label className="block mb-2 font-bold">Color</label>
                    <SliderPicker color={game.config.color} onChange={e => game.updateConfig({ color: e.hex })} />
                </div>
            </div>
        </div>
    );
}
