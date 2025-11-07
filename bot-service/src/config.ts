import * as path from 'path';

// *** EDIT THIS URL: Paste your Google Meet link here ***
export const MEET_URL = 'https://meet.google.com/zjn-kjyg-hwd';

// This is the profile folder we created with the auth.ts script
export const USER_DATA_DIR = path.join(__dirname, '../user-data');

// This is the URL of our LOCAL Python "Agent" server
export const AGENT_API_URL = 'http://localhost:8000/api/report';