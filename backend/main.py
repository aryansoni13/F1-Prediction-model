from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import pandas as pd
import requests
import json
import asyncio
from datetime import datetime, timedelta
import time
import os
from functools import lru_cache
import fastf1
import xgboost as xgb

app = FastAPI(title="F1 Prediction API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove disconnected clients
                self.active_connections.remove(connection)

manager = ConnectionManager()

# Data models
class QualifyingEntry(BaseModel):
    driver: str
    team: str
    time: str
    position: int

class RaceConfig(BaseModel):
    raceNumber: int
    raceName: str
    location: str
    latitude: float
    longitude: float
    raceDateTime: str
    apiKey: Optional[str] = None

class TeamPoints(BaseModel):
    points: Dict[str, int]

class PredictionRequest(BaseModel):
    raceConfig: RaceConfig
    qualifyingTimes: List[QualifyingEntry]
    teamPoints: Dict[str, int]

class PredictionResult(BaseModel):
    driver: str
    team: str
    qualifyingPos: int
    predictedPos: int
    confidence: float
    winProbability: float

# Real-time 2025 F1 Calendar
race_schedule = [
    {"round": 1, "name": "Bahrain Grand Prix", "location": "Sakhir", "date": "2025-03-02", "lat": 26.0325, "lon": 50.5106, "status": "finished"},
    {"round": 2, "name": "Saudi Arabian Grand Prix", "location": "Jeddah", "date": "2025-03-09", "lat": 21.4858, "lon": 39.1925, "status": "finished"},
    {"round": 3, "name": "Australian Grand Prix", "location": "Melbourne", "date": "2025-03-16", "lat": -37.8497, "lon": 144.9680, "status": "finished"},
    {"round": 4, "name": "Japanese Grand Prix", "location": "Suzuka", "date": "2025-04-06", "lat": 34.8431, "lon": 136.5414, "status": "finished"},
    {"round": 5, "name": "Chinese Grand Prix", "location": "Shanghai", "date": "2025-04-20", "lat": 31.3389, "lon": 121.2196, "status": "finished"},
    {"round": 6, "name": "Miami Grand Prix", "location": "Miami", "date": "2025-05-04", "lat": 25.9581, "lon": -80.2389, "status": "finished"},
    {"round": 7, "name": "Emilia Romagna Grand Prix", "location": "Imola", "date": "2025-05-18", "lat": 44.3439, "lon": 11.7167, "status": "finished"},
    {"round": 8, "name": "Monaco Grand Prix", "location": "Monte Carlo", "date": "2025-05-25", "lat": 43.7347, "lon": 7.4206, "status": "finished"},
    {"round": 9, "name": "Canadian Grand Prix", "location": "Montreal", "date": "2025-06-15", "lat": 45.5048, "lon": -73.5522, "status": "upcoming"},
    {"round": 10, "name": "Spanish Grand Prix", "location": "Barcelona", "date": "2025-06-22", "lat": 41.5700, "lon": 2.2611, "status": "upcoming"},
    {"round": 11, "name": "Austrian Grand Prix", "location": "Spielberg", "date": "2025-06-29", "lat": 47.2197, "lon": 14.7647, "status": "upcoming"},
    {"round": 12, "name": "British Grand Prix", "location": "Silverstone", "date": "2025-07-06", "lat": 52.0786, "lon": -1.0169, "status": "upcoming"},
    {"round": 13, "name": "Hungarian Grand Prix", "location": "Budapest", "date": "2025-07-20", "lat": 47.5819, "lon": 19.2508, "status": "upcoming"},
    {"round": 14, "name": "Belgian Grand Prix", "location": "Spa", "date": "2025-07-27", "lat": 50.4372, "lon": 5.9710, "status": "upcoming"},
    {"round": 15, "name": "Dutch Grand Prix", "location": "Zandvoort", "date": "2025-08-24", "lat": 52.3888, "lon": 4.5409, "status": "upcoming"},
    {"round": 16, "name": "Italian Grand Prix", "location": "Monza", "date": "2025-08-31", "lat": 45.6156, "lon": 9.2811, "status": "upcoming"},
    {"round": 17, "name": "Azerbaijan Grand Prix", "location": "Baku", "date": "2025-09-14", "lat": 40.4093, "lon": 49.8671, "status": "upcoming"},
    {"round": 18, "name": "Singapore Grand Prix", "location": "Singapore", "date": "2025-09-21", "lat": 1.2919, "lon": 103.8518, "status": "upcoming"},
    {"round": 19, "name": "United States Grand Prix", "location": "Austin", "date": "2025-10-05", "lat": 30.1339, "lon": -97.6411, "status": "upcoming"},
    {"round": 20, "name": "Mexico City Grand Prix", "location": "Mexico City", "date": "2025-10-19", "lat": 19.4063, "lon": -99.0907, "status": "upcoming"},
    {"round": 21, "name": "São Paulo Grand Prix", "location": "São Paulo", "date": "2025-11-02", "lat": -23.7036, "lon": -46.6997, "status": "upcoming"},
    {"round": 22, "name": "Las Vegas Grand Prix", "location": "Las Vegas", "date": "2025-11-16", "lat": 36.1699, "lon": -115.1398, "status": "upcoming"},
    {"round": 23, "name": "Qatar Grand Prix", "location": "Lusail", "date": "2025-11-23", "lat": 25.4211, "lon": 51.4904, "status": "upcoming"},
    {"round": 24, "name": "Abu Dhabi Grand Prix", "location": "Yas Marina", "date": "2025-11-30", "lat": 24.4672, "lon": 54.6031, "status": "upcoming"}
]

# In-memory storage (replace with database in production)
current_config = {
    "raceNumber": 9,
    "raceName": "Canadian Grand Prix",
    "location": "Montreal",
    "latitude": 45.5048,
    "longitude": -73.5522,
    "raceDateTime": "2025-06-15 14:00:00",
    "status": "upcoming"
}

current_qualifying = [
    {"driver": "Max Verstappen", "team": "Red Bull", "time": "1:12.345", "position": 1},
    {"driver": "Charles Leclerc", "team": "Ferrari", "time": "1:12.456", "position": 2},
    {"driver": "Lando Norris", "team": "McLaren", "time": "1:12.567", "position": 3},
]

current_team_points = {
    "McLaren": 362,
    "Mercedes": 159,
    "Red Bull": 144,
    "Williams": 54,
    "Ferrari": 165,
    "Haas": 26,
    "Aston Martin": 16,
    "Kick Sauber": 16,
    "Racing Bulls": 22,
    "Alpine": 1
}

# Real-time status tracking
live_predictions = None
last_prediction_update = None
connection_status = "connected"

OPENWEATHER_API_KEY = ''

weather_cache = {}  # key: (lat, lon), value: {"data": ..., "timestamp": ...}

live_session_config = {"year": 2024, "round": 9, "session": "R"}
live_laps = None

# Load trained model (if available)
try:
    model = xgb.XGBRegressor()
    model.load_model("f1_model.json")
    model_features = model.get_booster().feature_names
except Exception as e:
    model = None
    model_features = []
    print(f"Could not load model: {e}")

class PredictionInput(BaseModel):
    year: int
    round: int
    circuit: str
    driver: str
    team: str
    grid_position: int
    qualifying_time: float
    avg_race_pace: float
    pit_stops: int
    tire_strategy: str
    weather: str
    temp: float
    rain_probability: float
    team_points: int
    driver_points: int

def get_next_race():
    """Get the next upcoming race"""
    now = datetime.now()
    for race in race_schedule:
        race_date = datetime.strptime(race["date"], "%Y-%m-%d")
        if race_date > now:
            return race
    return race_schedule[-1]

def get_time_until_race():
    """Calculate time until current race"""
    race_time = datetime.strptime(current_config["raceDateTime"], "%Y-%m-%d %H:%M:%S")
    now = datetime.now()
    diff = race_time - now
    
    if diff.total_seconds() <= 0:
        return {"status": "live", "time_remaining": 0}
    
    return {
        "status": "upcoming",
        "time_remaining": diff.total_seconds(),
        "days": diff.days,
        "hours": diff.seconds // 3600,
        "minutes": (diff.seconds % 3600) // 60,
        "seconds": diff.seconds % 60
    }

async def broadcast_race_status():
    """Broadcast real-time race status updates"""
    while True:
        try:
            time_until_race = get_time_until_race()
            
            # Update race status if needed
            if time_until_race["status"] == "live" and current_config["status"] != "live":
                current_config["status"] = "live"
                await manager.broadcast(json.dumps({
                    "type": "race_status",
                    "status": "live",
                    "message": f"Race is now LIVE! {current_config['raceName']}"
                }))
            
            # Auto-progress to next race if current race is finished
            if current_config["status"] == "finished":
                next_race = get_next_race()
                if next_race["round"] != current_config["raceNumber"]:
                    current_config.update({
                        "raceNumber": next_race["round"],
                        "raceName": next_race["name"],
                        "location": next_race["location"],
                        "latitude": next_race["lat"],
                        "longitude": next_race["lon"],
                        "raceDateTime": next_race["date"] + " 14:00:00",
                        "status": "upcoming"
                    })
                    await manager.broadcast(json.dumps({
                        "type": "race_progression",
                        "new_race": current_config
                    }))
            
            # Broadcast countdown updates
            await manager.broadcast(json.dumps({
                "type": "countdown",
                "data": time_until_race
            }))
            
            await asyncio.sleep(1)  # Update every second
            
        except Exception as e:
            print(f"Error in broadcast_race_status: {e}")
            await asyncio.sleep(5)

@app.post("/live/session")
def set_live_session(config: dict):
    global live_session_config
    live_session_config = config
    return {"ok": True}

async def fetch_live_f1_data():
    import fastf1
    import time
    global live_laps, live_predictions
    fastf1.Cache.enable_cache('cache_folder')
    while True:
        try:
            session = fastf1.get_session(
                live_session_config["year"],
                live_session_config["round"],
                live_session_config["session"]
            )
            try:
                session.load(live=True)
            except Exception as e:
                print(f"Live load failed: {e}, trying historical data...")
                try:
                    session.load()
                except Exception as e2:
                    print(f"Historical load failed: {e2}")
                    live_laps = None
                    live_predictions = None
                    await manager.broadcast(json.dumps({
                        "type": "live_laps_update",
                        "error": f"No data available for this session. {e2}",
                        "timestamp": datetime.now().isoformat()
                    }))
                    await asyncio.sleep(10)
                    continue
            laps = session.laps
            if laps.empty:
                print("No laps data available for this session.")
                live_laps = None
                live_predictions = None
                await manager.broadcast(json.dumps({
                    "type": "live_laps_update",
                    "error": "No live data available. This session has not started yet or data is not yet available.",
                    "timestamp": datetime.now().isoformat()
                }))
                await asyncio.sleep(10)
                continue
            live_laps = laps.to_dict(orient='records')
            # --- Mock real-time prediction logic ---
            sorted_laps = sorted(live_laps, key=lambda x: (x.get('LapNumber', 0), -x.get('Position', 99)), reverse=True)
            live_predictions = [{
                "driver": lap["Driver"],
                "team": lap.get("Team", ""),
                "predictedPos": i+1
            } for i, lap in enumerate(sorted_laps[:10])]
            await manager.broadcast(json.dumps({
                "type": "live_laps_update",
                "lap_count": len(live_laps) if live_laps else 0,
                "predictions": live_predictions,
                "timestamp": datetime.now().isoformat()
            }))
        except Exception as e:
            print(f"Live F1 fetch error: {e}")
            live_laps = None
            live_predictions = None
            await manager.broadcast(json.dumps({
                "type": "live_laps_update",
                "error": f"Live F1 fetch error: {e}",
                "timestamp": datetime.now().isoformat()
            }))
        await asyncio.sleep(10)

@app.on_event("startup")
async def startup_event():
    """Start real-time background tasks"""
    asyncio.create_task(broadcast_race_status())
    asyncio.create_task(fetch_live_f1_data())

@app.get("/")
def read_root():
    return {"message": "F1 Prediction API", "status": "real-time"}

@app.get("/config")
def get_config():
    return {
        "raceConfig": current_config,
        "qualifyingTimes": current_qualifying,
        "teamPoints": current_team_points,
        "raceSchedule": race_schedule,
        "timeUntilRace": get_time_until_race(),
        "nextRace": get_next_race(),
        "connectionStatus": connection_status,
        "lastUpdate": datetime.now().isoformat()
    }

@app.post("/config/race")
def update_race_config(config: RaceConfig):
    global current_config
    current_config = config.dict()
    current_config["status"] = "upcoming"
    return {"message": "Race config updated"}

@app.post("/config/qualifying")
def update_qualifying(qualifying: List[QualifyingEntry]):
    global current_qualifying
    current_qualifying = [q.dict() for q in qualifying]
    return {"message": "Qualifying times updated"}

@app.post("/config/team-points")
def update_team_points(team_points: TeamPoints):
    global current_team_points
    current_team_points = team_points.points
    return {"message": "Team points updated"}

@app.get("/weather/{lat}/{lon}")
def get_weather(lat: float, lon: float, api_key: str):
    """Get weather data for race location"""
    try:
        url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Weather API error: {str(e)}")

@app.post("/predict")
def predict(input: PredictionInput):
    if model is None:
        return {"error": "Prediction model not available. Please train and save the model as f1_model.json."}
    df = pd.DataFrame([input.dict()])
    categorical = ['driver', 'team', 'circuit', 'tire_strategy', 'weather']
    df = pd.get_dummies(df, columns=categorical)
    for col in model_features:
        if col not in df.columns:
            df[col] = 0
    df = df[model_features]
    pred = model.predict(df)[0]
    return {"predicted_finish_position": round(pred)}

@app.get("/predictions/live")
def get_live_predictions():
    """Get current live predictions"""
    return {
        "predictions": live_predictions,
        "lastUpdate": last_prediction_update.isoformat() if last_prediction_update else None,
        "raceStatus": current_config["status"]
    }

@app.get("/generate-code")
def generate_python_code():
    """Generate Python code snippet for the current configuration"""
    qualifying_data = "\n".join([
        f'    ["{q["driver"]}", "{q["team"]}", "{q["time"]}", {q["position"]}]'
        for q in current_qualifying
    ])
    
    team_points_data = "\n".join([
        f'    "{team}": {points}'
        for team, points in current_team_points.items()
    ])
    
    code = f'''# Generated F1 Prediction Configuration
import pandas as pd
import fastf1 as fast17

# Race Configuration
session_2024 = fast17.get_session(2024, {current_config["raceNumber"]}, "R")

# Qualifying Data
qualifying_2025 = pd.DataFrame([
{qualifying_data}
], columns=["Driver", "Team", "Time", "Position"])

# Weather API Configuration
weather_url = f"https://api.openweathermap.org/data/2.5/forecast?lat={current_config["latitude"]}&lon={current_config["longitude"]}&appid={{YOUR_API_KEY}}&units=metric"
forecast_time = "{current_config["raceDateTime"]}"

# Constructor Championship Points
team_points = {{
{team_points_data}
}}

# Race Details
race_name = "{current_config["raceName"]}"
race_location = "{current_config["location"]}"
race_coordinates = ({current_config["latitude"]}, {current_config["longitude"]})
'''
    
    return {"code": code}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        # Send initial data
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "message": "Connected to F1 Prediction API",
            "currentConfig": current_config,
            "timeUntilRace": get_time_until_race()
        }))
        
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/status")
def get_system_status():
    """Get real-time system status"""
    return {
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "activeConnections": len(manager.active_connections),
        "raceStatus": current_config["status"],
        "timeUntilRace": get_time_until_race(),
        "lastPredictionUpdate": last_prediction_update.isoformat() if last_prediction_update else None
    }

@app.get("/weather/live")
def get_live_weather(lat: float = Query(None), lon: float = Query(None)):
    import time
    now = time.time()
    # Use provided lat/lon if given, else fall back to current_config
    if lat is None:
        lat = current_config["latitude"]
    if lon is None:
        lon = current_config["longitude"]
    api_key = current_config.get("apiKey") or OPENWEATHER_API_KEY
    if not api_key:
        return {"error": "No OpenWeatherMap API key set."}
    cache_key = (lat, lon)
    cache_entry = weather_cache.get(cache_key)
    if cache_entry and now - cache_entry["timestamp"] < 300:
        return cache_entry["data"]
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        weather_cache[cache_key] = {"data": data, "timestamp": now}
        return data
    except Exception as e:
        return {"error": str(e)}

@app.get("/live/laps")
def get_live_laps():
    if live_laps is None:
        return {"error": "No live lap data available for this session. The session may not be running or data is not yet available."}
    return {"laps": live_laps}

@app.get("/live/predictions")
def get_live_predictions():
    if live_predictions is None:
        return {"error": "No live predictions available for this session. The session may not be running or data is not yet available."}
    return {"predictions": live_predictions}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 