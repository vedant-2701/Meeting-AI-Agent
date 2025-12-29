import dotenv from "dotenv";

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "0.0.0.0",
    nodeEnv: process.env.NODE_ENV || "development",

    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
    },

    jwt: {
        secret: process.env.JWT_SECRET || "fallback-secret-change-me",
    },

    orchestrator: {
        url: process.env.ORCHESTRATOR_URL || "http://localhost:4000",
    },
} as const;
