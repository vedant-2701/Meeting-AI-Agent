import type { FastifyRequest, FastifyReply } from "fastify";
import { questionService } from "../services/question.service.js";
import { meetingService } from "../services/meeting.service.js";
import {
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
} from "../utils/errors.js";

interface AskQuestionBody {
    question: string;
}

export const questionController = {
    async ask(request: FastifyRequest, reply: FastifyReply) {
        const { meetingId } = request.params as { meetingId: string };
        const { question } = request.body as AskQuestionBody;
        const userId = request.headers["x-user-id"] as string;

        if (!userId) throw new UnauthorizedError("User ID required");
        if (!question?.trim())
            throw new BadRequestError("Question is required");
        if (!(await meetingService.exists(meetingId))) {
            throw new NotFoundError("Meeting");
        }

        const result = await questionService.ask(meetingId, userId, question);
        return reply.send(result);
    },

    async getByMeetingId(request: FastifyRequest, reply: FastifyReply) {
        const { meetingId } = request.params as { meetingId: string };

        if (!(await meetingService.exists(meetingId))) {
            throw new NotFoundError("Meeting");
        }

        const questions = await questionService.getByMeetingId(meetingId);
        return reply.send(questions);
    },

    async getByUserId(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.headers["x-user-id"] as string;
        if (!userId) throw new UnauthorizedError("User ID required");

        const questions = await questionService.getByUserId(userId);
        return reply.send(questions);
    },
};
