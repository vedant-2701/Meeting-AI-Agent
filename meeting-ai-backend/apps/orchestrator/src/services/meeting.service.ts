import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";
import type { MeetingPlatform, MeetingStatus } from "../generated/prisma/client.js";

interface CreateMeetingInput {
    title: string;
    meetingUrl?: string | undefined;
    platform?: MeetingPlatform | undefined;
    hostId: string;
    userId: string;
}

interface UpdateMeetingInput {
    title?: string;
    meetingUrl?: string;
    status?: MeetingStatus;
    endTime?: Date;
}

export const meetingService = {
    /**
     * Create a new meeting
     */
    async create(data: CreateMeetingInput) {
        try {
            const meeting = await prisma.meeting.create({
                data: {
                    title: data.title,
                    meetingUrl: data.meetingUrl ?? null,
                    platform: data.platform || "GOOGLE_MEET",
                    hostId: data.hostId,
                    userId: data.userId,
                },
                include: {
                    host: true,
                    participants: true,
                },
            });

            logger.info({ meetingId: meeting.id }, "Meeting created");
            return meeting;
        } catch (err) {
            logger.error({ err }, "Error creating meeting");
            throw err;
        }
    },

    /**
     * Get meeting by ID
     */
    async getById(id: string) {
        return prisma.meeting.findUnique({
            where: { id },
            include: {
                host: true,
                participants: true,
                transcripts: {
                    orderBy: { timestamp: "asc" },
                },
                report: true,
            },
        });
    },

    /**
     * Get all meetings for a user
     */
    async getByUserId(userId: string) {
        return prisma.meeting.findMany({
            where: { userId },
            include: {
                host: true,
                participants: true,
                _count: {
                    select: { transcripts: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    },

    /**
     * Update meeting
     */
    async update(id: string, data: UpdateMeetingInput) {
        try {
            const meeting = await prisma.meeting.update({
                where: { id },
                data,
                include: {
                    host: true,
                    participants: true,
                },
            });

            logger.info({ meetingId: id }, "Meeting updated");
            return meeting;
        } catch (err) {
            logger.error({ err, meetingId: id }, "Error updating meeting");
            throw err;
        }
    },

    /**
     * End a meeting
     */
    async endMeeting(id: string) {
        return this.update(id, {
            status: "ENDED",
            endTime: new Date(),
        });
    },

    /**
     * Add participant to meeting
     */
    async addParticipant(meetingId: string, participant: {
        name: string;
        email?: string;
        isHost?: boolean;
    }) {
        try {
            const newParticipant = await prisma.participant.create({
                data: {
                    meetingId,
                    name: participant.name,
                    email: participant.email ?? null,
                    isHost: participant.isHost || false,
                },
            });

            logger.debug({ meetingId, participantId: newParticipant.id }, "Participant added");
            return newParticipant;
        } catch (err) {
            logger.error({ err, meetingId }, "Error adding participant");
            throw err;
        }
    },

    /**
     * Remove participant from meeting
     */
    async removeParticipant(participantId: string) {
        try {
            await prisma.participant.update({
                where: { id: participantId },
                data: { leftAt: new Date() },
            });

            logger.debug({ participantId }, "Participant left");
        } catch (err) {
            logger.error({ err, participantId }, "Error removing participant");
            throw err;
        }
    },

    /**
     * Get full transcript text for a meeting
     */
    async getFullTranscript(meetingId: string): Promise<string> {
        const transcripts = await prisma.transcript.findMany({
            where: { meetingId },
            orderBy: { timestamp: "asc" },
        });

        return transcripts
            .map((t) => (t.speakerName ? `${t.speakerName}: ${t.text}` : t.text))
            .join("\n");
    },

    /**
     * Check if meeting exists
     */
    async exists(id: string): Promise<boolean> {
        const count = await prisma.meeting.count({ where: { id } });
        return count > 0;
    },
};