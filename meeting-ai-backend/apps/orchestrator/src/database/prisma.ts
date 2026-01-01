import { PrismaClient, Prisma } from "../generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Create the Prisma Adapter
const adapter = new PrismaMariaDb({
    host: config.database.db_host,
    port: config.database.db_port,
    user: config.database.db_user,
    password: decodeURIComponent(config.database.db_password),
    database: config.database.db_name,
});


export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: [
            { emit: "event", level: "query" },
            { emit: "event", level: "error" },
            { emit: "event", level: "warn" },
            { emit: "stdout", level: "info" },
        ],
    });


if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

// Log queries in development
prisma.$on("query" as never, (e: Prisma.QueryEvent) => {
    logger.debug({ 
        query: e.query, 
        params: e.params, 
        duration: `${e.duration}ms` 
    }, "Prisma Query");
});

prisma.$on("error" as never, (e: Prisma.LogEvent) => {
    logger.error({ error: e.message, target: e.target }, "Prisma Error");
});

prisma.$on("warn" as never, (e: Prisma.LogEvent) => {
    logger.warn({ message: e.message }, "Prisma Warning");
});

export async function connectDatabase(): Promise<void> {
    try {
        await prisma.$connect();
        logger.info("Database connected");
    } catch (err) {
        logger.error({ err }, "Failed to connect to database");
        // It's often better to exit the process if the DB is down at startup
        // process.exit(1);
        throw err;
    }
}

export async function disconnectDatabase(): Promise<void> {
    await prisma.$disconnect();
    logger.info("Database disconnected");
}