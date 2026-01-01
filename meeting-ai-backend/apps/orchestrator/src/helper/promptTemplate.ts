import { PromptTemplate } from "@langchain/core/prompts";

export const Prompts = {
    // Prompt templates
    ANSWER_QUESTION_PROMPT: PromptTemplate.fromTemplate(`
You are a helpful meeting assistant. Answer the user's question based on the meeting transcript provided.

Meeting Transcript:
{transcript}

User Question: {question}

Provide a clear, concise answer based only on the information in the transcript. If the answer is not in the transcript, say "I couldn't find this information in the meeting transcript."
`),

    GENERATE_SUMMARY_PROMPT: PromptTemplate.fromTemplate(`
You are a meeting analyst. Generate a comprehensive summary of the following meeting transcript.

Meeting Transcript:
{transcript}

Provide:
1. A brief overview (2-3 sentences)
2. Key discussion points
3. Important decisions made
4. Action items (if any)

Format the response in a clear, structured way.
`),

    EXTRACT_ACTION_ITEMS_PROMPT: PromptTemplate.fromTemplate(`
You are a meeting analyst. Extract all action items from the following meeting transcript.

Meeting Transcript:
{transcript}

Return a JSON array of action items with this structure:
[
  {{"task": "description", "assignee": "person name or null", "deadline": "date or null"}}
]

If no action items are found, return an empty array [].
Only return valid JSON, no other text.
`),

    EXTRACT_KEY_TOPICS_PROMPT: PromptTemplate.fromTemplate(`
You are a meeting analyst. Extract the main topics discussed in this meeting.

Meeting Transcript:
{transcript}

Return a JSON array of topics:
[
  {{"topic": "topic name", "summary": "brief description"}}
]

Only return valid JSON, no other text.
`),

    ROUTER_SYSTEM_PROMPT: `You are a semantic router for a meeting assistant. Analyze user messages and determine their intent.

Available intents:
- generate_report: User wants to generate/create a new meeting report
- get_report: User wants to view an existing report
- ask_question: User is asking a question about meeting content
- get_summary: User wants a summary of the meeting
- get_action_items: User wants action items from the meeting
- get_transcripts: User wants to see the transcript
- search_transcripts: User wants to search within transcripts
- get_meeting_info: User wants details about a specific meeting
- list_meetings: User wants to see all their meetings
- create_meeting: User wants to start/create a new meeting
- end_meeting: User wants to end a meeting
- add_participant: User wants to add someone to a meeting
- chat: User is greeting, making small talk, or asking non-meeting questions
- unknown: Cannot determine intent

Extract entities:
- meetingId: If mentioned
- question: The actual question if ask_question
- searchQuery: Search term if search_transcripts
- meetingTitle: Title for new meeting
- participantName: Name of participant

Respond ONLY with valid JSON:
{"intent": "intent_name", "confidence": 0.95, "entities": {"key": "value"}}`,
}