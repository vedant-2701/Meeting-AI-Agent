import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { healthRoutes } from "./routes/health.route.js";
import { wsRoutes } from "./routes/ws.route.js";
import { apiRoutes } from "./routes/api.route.js";
import { redisService } from "./services/redis.service.js";

export async function buildServer() {
    const fastify = Fastify({
        logger: false, // We use our own pino logger
    });

    // Register CORS
    await fastify.register(cors, {
        origin: true, // Allow all origins in dev; restrict in production
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true,
    });

    // Register WebSocket support
    await fastify.register(websocket, {
        options: {
            maxPayload: 1048576, // 1MB max payload for audio chunks
        },
    });

    // Register routes
    await fastify.register(healthRoutes);
    await fastify.register(wsRoutes);
    await fastify.register(apiRoutes);

    // Global error handler
    fastify.setErrorHandler((error: any, _request, reply) => {
        logger.error({ err: error }, "Unhandled error");
        reply.status(error.statusCode || 500).send({
            error: error.name || "Internal Server Error",
            message: error.message,
        });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        logger.info({ signal }, "Shutdown signal received");

        await redisService.disconnect();
        await fastify.close();

        logger.info("Server shut down gracefully");
        process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    return fastify;
}
