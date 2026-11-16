from fastapi import FastAPI

app = FastAPI(title="Networking AI Service")

@app.get("/health/live")
def health_live():
    return {"status": "ok", "service": "networking-ai"}
