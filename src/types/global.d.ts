declare namespace NodeJS {
    export interface ProcessEnv {
        // Client configuration
        NEXT_PUBLIC_DEBUG?: string;
        NEXT_PUBLIC_METERED_API_KEY?: string;
        NEXT_PUBLIC_SERVER_PATH: string;

        // Server configuration
        SERVER_DEBUG?: string;
        SERVER_PORT: number;
    }
}

interface Point {
    x: number;
    y: number;
}
