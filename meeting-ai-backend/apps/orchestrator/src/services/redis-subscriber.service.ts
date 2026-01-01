import { Redis } from "ioredis";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { safeJsonParse } from "../utils/error-handler.js";
import { transcriptService } from "./transcript.service.js";
import { REDIS_CHANNELS } from "../constants/index.js";

interface TranscriptMessage {
    meetingId: string;
    text: string;
    speakerName?: string;
    timestamp: number;
    confidence?: number;
}

let subscriber: Redis | null = null;

export const redisSubscriberService = {
    /**
     * Start listening to Redis channels
     */
    async start(): Promise<void> {
        subscriber = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            maxRetriesPerRequest: 3,
        });

        subscriber.on("connect", () => {
            logger.info("Redis subscriber connected");
        });

        subscriber.on("error", (err) => {
            logger.error({ err }, "Redis subscriber error");
        });

        // Subscribe to text output channel
        await subscriber.subscribe(REDIS_CHANNELS.TEXT_OUTPUT);
        logger.info({ channel: REDIS_CHANNELS.TEXT_OUTPUT }, "Subscribed to channel");

        // Handle incoming messages
        subscriber.on("message", async (channel, message) => {
            if (channel === REDIS_CHANNELS.TEXT_OUTPUT) {
                await this.handleTranscriptMessage(message);
            }
        });
    },

    /**
     * Handle incoming transcript from ASR service
     */
    async handleTranscriptMessage(rawMessage: string): Promise<void> {
        const message = safeJsonParse<TranscriptMessage>(rawMessage);

        if (!message) {
            logger.warn("Invalid transcript message received");
            return;
        }

        logger.debug(
            { meetingId: message.meetingId, textLength: message.text.length },
            "Received transcript from ASR"
        );

        // Save to database
        await transcriptService.create({
            meetingId: message.meetingId,
            text: message.text,
            speakerName: message.speakerName,
            confidence: message.confidence,
            timestamp: new Date(message.timestamp),
        });
    },

    /**
     * Stop subscriber
     */
    async stop(): Promise<void> {
        if (subscriber) {
            await subscriber.unsubscribe();
            await subscriber.quit();
            subscriber = null;
            logger.info("Redis subscriber stopped");
        }
    },
};