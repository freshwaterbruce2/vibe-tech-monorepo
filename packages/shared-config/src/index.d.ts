import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    APP_DB_PATH: z.ZodDefault<z.ZodString>;
    LEARNING_DB_PATH: z.ZodDefault<z.ZodString>;
    LEARNING_SYSTEM_DIR: z.ZodDefault<z.ZodString>;
    IPC_WS_URL: z.ZodDefault<z.ZodString>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        test: "test";
        development: "development";
        production: "production";
    }>>;
    APP_ENV: z.ZodDefault<z.ZodEnum<{
        test: "test";
        development: "development";
        production: "production";
    }>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<{
        error: "error";
        warn: "warn";
        info: "info";
        debug: "debug";
    }>>;
}, z.core.$strip>;
type EnvConfig = z.infer<typeof envSchema>;
export declare const normalizePath: (path: string) => string;
export declare const env: {
    APP_DB_PATH: string;
    LEARNING_DB_PATH: string;
    LEARNING_SYSTEM_DIR: string;
    IPC_WS_URL: string;
    NODE_ENV: "test" | "development" | "production";
    APP_ENV: "test" | "development" | "production";
    LOG_LEVEL: "error" | "warn" | "info" | "debug";
};
export declare const getDatabasePath: (type: "app" | "learning") => string;
export declare const getLearningSystemDir: () => string;
export declare const validatePath: (path: string) => boolean;
export declare const getIPCConfig: () => {
    url: string;
    reconnectDelay: number;
    maxReconnectAttempts: number;
};
export type { EnvConfig };
export default env;
//# sourceMappingURL=index.d.ts.map