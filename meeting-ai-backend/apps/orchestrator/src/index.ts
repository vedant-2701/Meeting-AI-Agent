import { buildServer } from "./server.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { connectDatabase } from "./database/prisma.js";
import { redisSubscriberService } from "./services/redis-subscriber.service.js";

async function main() {
    try {
        // Connect database
        await connectDatabase();

        // Start Redis subscriber
        await redisSubscriberService.start();

        // Build and start server
        const server = await buildServer();
        await server.listen({ port: config.port, host: config.host });

        logger.info(
            `🚀 Orchestrator running at http://${config.host}:${config.port}`
        );
    } catch (err) {
        logger.fatal({ err }, "Failed to start orchestrator");
        process.exit(1);
    }
}

main();
