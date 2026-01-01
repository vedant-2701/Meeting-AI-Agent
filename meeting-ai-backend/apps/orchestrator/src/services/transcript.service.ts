import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";

interface CreateTranscriptInput {
    meetingId: string;
    text: string;
    speakerName?: string | undefined;
    timestamp?: Date | undefined;
    confidence?: number | undefined;
}

export const transcriptService = {
    /**
     * Create a new transcript entry
     */
    async create(data: CreateTranscriptInput) {
        try {
            const transcript = await prisma.transcript.create({
                data: {
                    meetingId: data.meetingId,
                    text: data.text,
                    speakerName: data.speakerName ?? null,
                    timestamp: data.timestamp || new Date(),
                    confidence: data.confidence ?? 0,
                },
            });

            logger.debug(
                { meetingId: data.meetingId, transcriptId: transcript.id },
                "Transcript entry created"
            );

            return transcript;
        } catch (err) {
            logger.error({ err, meetingId: data.meetingId }, "Error creating transcript");
            throw err;
        }
    },

    /**
     * Get all transcripts for a meeting
     */
    async getByMeetingId(meetingId: string) {
        return prisma.transcript.findMany({
            where: { meetingId },
            orderBy: { timestamp: "asc" },
        });
    },

    /**
     * Get transcript as formatted text
     */
    async getFormattedTranscript(meetingId: string): Promise<string> {
        const transcripts = await this.getByMeetingId(meetingId);

        return transcripts
            .map((t) => {
                /* If your server (Docker container) is set to UTC, the times will appear in UTC (e.g., 14:30:00), even if the user is in India (20:00:00) */
                const time = t.timestamp.toLocaleTimeString();
                const speaker = t.speakerName || "Unknown";
                return `[${time}] ${speaker}: ${t.text}`;
            })
            .join("\n");
    },

    /**
     * Search transcripts
     */
    async search(meetingId: string, query: string) {
        return prisma.transcript.findMany({
            where: {
                meetingId,
                text: {
                    contains: query,
                },
            },
            orderBy: { timestamp: "asc" },
        });
    },

    /**
     * Get transcript count for a meeting
     */
    async getCount(meetingId: string): Promise<number> {
        return prisma.transcript.count({ where: { meetingId } });
    },

    /**
     * Delete all transcripts for a meeting
     */
    async deleteByMeetingId(meetingId: string): Promise<void> {
        await prisma.transcript.deleteMany({ where: { meetingId } });
        logger.info({ meetingId }, "Transcripts deleted");
    },
};