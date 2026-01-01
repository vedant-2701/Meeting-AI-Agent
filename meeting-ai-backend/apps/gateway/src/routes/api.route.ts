import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import axios, { AxiosError } from "axios";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

// Axios instance for orchestrator
const orchestratorClient = axios.create({
    baseURL: config.orchestrator.url,
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
});

// Request interceptor
orchestratorClient.interceptors.request.use((req) => {
    logger.debug(
        { method: req.method, url: req.url },
        "Proxying to orchestrator"
    );
    return req;
});

// Response interceptor
orchestratorClient.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => {
        logger.error(
            {
                status: error.response?.status,
                url: error.config?.url,
                message: error.message,
            },
            "Orchestrator request failed"
        );
        return Promise.reject(error);
    }
);

/**
 * Handle proxy errors consistently
 */
function handleProxyError(err: unknown, reply: FastifyReply): void {
    if (err instanceof AxiosError) {
        if (err.response) {
            reply.status(err.response.status).send(err.response.data);
        } else if (err.code === "ECONNREFUSED") {
            reply.status(503).send({
                error: "Service Unavailable",
                message: "Orchestrator service is not available",
            });
        } else {
            reply.status(502).send({
                error: "Bad Gateway",
                message: "Failed to reach orchestrator service",
            });
        }
    } else {
        reply.status(500).send({
            error: "Internal Server Error",
            message: "Unexpected error occurred",
        });
    }
}

/**
 * Proxy request to orchestrator
 */
async function proxyToOrchestrator(
    request: FastifyRequest,
    reply: FastifyReply,
    path: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET"
): Promise<void> {
    const user = (request as any).user;
    const headers: Record<string, string> = {};

    console.log(user);

    if (user) {
        headers["X-User-Id"] = user.id;
        headers["X-User-Email"] = user.email;
    }

    try {
        const response = await orchestratorClient.request({
            method,
            url: path,
            headers,
            data: ["POST", "PUT", "PATCH"].includes(method)
                ? request.body
                : undefined,
            params: request.query,
        });

        reply.status(response.status).send(response.data);
    } catch (err) {
        handleProxyError(err, reply);
    }
}

export async function apiRoutes(fastify: FastifyInstance): Promise<void> {
    // Apply auth middleware
    fastify.addHook("onRequest", authMiddleware);

    /* Meeting Routes */
    fastify.get("/api/meetings", (req, reply) =>
        proxyToOrchestrator(req, reply, "/meetings", "GET")
    );

    fastify.get("/api/meetings/:meetingId", (req, reply) => {
        const { meetingId } = req.params as { meetingId: string };
        return proxyToOrchestrator(req, reply, `/meetings/${meetingId}`, "GET");
    });

    fastify.post("/api/meetings", (req, reply) =>
        proxyToOrchestrator(req, reply, "/meetings", "POST")
    );

    fastify.put("/api/meetings/:meetingId", (req, reply) => {
        const { meetingId } = req.params as { meetingId: string };
        return proxyToOrchestrator(req, reply, `/meetings/${meetingId}`, "PUT");
    });

    /* Transcript Routes */
    fastify.get("/api/meetings/:meetingId/transcripts", (req, reply) => {
        const { meetingId } = req.params as { meetingId: string };
        return proxyToOrchestrator(
            req,
            reply,
            `/meetings/${meetingId}/transcripts`,
            "GET"
        );
    });

    /* Question Routes */
    fastify.post("/api/meetings/:meetingId/ask", (req, reply) => {
        const { meetingId } = req.params as { meetingId: string };
        return proxyToOrchestrator(
            req,
            reply,
            `/meetings/${meetingId}/ask`,
            "POST"
        );
    });

    /* Report Routes */
    fastify.get("/api/meetings/:meetingId/report", (req, reply) => {
        const { meetingId } = req.params as { meetingId: string };
        return proxyToOrchestrator(
            req,
            reply,
            `/meetings/${meetingId}/report`,
            "GET"
        );
    });

    fastify.post("/api/meetings/:meetingId/report/generate", (req, reply) => {
        const { meetingId } = req.params as { meetingId: string };
        return proxyToOrchestrator(
            req,
            reply,
            `/meetings/${meetingId}/report/generate`,
            "POST"
        );
    });

    /* Chat Route (Semantic Router) */
    fastify.post("/api/chat", (req, reply) =>
        proxyToOrchestrator(req, reply, "/chat", "POST")
    );
}
