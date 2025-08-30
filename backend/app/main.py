from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import time
import uuid

app = FastAPI()

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

game_sessions: Dict[str, Dict] = {}

class GameSession(BaseModel):
    player_name: str

class CarPosition(BaseModel):
    x: float
    y: float
    rotation: float
    speed: float

class GameState(BaseModel):
    session_id: str
    car_position: CarPosition
    score: int
    distance_traveled: float
    time_elapsed: float

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/game/start")
async def start_game(session: GameSession):
    session_id = str(uuid.uuid4())
    game_sessions[session_id] = {
        "player_name": session.player_name,
        "start_time": time.time(),
        "car_position": {"x": 100, "y": 300, "rotation": 0, "speed": 0},
        "score": 0,
        "distance_traveled": 0,
        "checkpoints_passed": 0
    }
    return {"session_id": session_id, "message": "Game started successfully"}

@app.get("/api/game/{session_id}/state")
async def get_game_state(session_id: str):
    if session_id not in game_sessions:
        return {"error": "Game session not found"}
    
    session = game_sessions[session_id]
    current_time = time.time()
    time_elapsed = current_time - session["start_time"]
    
    return GameState(
        session_id=session_id,
        car_position=CarPosition(**session["car_position"]),
        score=session["score"],
        distance_traveled=session["distance_traveled"],
        time_elapsed=time_elapsed
    )

@app.post("/api/game/{session_id}/update")
async def update_game_state(session_id: str, car_position: CarPosition):
    if session_id not in game_sessions:
        return {"error": "Game session not found"}
    
    session = game_sessions[session_id]
    old_pos = session["car_position"]
    
    distance_delta = ((car_position.x - old_pos["x"]) ** 2 + (car_position.y - old_pos["y"]) ** 2) ** 0.5
    session["distance_traveled"] += distance_delta
    
    session["car_position"] = {
        "x": car_position.x,
        "y": car_position.y,
        "rotation": car_position.rotation,
        "speed": car_position.speed
    }
    
    session["score"] = int(session["distance_traveled"] * 10 + car_position.speed * 5)
    
    return {"success": True, "score": session["score"]}

@app.get("/api/game/leaderboard")
async def get_leaderboard():
    leaderboard = []
    for session_id, session in game_sessions.items():
        leaderboard.append({
            "player_name": session["player_name"],
            "score": session["score"],
            "distance_traveled": round(session["distance_traveled"], 2)
        })
    
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    return {"leaderboard": leaderboard[:10]}  # Top 10
