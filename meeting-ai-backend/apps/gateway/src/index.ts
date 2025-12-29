import { buildServer } from "./server.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";

async function main() {
    try {
        const server = await buildServer();

        await server.listen({
            port: config.port,
            host: config.host,
        });

        logger.info(
            `🚀 Gateway service running at http://${config.host}:${config.port}`
        );
        logger.info(
            `📡 WebSocket endpoint: ws://${config.host}:${config.port}/stream`
        );
        logger.info(`🔗 API proxy: http://${config.host}:${config.port}/api/*`);
    } catch (err) {
        logger.fatal({ err }, "Failed to start server");
        process.exit(1);
    }
}

main();
