import { type FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

import { redisService } from "../services/redis.service.js";
import { logger } from "../utils/logger.js";
import { wsMessageHandler, isJsonControlMessage, safeJsonParse } from "../utils/error-handler.js";

interface ConnectionMeta {
    meetingId: string;
    userId: string;
    connectedAt: Date;
}

interface ControlMessage {
    type: string;
    [key: string]: unknown;
}

// Track active connections
const activeConnections = new Map<WebSocket, ConnectionMeta>();

export async function wsRoutes(fastify: FastifyInstance): Promise<void> {
    // WebSocket endpoint for audio streaming
    fastify.get("/stream", { websocket: true }, (socket, request) => {
        // Extract query params
        const meetingId = (request.query as Record<string, string>).meetingId;
        const userId = (request.query as Record<string, string>).userId || "anonymous";

        if (!meetingId) {
            logger.warn("WebSocket connection rejected: missing meetingId");
            socket.send(JSON.stringify({ error: "meetingId is required" }));
            socket.close(1008, "meetingId is required");
            return;
        }

        // Store connection metadata
        const meta: ConnectionMeta = { meetingId, userId, connectedAt: new Date() };
        activeConnections.set(socket, meta);

        logger.info({ meetingId, userId }, "WebSocket client connected");

        // Send connection confirmation
        socket.send(
            JSON.stringify({
                type: "connected",
                meetingId,
                message: "Audio stream connection established",
            })
        );

        // Define message handlers
        const handleControlMessage = (message: ControlMessage): void => {
            switch (message.type) {
                case "ping":
                    socket.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
                    break;

                case "stop":
                    logger.info({ meetingId }, "Client requested stream stop");
                    socket.send(JSON.stringify({ type: "stopped", meetingId }));
                    break;

                default:
                    logger.debug({ messageType: message.type }, "Unknown message type");
                    socket.send(
                        JSON.stringify({
                            type: "error",
                            message: `Unknown message type: ${message.type}`,
                        })
                    );
            }
        };

        const handleAudioData = async (data: Buffer): Promise<void> => {
            await redisService.publishAudioChunk(meetingId, data, {
                userId,
                timestamp: Date.now(),
            });
        };

        // Main message handler with automatic error handling
        const messageHandler = wsMessageHandler(
            async (data: Buffer, isBinary: boolean) => {
                // Binary data is always audio
                if (isBinary) {
                    await handleAudioData(data);
                    return;
                }

                // Text data - check if it's a valid control message
                if (isJsonControlMessage(data)) {
                    const message = safeJsonParse<ControlMessage>(data.toString("utf-8"));
                    if (message) {
                        handleControlMessage(message);
                        return;
                    }
                }

                // Not a control message - treat as audio data
                logger.debug({ meetingId }, "Non-JSON text received, treating as audio");
                await handleAudioData(data);
            },
            socket,
            { meetingId }
        );

        // Attach handlers
        socket.on("message", messageHandler);

        socket.on("close", (code, reason) => {
            activeConnections.delete(socket);
            logger.info(
                { meetingId, userId, code, reason: reason.toString() },
                "WebSocket client disconnected"
            );
        });

        socket.on("error", (err) => {
            logger.error({ err, meetingId }, "WebSocket error");
            activeConnections.delete(socket);
        });
    });

    // REST endpoint to get active connections count
    fastify.get("/stream/stats", async () => {
        const connections = Array.from(activeConnections.values());
        return {
            activeConnections: connections.length,
            meetings: [...new Set(connections.map((c) => c.meetingId))],
        };
    });
}