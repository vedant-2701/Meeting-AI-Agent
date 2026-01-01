import type { FastifyRequest, FastifyReply } from "fastify";
import { meetingService } from "../services/meeting.service.js";
import {
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
} from "../utils/errors.js";

interface CreateMeetingBody {
    title: string;
    meetingUrl?: string;
    platform?: "GOOGLE_MEET" | "ZOOM" | "TEAMS" | "OTHER";
}

interface UpdateMeetingBody {
    title?: string;
    meetingUrl?: string;
    status?: "ACTIVE" | "ENDED" | "CANCELLED";
}

interface AddParticipantBody {
    name: string;
    email?: string;
    isHost?: boolean;
}

export const meetingController = {
    async create(request: FastifyRequest, reply: FastifyReply) {
        const body = request.body as CreateMeetingBody;
        const userId = request.headers["x-user-id"] as string;

        if (!userId) throw new UnauthorizedError("User ID required");
        if (!body.title) throw new BadRequestError("Title is required");

        const meeting = await meetingService.create({
            title: body.title,
            meetingUrl: body.meetingUrl,
            platform: body.platform,
            hostId: userId,
            userId,
        });
        return reply.status(201).send(meeting);
    },

    async getAll(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.headers["x-user-id"] as string;
        if (!userId) throw new UnauthorizedError("User ID required");

        const meetings = await meetingService.getByUserId(userId);
        return reply.send(meetings);
    },

    async getById(request: FastifyRequest, reply: FastifyReply) {
        const { meetingId } = request.params as { meetingId: string };
        const meeting = await meetingService.getById(meetingId);

        if (!meeting) throw new NotFoundError("Meeting");
        return reply.send(meeting);
    },

    async update(request: FastifyRequest, reply: FastifyReply) {
        const { meetingId } = request.params as { meetingId: string };
        const body = request.body as UpdateMeetingBody;

        if (!(await meetingService.exists(meetingId))) {
            throw new NotFoundError("Meeting");
        }

        const meeting = await meetingService.update(meetingId, body);
        return reply.send(meeting);
    },

    async end(request: FastifyRequest, reply: FastifyReply) {
        const { meetingId } = request.params as { meetingId: string };

        if (!(await meetingService.exists(meetingId))) {
            throw new NotFoundError("Meeting");
        }

        const meeting = await meetingService.endMeeting(meetingId);
        return reply.send(meeting);
    },

    async addParticipant(request: FastifyRequest, reply: FastifyReply) {
        const { meetingId } = request.params as { meetingId: string };
        const body = request.body as AddParticipantBody;

        if (!body.name) throw new BadRequestError("Participant name required");
        if (!(await meetingService.exists(meetingId))) {
            throw new NotFoundError("Meeting");
        }

        const participant = await meetingService.addParticipant(
            meetingId,
            body
        );
        return reply.status(201).send(participant);
    },

    async removeParticipant(request: FastifyRequest, reply: FastifyReply) {
        const { participantId } = request.params as { participantId: string };
        await meetingService.removeParticipant(participantId);
        return reply.status(204).send();
    },
};
