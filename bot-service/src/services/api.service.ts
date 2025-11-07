import axios from "axios";
import { MeetingReport } from "../types/meeting-report.types";
import { AGENT_API_URL } from "../config";

/**
 * Sends the final meeting report to the Python Agent API.
 */
export async function sendReportToAgent(report: MeetingReport): Promise<void> {
    console.log(`Sending report to Agent at ${AGENT_API_URL}...`);
    try {
        const response = await axios.post(AGENT_API_URL, report);
        console.log("Agent responded:", response.data);
    } catch (e: any) {
        console.error(`Error sending report to agent: ${e.message}`);
        console.error("Is the Python agent running in the other terminal?");
    }
}
