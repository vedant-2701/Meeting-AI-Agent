import type { FastifyInstance } from "fastify";
import { prisma } from "../database/prisma.js";
import { config } from "../config/index.js";
import { Redis } from "ioredis";

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get("/health", async () => ({
        status: "ok",
        service: "orchestrator",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
    }));

    fastify.get("/health/detailed", async () => {
        const checks: Record<string, "connected" | "disconnected"> = {
            database: "disconnected",
            redis: "disconnected",
        };

        // Check database
        try {
            await prisma.$queryRaw`SELECT 1`;
            checks.database = "connected";
        } catch {}

        // Check Redis
        try {
            const redis = new Redis({
                host: config.redis.host,
                port: config.redis.port,
            });
            await redis.ping();
            await redis.quit();
            checks.redis = "connected";
        } catch {}

        const allHealthy = Object.values(checks).every(
            (s) => s === "connected"
        );

        return {
            status: allHealthy ? "ok" : "degraded",
            service: "orchestrator",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            dependencies: checks,
        };
    });

    // Kubernetes-style probes
    fastify.get("/health/live", async () => ({ status: "ok" }));

    fastify.get("/health/ready", async (_, reply) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return { status: "ok" };
        } catch {
            return reply.status(503).send({ status: "not ready" });
        }
    });
}