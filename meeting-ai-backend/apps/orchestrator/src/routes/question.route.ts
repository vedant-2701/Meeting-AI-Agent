import type { FastifyInstance } from "fastify";
import { questionController } from "../controller/question.controller.js";

export async function questionRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post("/meetings/:meetingId/ask", questionController.ask);
    fastify.get(
        "/meetings/:meetingId/questions",
        questionController.getByMeetingId
    );
    fastify.get(
        "/questions",
        questionController.getByUserId
    );
}
