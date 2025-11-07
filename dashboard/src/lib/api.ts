import axios from "axios";
import { MeetingReport } from "./types";

// The URL of our Python Agent's API
const API_URL = "http://localhost:8000/api/reports";

export async function fetchReports(): Promise<MeetingReport[]> {
    try {
        // Using axios.get() to fetch data
        const response = await axios.get(API_URL, {
            // We set headers to prevent caching
            headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
                Expires: "0",
            },
        });

        if (response.status !== 200) {
            throw new Error(
                `API request failed with status ${response.status}`
            );
        }

        const data: MeetingReport[] = response.data;
        return data.reverse(); // Show newest reports first
    } catch (err) {
        console.error("Failed to fetch reports:", err);
        return []; // Return an empty array on error
    }
}
