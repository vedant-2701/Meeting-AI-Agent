import {
    HumanMessage,
    SystemMessage,
    AIMessage,
} from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Prompts } from "../helper/promptTemplate.js";
import { logger } from "../utils/logger.js";
import { generationModel } from "./llm-client.js";
import { SENTIMENT } from "../constants/index.js";

const outputParser = new StringOutputParser();

// Helper to clean JSON strings from Markdown (Gemini frequently adds these)
const cleanJsonString = (text: string): string => {
    // Remove ```json and ``` wrapping
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "");
    return cleaned.trim();
};

// Helper to safely parse JSON array
const parseJsonArray = <T>(text: string): T[] => {
    const cleaned = cleanJsonString(text);
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch {
            return [];
        }
    }
    return [];
};

export const llmService = {
    /**
     * Answer a question about the meeting
     */
    async answerQuestion(
        transcript: string,
        question: string
    ): Promise<string> {
        try {
            const prompt = await Prompts.ANSWER_QUESTION_PROMPT.format({
                transcript,
                question,
            });

            const response = await generationModel.invoke([new HumanMessage(prompt)]);
            return outputParser.invoke(response);
        } catch (err) {
            logger.error({ err }, "Error answering question with LLM");
            throw new Error("Failed to generate answer");
        }
    },

    /**
     * Generate meeting summary
     */
    async generateSummary(transcript: string): Promise<string> {
        try {
            const prompt = await Prompts.GENERATE_SUMMARY_PROMPT.format({
                transcript,
            });
            const response = await generationModel.invoke([new HumanMessage(prompt)]);
            return outputParser.invoke(response);
        } catch (err) {
            logger.error({ err }, "Error generating summary with LLM");
            throw new Error("Failed to generate summary");
        }
    },

    /**
     * Extract action items from transcript
     */
    async extractActionItems(transcript: string): Promise<
        Array<{
            task: string;
            assignee: string | null;
            deadline: string | null;
        }>
    > {
        try {
            const prompt = await Prompts.EXTRACT_ACTION_ITEMS_PROMPT.format({
                transcript,
            });
            const response = await generationModel.invoke([new HumanMessage(prompt)]);
            const text = await outputParser.invoke(response);

            // Parse JSON from response
            return parseJsonArray<{
                task: string;
                assignee: string | null;
                deadline: string | null;
            }>(text);
        } catch (err) {
            logger.error({ err }, "Error extracting action items with LLM");
            return [];
        }
    },

    /**
     * Extract key topics from transcript
     */
    async extractKeyTopics(transcript: string): Promise<
        Array<{
            topic: string;
            summary: string;
        }>
    > {
        try {
            const prompt = await Prompts.EXTRACT_KEY_TOPICS_PROMPT.format({
                transcript,
            });
            const response = await generationModel.invoke([new HumanMessage(prompt)]);
            const text = await outputParser.invoke(response);

            // Parse JSON from response
            return parseJsonArray<{
                topic: string;
                summary: string;
            }>(text);
        } catch (err) {
            logger.error({ err }, "Error extracting key topics with LLM");
            return [];
        }
    },

    /**
     * Analyze sentiment of meeting
     */
    async analyzeSentiment(transcript: string): Promise<string> {
        try {
            const messages = [
                new SystemMessage(
                    "You are a sentiment analyst. Analyze the overall sentiment of meetings. Respond with only one word: positive, negative, neutral, or mixed."
                ),
                new HumanMessage(
                    `Analyze the sentiment of this meeting:\n\n${transcript}`
                ),
            ];

            const response = await generationModel.invoke(messages);
            const sentiment = (await outputParser.invoke(response))
                .toLowerCase()
                .trim();

            // Validate response
            const validSentiments = Object.values(SENTIMENT);
            return validSentiments.includes(sentiment as any) ? sentiment : SENTIMENT.NEUTRAL;
        } catch (err) {
            logger.error({ err }, "Error analyzing sentiment with LLM");
            return "neutral";
        }
    },

    /**
     * Chat with context (for RAG - will be used with Knowledge Service)
     */
    async chatWithContext(
        question: string,
        context: string,
        chatHistory: Array<{ role: "user" | "assistant"; content: string }> = []
    ): Promise<string> {
        try {
            const messages = [
                new SystemMessage(
                    `You are a helpful meeting assistant. Answer questions based on the provided context from meeting transcripts. If you don't know the answer, say so.

Context from meetings:
${context}`
                ),
                ...chatHistory.map((msg) =>
                    msg.role === "user"
                        ? new HumanMessage(msg.content)
                        : new AIMessage(msg.content)
                ),
                new HumanMessage(question),
            ];

            const response = await generationModel.invoke(messages);
            return outputParser.invoke(response);
        } catch (err) {
            logger.error({ err }, "Error in chat with context");
            throw new Error("Failed to generate response");
        }
    },
};
