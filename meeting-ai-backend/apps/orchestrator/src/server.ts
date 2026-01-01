import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { connectDatabase, disconnectDatabase } from "./database/prisma.js";
import { redisSubscriberService } from "./services/redis-subscriber.service.js";
import { AppError } from "./utils/errors.js";

// Routes
import { healthRoutes } from "./routes/health.route.js";
import { meetingRoutes } from "./routes/meeting.route.js";
import { transcriptRoutes } from "./routes/transcript.route.js";
import { questionRoutes } from "./routes/question.route.js";
import { reportRoutes } from "./routes/report.route.js";
import { chatRoutes } from "./routes/chat.route.js";

import { timingMiddleware } from "./middleware/timing.middleware.js";

export async function buildServer() {
    const fastify = Fastify({ logger: false });

    // CORS
    await fastify.register(cors, {
        origin: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    });

    // Middleware
    await timingMiddleware(fastify);

    // Routes
    await fastify.register(healthRoutes);
    await fastify.register(meetingRoutes);
    await fastify.register(transcriptRoutes);
    await fastify.register(questionRoutes);
    await fastify.register(reportRoutes);
    await fastify.register(chatRoutes);

    // Enhanced Error handler
    fastify.setErrorHandler((error: any, _request, reply) => {
        // Handle our custom AppErrors (operational errors)
        if (error instanceof AppError) {
            logger.warn(
                { err: error, statusCode: error.statusCode },
                "Operational error"
            );
            return reply.status(error.statusCode).send({
                error: error.name,
                message: error.message,
            });
        }

        // Handle Fastify validation errors
        if (error.validation) {
            return reply.status(400).send({
                error: "Validation Error",
                message: error.message,
            });
        }

        // Unexpected errors (programming bugs) - log as error
        logger.error({ err: error }, "Unexpected error");
        return reply.status(500).send({
            error: "Internal Server Error",
            message:
                config.nodeEnv === "development"
                    ? error.message
                    : "Something went wrong",
        });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        logger.info({ signal }, "Shutdown signal received");
        await redisSubscriberService.stop();
        await disconnectDatabase();
        await fastify.close();
        logger.info("Orchestrator shut down gracefully");
        process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    return fastify;
}
