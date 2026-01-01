import type { FastifyInstance } from "fastify";
import { transcriptController } from "../controller/transcript.controller.js";

export async function transcriptRoutes(
    fastify: FastifyInstance
): Promise<void> {
    fastify.get(
        "/meetings/:meetingId/transcripts",
        transcriptController.getByMeetingId
    );
    fastify.get(
        "/meetings/:meetingId/transcripts/formatted",
        transcriptController.getFormatted
    );
    fastify.get(
        "/meetings/:meetingId/transcripts/search",
        transcriptController.search
    );
}
