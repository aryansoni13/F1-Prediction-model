# F1 Prediction Dashboard - Real-Time Edition

A **real-time** F1 Prediction Dashboard for F1 fans and AI/ML engineers. This application provides an intuitive interface to configure race parameters, qualifying times, team points, and generate **live race predictions** using machine learning models with automatic race progression and real-time updates.

## Features

### 🏁 Race Configuration
- **Race Number/Session**: Easily update the race number for `fast17.get_session(2024, race_number, "R")`
- **Race Details**: Configure race name, location, coordinates, and date/time
- **Race Presets**: Quick selection from 2025 F1 calendar with pre-configured locations

### ⏱️ Qualifying Management
- **Editable Qualifying Times**: Update driver names, teams, times, and positions
- **Real-time Updates**: Changes reflect immediately in the prediction model
- **Position Management**: Automatic position updates based on qualifying performance

### 🏆 Team Points
- **Constructor Championship**: Update team points for the current season
- **Visual Team Colors**: Each team has distinct color coding
- **Real-time Calculations**: Points updates affect prediction accuracy

### 🤖 Real-Time ML Integration
- **Live Prediction Generation**: Run ML models to predict race outcomes in real-time
- **Auto-Updating Predictions**: Predictions update automatically during live races
- **Confidence Scoring**: Get confidence levels for each prediction
- **Win Probability**: Calculate win probabilities for each driver
- **Model Integration**: Easy integration point for your custom ML models
- **WebSocket Support**: Real-time communication between frontend and ML backend

### 📊 Real-Time Dashboard
- **Live Race Countdown**: Real-time countdown to next race with automatic progression
- **Race Status Tracking**: Live/Upcoming/Finished status with automatic updates
- **Race Overview**: Visual display of current race configuration
- **Live Prediction Results**: Real-time prediction table with rankings
- **Weather Integration**: Weather data API integration for race conditions
- **Connection Status**: Real-time connection monitoring with WebSocket support
- **Push Notifications**: Browser notifications when races go live

### 💻 Code Generation
- **Python Code Export**: Generate ready-to-use Python code snippets
- **Configuration Export**: Export all settings for use in your ML pipeline
- **Copy to Clipboard**: One-click code copying for easy integration

## Tech Stack

### Frontend
- **React 18**: Modern React with hooks
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons
- **Axios**: HTTP client for API calls

### Backend
- **FastAPI**: Modern Python web framework with WebSocket support
- **Pydantic**: Data validation
- **Pandas**: Data manipulation
- **Uvicorn**: ASGI server
- **WebSocket**: Real-time bidirectional communication
- **Async/Await**: Non-blocking real-time updates

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Your F1 prediction ML model

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the backend server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`
   - Interactive API: `http://localhost:8000/redoc`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Start the React development server:**
   ```bash
   npm start
   ```

   The dashboard will be available at `http://localhost:3000`

## Usage

### 1. Configure Race Settings
- Go to the "Race Config" tab
- Update race number, name, location, and coordinates
- Use race presets for quick configuration
- Set race date and time

### 2. Update Qualifying Times
- Navigate to "Qualifying" tab
- Edit driver names, teams, times, and positions
- Changes are saved automatically

### 3. Manage Team Points
- Go to "Team Points" tab
- Update constructor championship points
- Visual team color coding for easy identification

### 4. Generate Live Predictions
- Return to "Dashboard" tab
- Click "Generate Predictions" to run your ML model
- View real-time prediction results with confidence scores
- Enable "Auto-update" for continuous prediction updates during live races
- Receive push notifications when races go live

### 5. Export Code
- Visit "Generate Code" tab
- Copy the generated Python code for your ML pipeline
- Use the configuration in your existing prediction scripts

## API Endpoints

### Configuration
- `GET /config` - Get current configuration
- `POST /config/race` - Update race configuration
- `POST /config/qualifying` - Update qualifying times
- `POST /config/team-points` - Update team points

### Predictions
- `POST /predict` - Generate race predictions
- `GET /predictions/live` - Get current live predictions
- `GET /weather/{lat}/{lon}` - Get weather data
- `GET /generate-code` - Generate Python code snippet
- `GET /status` - Get real-time system status
- `WS /ws` - WebSocket endpoint for real-time updates

## ML Model Integration

To integrate your ML model:

1. **Modify the prediction endpoint** in `backend/main.py`:
   ```python
   @app.post("/predict")
   def generate_predictions(request: PredictionRequest):
       # Your ML model code here
       # Use request.raceConfig, request.qualifyingTimes, request.teamPoints
   ```

2. **Add your model dependencies** to `backend/requirements.txt`

3. **Update the frontend** to call your prediction endpoint

## Environment Variables

Create a `.env` file in the backend directory:
```env
OPENWEATHER_API_KEY=your_weather_api_key
MODEL_PATH=/path/to/your/ml/model
```

## Production Deployment

### Backend
- Use a production ASGI server like Gunicorn
- Set up a database (PostgreSQL recommended)
- Configure environment variables
- Set up reverse proxy (Nginx)

### Frontend
- Build the production version: `npm run build`
- Serve static files with a web server
- Configure API endpoint URLs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/docs`
- Review the code examples in the backend

## ML Prediction Pipeline

### Data Requirements
- Prepare a CSV file (e.g., f1_race_data.csv) with columns:
  - year, round, circuit, driver, team, grid_position, qualifying_time, avg_race_pace, pit_stops, tire_strategy, weather, temp, rain_probability, team_points, driver_points, dnf, finish_position

### Model Training
- Use the provided train_f1_model.py script to train an XGBoost model:
  1. Install requirements: `pip install -r backend/requirements.txt`
  2. Run: `python train_f1_model.py`
  3. This will save f1_model.json in the backend directory.

### Prediction Endpoint
- POST to `/predict` with a JSON body containing all required fields (see backend/main.py for schema).
- Returns: `{ "predicted_finish_position": int }`

### Retraining
- Add new race data to your CSV and rerun the training script to update the model.


## Model Upgrade and Retraining
To achieve more precise predictions for future races, the race prediction model will be upgraded and retrained using historical race data. The upgrade process involves enhancing the model architecture with advanced algorithms and optimized hyperparameters to improve accuracy. Key steps include:

   - **Data Preparation**: Clean and preprocess historical race data, performing feature engineering to extract relevant predictors such as past performance, track conditions, and participant metrics.
   - **Model Enhancement**: Incorporate advanced machine learning techniques (e.g., gradient boosting or neural networks) and fine-tune hyperparameters using grid search or random search.
   - **Retraining**: Retrain the model on the historical dataset with cross-validation to ensure robust performance and prevent overfitting.
   - **Evaluation**: Assess the upgraded model using metrics like accuracy, precision, and F1-score, comparing results against the baseline model to quantify improvements.
<p> This upgrade aims to deliver a more reliable and scalable model for race outcome predictions, with plans to integrate real-time data and ensemble methods in future iterations.</p>
---

**Happy Racing! 🏎️🏁** "# F1-Prediction-model" 
"# F1-Prediction-model" 
