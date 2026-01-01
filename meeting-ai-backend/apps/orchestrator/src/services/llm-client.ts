import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { config } from "../config/index.js";

// Singleton LLM instances
export const routerModel = new ChatGoogleGenerativeAI({
    apiKey: config.gemini.apiKey,
    model: config.gemini.model,
    temperature: config.llm.temperature.router,
    maxRetries: config.llm.maxRetries,
});

export const generationModel = new ChatGoogleGenerativeAI({
    apiKey: config.gemini.apiKey,
    model: config.gemini.model,
    temperature: config.llm.temperature.generation,
    maxRetries: config.llm.maxRetries,
});