import type { FastifyInstance } from "fastify";
import { redisService } from "../services/redis.service.js";

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
    // Basic health check
    fastify.get("/health", async (_request, _reply) => {
        return {
            status: "ok",
            service: "gateway",
            timestamp: new Date().toISOString(),
        };
    });

    // Detailed health check with dependencies
    fastify.get("/health/detailed", async (_request, _reply) => {
        const redisHealthy = await redisService.ping();

        const status = redisHealthy ? "ok" : "degraded";

        return {
            status,
            service: "gateway",
            timestamp: new Date().toISOString(),
            dependencies: {
                redis: redisHealthy ? "connected" : "disconnected",
            },
        };
    });
}
