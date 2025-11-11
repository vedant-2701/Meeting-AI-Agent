from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import our new, separated router files
from app.api.v1.endpoints import reports, websocket

app = FastAPI(title="AI Agent Service")

# Add CORS middleware to allow our frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to your frontend's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers from our endpoints files
app.include_router(reports.router, prefix="/api", tags=["Mode 2: Autonomous Bot Reports"])
app.include_router(websocket.router, tags=["Mode 1: Live Co-Pilot (WebSocket)"])

@app.get("/")
def read_root():
    return {"status": "AI Agent Service is running!"}