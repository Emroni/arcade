declare namespace NodeJS {
    export interface ProcessEnv {
        // Client configuration
        NEXT_PUBLIC_SERVER_PATH: string;

        // Server configuration
        SERVER_CORS_ORIGINS: string;
        SERVER_PORT: number;
    }
}

interface Point {
    x: number;
    y: number;
}
