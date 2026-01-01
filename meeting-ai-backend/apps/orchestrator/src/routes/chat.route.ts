import type { FastifyInstance } from "fastify";
import { chatController } from "../controller/chat.controller.js";
import { chatSchema } from "../schemas/index.js";

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post("/chat", { schema: chatSchema }, chatController.chat);
}
