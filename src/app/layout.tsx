import { ConnectionProvider } from '@/contexts/Connection/Connection';
import { GameProvider } from '@/contexts/Game/Game';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Arcade',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning={process.env.NODE_ENV !== 'production'}>
            <body>
                <ConnectionProvider>
                    <GameProvider>{children}</GameProvider>
                </ConnectionProvider>
            </body>
        </html>
    );
}
