import pino from "pino";
import { config } from "../config/index.js";

export const logger = pino(
    config.nodeEnv === "development"
        ? {
              level: "debug",
              transport: { target: "pino-pretty", options: { colorize: true } },
          }
        : {
              level: "info",
          }
);
