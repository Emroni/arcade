import { SocketProvider } from '@/contexts/Socket/Socket';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Arcade',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body>
                <SocketProvider>{children}</SocketProvider>
            </body>
        </html>
    );
}
