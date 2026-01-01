import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
function getEnvVar(key: string, required: boolean = false): string {
    const value = process.env[key];
    if (required && !value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || "";
}

function getEnvVarInt(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Invalid integer for ${key}: ${value}`);
    }
    return parsed;
}

export const config = {
    port: getEnvVarInt("PORT", 4000),
    host: process.env.HOST || "0.0.0.0",
    nodeEnv: process.env.NODE_ENV || "development",
    isDev: process.env.NODE_ENV !== "production",

    database: {
        db_url: getEnvVar("DATABASE_URL", true), // Required!
        db_user: process.env.DATABASE_USER || "root",
        db_password: process.env.DATABASE_PASSWORD || "",
        db_host: process.env.DATABASE_HOST || "localhost",
        db_port: getEnvVarInt("DATABASE_PORT", 3306),
        db_name: process.env.DATABASE_NAME || "meeting_ai",
    },

    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: getEnvVarInt("REDIS_PORT", 6379),
    },

    gemini: {
        apiKey: getEnvVar("GOOGLE_API_KEY", true), // Required!
        model: process.env.GOOGLE_GEMINI_MODEL || "gemini-1.5-flash",
    },

    knowledgeService: {
        url: process.env.KNOWLEDGE_SERVICE_URL || "localhost:50051",
    },

    // LLM settings
    llm: {
        maxRetries: 0,
        timeout: 30000, // 30 seconds
        temperature: {
            router: 0, // Deterministic for routing
            generation: 0.3, // Slightly creative for summaries
        },
    },
} as const;

console.log(config);

export type Config = typeof config;