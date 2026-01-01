import type { FastifyRequest, FastifyReply } from "fastify";
import { transcriptService } from "../services/transcript.service.js";
import { meetingService } from "../services/meeting.service.js";
import { NotFoundError, BadRequestError } from "../utils/errors.js";

export const transcriptController = {
    async getByMeetingId(request: FastifyRequest, reply: FastifyReply) {
        const { meetingId } = request.params as { meetingId: string };

        if (!(await meetingService.exists(meetingId))) {
            throw new NotFoundError("Meeting");
        }

        const transcripts = await transcriptService.getByMeetingId(meetingId);
        return reply.send(transcripts);
    },

    async getFormatted(request: FastifyRequest, reply: FastifyReply) {
        const { meetingId } = request.params as { meetingId: string };

        if (!(await meetingService.exists(meetingId))) {
            throw new NotFoundError("Meeting");
        }

        const transcript = await transcriptService.getFormattedTranscript(
            meetingId
        );
        return reply.send({ meetingId, transcript });
    },

    async search(request: FastifyRequest, reply: FastifyReply) {
        const { meetingId } = request.params as { meetingId: string };
        const { q } = request.query as { q?: string };

        if (!q) throw new BadRequestError("Search query 'q' is required");
        if (!(await meetingService.exists(meetingId))) {
            throw new NotFoundError("Meeting");
        }

        const results = await transcriptService.search(meetingId, q);
        return reply.send(results);
    },
};
