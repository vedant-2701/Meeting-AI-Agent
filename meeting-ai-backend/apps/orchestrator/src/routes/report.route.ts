import type { FastifyInstance } from "fastify";
import { reportController } from "../controller/report.controller.js";

export async function reportRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get("/meetings/:meetingId/report", reportController.getByMeetingId);
    fastify.post(
        "/meetings/:meetingId/report/generate",
        reportController.generate
    );
}
