import uvicorn

"""
This is the main entry point to run the application.
It tells uvicorn to look for the 'app' variable inside the 'app.main' file.
"""

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True  # reload=True is great for development
    )