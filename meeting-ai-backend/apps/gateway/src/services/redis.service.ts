import { Redis } from "ioredis";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { safeRedisOp } from "../utils/error-handler.js";

// Publisher instance - for sending audio chunks
const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: 3,
});

// Redis channels
export const CHANNELS = {
    AUDIO_QUEUE: "queue:audio_input", // Gateway -> ASR Service
    TEXT_OUTPUT: "channel:text_output", // ASR Service -> Orchestrator
} as const;

redis.on("connect", () => {
    logger.info("Redis publisher connected");
});

redis.on("error", (err) => {
    logger.error({ err }, "Redis publisher error");
});

export const redisService = {
    /**
     * Publish audio chunk to Redis for ASR processing
     */
    async publishAudioChunk(
        meetingId: string,
        chunk: Buffer,
        metadata?: Record<string, unknown>
    ): Promise<boolean> {
        const message = JSON.stringify({
            meetingId,
            timestamp: Date.now(),
            audio: chunk.toString("base64"), // Binary to base64 for JSON transport
            metadata,
        });

        const result = await safeRedisOp(
            // This stores the message in a list. It stays there until the worker takes it.
            () => redis.lpush(CHANNELS.AUDIO_QUEUE, message),
            "publishAudioChunk"
        );

        if (result.success) {
            logger.debug({ meetingId, chunkSize: chunk.length }, "Audio chunk published");
        } else {
            logger.error({ meetingId }, "Failed to publish audio chunk");
        }

        return result.success;
    },

    /**
     * Health check for Redis connection
     */
    async ping(): Promise<boolean> {
        const result = await safeRedisOp(
            () => redis.ping(),
            "ping"
        );

        return result.success && result.data === "PONG";
    },

    /**
     * Graceful shutdown
     */
    async disconnect(): Promise<void> {
        const result = await safeRedisOp(
            () => redis.quit(),
            "disconnect"
        );
        
        if (result.success) {
            logger.info("Redis disconnected");
        }
    },
};
