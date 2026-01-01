import type { FastifyRequest, FastifyReply } from "fastify";
import { reportService } from "../services/report.service.js";
import { meetingService } from "../services/meeting.service.js";
import { NotFoundError } from "../utils/errors.js";

export const reportController = {
    async generate(request: FastifyRequest, reply: FastifyReply) {
        const { meetingId } = request.params as { meetingId: string };

        if (!(await meetingService.exists(meetingId))) {
            throw new NotFoundError("Meeting");
        }

        const report = await reportService.generate(meetingId);
        return reply.send(report);
    },

    async getByMeetingId(request: FastifyRequest, reply: FastifyReply) {
        const { meetingId } = request.params as { meetingId: string };

        if (!(await meetingService.exists(meetingId))) {
            throw new NotFoundError("Meeting");
        }

        const report = await reportService.getByMeetingId(meetingId);
        if (!report) {
            throw new NotFoundError("Report");
        }

        return reply.send(report);
    },
};
