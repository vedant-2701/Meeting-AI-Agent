import type { FastifyInstance } from "fastify";
import { logger } from "../utils/logger.js";

export async function timingMiddleware(
    fastify: FastifyInstance
): Promise<void> {
    fastify.addHook("onRequest", async (request) => {
        (request as any).startTime = Date.now();
    });

    fastify.addHook("onResponse", async (request, reply) => {
        const duration =
            Date.now() - ((request as any).startTime || Date.now());

        // Log slow requests (> 1s)
        if (duration > 1000) {
            logger.warn(
                {
                    method: request.method,
                    url: request.url,
                    statusCode: reply.statusCode,
                    duration: `${duration}ms`,
                },
                "Slow request detected"
            );
        } else {
            logger.debug(
                {
                    method: request.method,
                    url: request.url,
                    statusCode: reply.statusCode,
                    duration: `${duration}ms`,
                },
                "Request completed"
            );
        }
    });
}
