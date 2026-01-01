import type { FastifyRequest, FastifyReply } from "fastify";
import { agentService } from "../services/agent.service.js";
import { BadRequestError, UnauthorizedError } from "../utils/errors.js";

interface ChatBody {
    message: string;
    meetingId?: string;
}

export const chatController = {
    async chat(request: FastifyRequest, reply: FastifyReply) {
        const { message, meetingId } = request.body as ChatBody;
        const userId = request.headers["x-user-id"] as string;

        if (!userId) throw new UnauthorizedError("User ID required");
        if (!message?.trim()) throw new BadRequestError("Message is required");

        const response = await agentService.chat({
            message: message.trim(),
            meetingId,
            userId,
        });
        return reply.send(response);
    },
};
