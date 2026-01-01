import type { FastifyInstance } from "fastify";
import { meetingController } from "../controller/meeting.controller.js";
import {
    createMeetingSchema,
    updateMeetingSchema,
    addParticipantSchema,
} from "../schemas/index.js";

export async function meetingRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get("/meetings", meetingController.getAll);
    fastify.post(
        "/meetings",
        { schema: createMeetingSchema },
        meetingController.create
    );

    fastify.get("/meetings/:meetingId", meetingController.getById);

    fastify.put(
        "/meetings/:meetingId",
        { schema: updateMeetingSchema },
        meetingController.update
    );

    fastify.post("/meetings/:meetingId/end", meetingController.end);

    fastify.post(
        "/meetings/:meetingId/participants",
        { schema: addParticipantSchema },
        meetingController.addParticipant
    );
    
    fastify.delete(
        "/meetings/:meetingId/participants/:participantId",
        meetingController.removeParticipant
    );
}
