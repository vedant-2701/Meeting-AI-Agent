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
    const userId = request.headers["x-user-id"] as string | undefined;

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
    // 1. Verify Token (Mock logic for now)
    // In production: const decoded = jwt.verify(token, secret);
    const decodedUser = {
        id: userId || "user-123", // ⚠️ EXTRACT THIS FROM TOKEN, DO NOT READ request.headers["x-user-id"]
        email: "user@example.com"
    };

    // 2. Attach User to Request Object
    // This makes 'request.user' available to your Gateway Controllers
    (request as any).user = decodedUser;

    logger.debug({ userId: userId || "user-123" }, "User authenticated");
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
        // if (scheme === "Bearer" && token) {
        //     (request as any).user = {
        //         id: "user-123",
        //         email: "user@example.com",
        //     };
        // }
    }
}
