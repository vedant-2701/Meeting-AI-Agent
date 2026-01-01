import type { FastifyRequest, FastifyReply } from "fastify";
import { logger } from "./logger.js";
import { AppError } from "./errors.js";

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
): Promise<T | undefined> {
    try {
        return await operation();
    } catch (err) {
        logger.error({ err, context }, `Error in ${context}`);
        return fallback;
    }
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T = unknown>(text: string): T | null {
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}

/**
 * Redis operation wrapper
 */
export async function safeRedisOp<T>(
    operation: () => Promise<T>,
    operationName: string
): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
        const data = await operation();
        return { success: true, data };
    } catch (err) {
        logger.error({ err }, `Redis ${operationName} failed`);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
        };
    }
}

/**
 * Controller wrapper - handles errors automatically
 * Removes the need for try-catch in every controller method
 */
type ControllerHandler = (
    request: FastifyRequest,
    reply: FastifyReply
) => Promise<any>;

export function withErrorHandling(
    handler: ControllerHandler
): ControllerHandler {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            return await handler(request, reply);
        } catch (err: AppError | unknown) {
            // Handle our custom AppErrors
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({
                    error: err.name,
                    message: err.message,
                });
            }

            // Let Fastify's global error handler deal with unexpected errors
            throw err;
        }
    };
}
