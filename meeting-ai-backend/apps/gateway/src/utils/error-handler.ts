import { logger } from "./logger.js";

type AsyncFunction<T = void> = (...args: any[]) => Promise<T>;

/**
 * Wraps an async function with error handling
 */
export function withErrorHandler<T>(
    fn: AsyncFunction<T>,
    context: string,
    options?: {
        fallback?: T;
        rethrow?: boolean;
    }
): AsyncFunction<T | undefined> {
    return async (...args: any[]): Promise<T | undefined> => {
        try {
            return await fn(...args);
        } catch (err) {
            logger.error({ err, context }, `Error in ${context}`);

            if (options?.rethrow) {
                throw err;
            }

            return options?.fallback;
        }
    };
}

/**
 * WebSocket message handler wrapper
 */
export function wsMessageHandler(
    handler: (data: Buffer, isBinary: boolean) => Promise<void>,
    socket: { send: (msg: string) => void },
    context: { meetingId: string }
): (data: Buffer, isBinary: boolean) => Promise<void> {
    return async (data: Buffer, isBinary: boolean) => {
        try {
            await handler(data, isBinary);
        } catch (err) {
            logger.error(
                { err, ...context },
                "Error processing WebSocket message"
            );
            socket.send(
                JSON.stringify({
                    type: "error",
                    message: "Failed to process message",
                })
            );
        }
    };
}

/**
 * Safe JSON parse - returns null if invalid
 */
export function safeJsonParse<T = unknown>(text: string): T | null {
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}

/**
 * Check if data looks like a JSON control message
 */
export function isJsonControlMessage(data: Buffer | string): boolean {
    const text = Buffer.isBuffer(data) ? data.toString("utf-8") : data;
    const trimmed = text.trim();

    if (!trimmed.startsWith("{")) return false;

    const parsed = safeJsonParse<{ type?: string }>(trimmed);
    return parsed !== null && typeof parsed.type === "string";
}

/**
 * Safe async operation wrapper - for services
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
