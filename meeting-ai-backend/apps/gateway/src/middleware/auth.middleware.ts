import type { FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../utils/logger.js";

interface AuthError {
    error: string;
    message: string;
}

/**
 * Send auth error response
 */
function sendAuthError(reply: FastifyReply, message: string): void {
    reply.status(401).send({ error: "Unauthorized", message } as AuthError);
}

/**
 * JWT Authentication middleware
 */
export async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
        return sendAuthError(reply, "Missing authorization header");
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return sendAuthError(
            reply,
            "Invalid authorization format. Use: Bearer <token>"
        );
    }

    // TODO: Verify JWT token properly
    // For now, just check if token exists
    (request as any).user = {
        id: "user-123",
        email: "user@example.com",
    };

    logger.debug({ userId: "user-123" }, "User authenticated");
}

/**
 * Optional auth - doesn't fail if no token
 */
export async function optionalAuthMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply
): Promise<void> {
    const authHeader = request.headers.authorization;

    if (authHeader) {
        const [scheme, token] = authHeader.split(" ");
        if (scheme === "Bearer" && token) {
            (request as any).user = {
                id: "user-123",
                email: "user@example.com",
            };
        }
    }
}
