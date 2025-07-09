import React, { useState, useEffect } from 'react';
import { Play, Settings, Calendar, MapPin, Trophy, Clock, Users, Target, TrendingUp, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

// At the top of the file, define the API base URL from the environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

const F1PredictionDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  const [raceConfig, setRaceConfig] = useState({
    raceNumber: 9,
    raceName: 'Canadian Grand Prix',
    location: 'Montreal',
    latitude: 45.5048,
    longitude: -73.5522,
    raceDateTime: '2025-06-15 14:00:00',
    apiKey: ''
  });

  const [qualifyingTimes, setQualifyingTimes] = useState([
    { driver: 'Max Verstappen', team: 'Red Bull', time: '1:12.345', position: 1 },
    { driver: 'Charles Leclerc', team: 'Ferrari', time: '1:12.456', position: 2 },
    { driver: 'Lando Norris', team: 'McLaren', time: '1:12.567', position: 3 },
    { driver: 'Oscar Piastri', team: 'McLaren', time: '1:12.678', position: 4 },
    { driver: 'Carlos Sainz', team: 'Ferrari', time: '1:12.789', position: 5 },
    { driver: 'George Russell', team: 'Mercedes', time: '1:12.890', position: 6 },
    { driver: 'Lewis Hamilton', team: 'Mercedes', time: '1:12.901', position: 7 },
    { driver: 'Sergio Perez', team: 'Red Bull', time: '1:13.012', position: 8 },
    { driver: 'Fernando Alonso', team: 'Aston Martin', time: '1:13.123', position: 9 },
    { driver: 'Lance Stroll', team: 'Aston Martin', time: '1:13.234', position: 10 }
  ]);

  const [teamPoints, setTeamPoints] = useState({
    'McLaren': 362,
    'Mercedes': 159,
    'Red Bull': 144,
    'Williams': 54,
    'Ferrari': 165,
    'Haas': 26,
    'Aston Martin': 16,
    'Kick Sauber': 16,
    'Racing Bulls': 22,
    'Alpine': 1
  });

  const [predictions, setPredictions] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [raceStatus, setRaceStatus] = useState('upcoming'); // upcoming, live, finished
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [weatherLive, setWeatherLive] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  const [liveSession, setLiveSession] = useState({ year: 2024, round: 9, session: 'R' });
  const [liveLaps, setLiveLaps] = useState([]);
  const [livePredictions, setLivePredictions] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);

  // Real-time 2025 F1 Calendar with next race detection
  const raceSchedule = [
    { round: 1, name: 'Bahrain Grand Prix', location: 'Sakhir', date: '2025-03-02', lat: 26.0325, lon: 50.5106, status: 'finished' },
    { round: 2, name: 'Saudi Arabian Grand Prix', location: 'Jeddah', date: '2025-03-09', lat: 21.4858, lon: 39.1925, status: 'finished' },
    { round: 3, name: 'Australian Grand Prix', location: 'Melbourne', date: '2025-03-16', lat: -37.8497, lon: 144.9680, status: 'finished' },
    { round: 4, name: 'Japanese Grand Prix', location: 'Suzuka', date: '2025-04-06', lat: 34.8431, lon: 136.5414, status: 'finished' },
    { round: 5, name: 'Chinese Grand Prix', location: 'Shanghai', date: '2025-04-20', lat: 31.3389, lon: 121.2196, status: 'finished' },
    { round: 6, name: 'Miami Grand Prix', location: 'Miami', date: '2025-05-04', lat: 25.9581, lon: -80.2389, status: 'finished' },
    { round: 7, name: 'Emilia Romagna Grand Prix', location: 'Imola', date: '2025-05-18', lat: 44.3439, lon: 11.7167, status: 'finished' },
    { round: 8, name: 'Monaco Grand Prix', location: 'Monte Carlo', date: '2025-05-25', lat: 43.7347, lon: 7.4206, status: 'finished' },
    { round: 9, name: 'Canadian Grand Prix', location: 'Montreal', date: '2025-06-15', lat: 45.5048, lon: -73.5522, status: 'upcoming' },
    { round: 10, name: 'Spanish Grand Prix', location: 'Barcelona', date: '2025-06-22', lat: 41.5700, lon: 2.2611, status: 'upcoming' },
    { round: 11, name: 'Austrian Grand Prix', location: 'Spielberg', date: '2025-06-29', lat: 47.2197, lon: 14.7647, status: 'upcoming' },
    { round: 12, name: 'British Grand Prix', location: 'Silverstone', date: '2025-07-06', lat: 52.0786, lon: -1.0169, status: 'upcoming' },
    { round: 13, name: 'Hungarian Grand Prix', location: 'Budapest', date: '2025-07-20', lat: 47.5819, lon: 19.2508, status: 'upcoming' },
    { round: 14, name: 'Belgian Grand Prix', location: 'Spa', date: '2025-07-27', lat: 50.4372, lon: 5.9710, status: 'upcoming' },
    { round: 15, name: 'Dutch Grand Prix', location: 'Zandvoort', date: '2025-08-24', lat: 52.3888, lon: 4.5409, status: 'upcoming' },
    { round: 16, name: 'Italian Grand Prix', location: 'Monza', date: '2025-08-31', lat: 45.6156, lon: 9.2811, status: 'upcoming' },
    { round: 17, name: 'Azerbaijan Grand Prix', location: 'Baku', date: '2025-09-14', lat: 40.4093, lon: 49.8671, status: 'upcoming' },
    { round: 18, name: 'Singapore Grand Prix', location: 'Singapore', date: '2025-09-21', lat: 1.2919, lon: 103.8518, status: 'upcoming' },
    { round: 19, name: 'United States Grand Prix', location: 'Austin', date: '2025-10-05', lat: 30.1339, lon: -97.6411, status: 'upcoming' },
    { round: 20, name: 'Mexico City Grand Prix', location: 'Mexico City', date: '2025-10-19', lat: 19.4063, lon: -99.0907, status: 'upcoming' },
    { round: 21, name: 'São Paulo Grand Prix', location: 'São Paulo', date: '2025-11-02', lat: -23.7036, lon: -46.6997, status: 'upcoming' },
    { round: 22, name: 'Las Vegas Grand Prix', location: 'Las Vegas', date: '2025-11-16', lat: 36.1699, lon: -115.1398, status: 'upcoming' },
    { round: 23, name: 'Qatar Grand Prix', location: 'Lusail', date: '2025-11-23', lat: 25.4211, lon: 51.4904, status: 'upcoming' },
    { round: 24, name: 'Abu Dhabi Grand Prix', location: 'Yas Marina', date: '2025-11-30', lat: 24.4672, lon: 54.6031, status: 'upcoming' }
  ];

  const teamColors = {
    'McLaren': 'bg-orange-500',
    'Mercedes': 'bg-teal-500',
    'Red Bull': 'bg-blue-600',
    'Williams': 'bg-blue-400',
    'Ferrari': 'bg-red-600',
    'Haas': 'bg-gray-600',
    'Aston Martin': 'bg-green-600',
    'Kick Sauber': 'bg-green-500',
    'Racing Bulls': 'bg-purple-600',
    'Alpine': 'bg-pink-500'
  };

  // Real-time countdown timer
  const getTimeUntilRace = () => {
    const raceTime = new Date(raceConfig.raceDateTime);
    const now = new Date();
    const diff = raceTime - now;
    
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, status: 'live' };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds, status: 'upcoming' };
  };

  // Auto-detect next race
  const getNextRace = () => {
    const now = new Date();
    return raceSchedule.find(race => new Date(race.date) > now) || raceSchedule[raceSchedule.length - 1];
  };

  // Real-time updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setLastUpdate(new Date());
      
      // Auto-update race status
      const timeUntilRace = getTimeUntilRace();
      if (timeUntilRace.status === 'live' && raceStatus !== 'live') {
        setRaceStatus('live');
      }
      
      // Auto-progress to next race if current race is finished
      if (raceStatus === 'finished') {
        const nextRace = getNextRace();
        if (nextRace && nextRace.round !== raceConfig.raceNumber) {
          loadRacePreset(nextRace);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [raceStatus, raceConfig.raceNumber]);

  // Auto-update predictions every 30 seconds if enabled
  useEffect(() => {
    if (!autoUpdate) return;
    
    const predictionTimer = setInterval(() => {
      if (raceStatus === 'live' && predictions.length > 0) {
        generatePredictions();
      }
    }, 30000);

    return () => clearInterval(predictionTimer);
  }, [autoUpdate, raceStatus, predictions.length]);

  // Simulate connection status
  useEffect(() => {
    const connectionTimer = setInterval(() => {
      setConnectionStatus(Math.random() > 0.95 ? 'disconnected' : 'connected');
    }, 10000);

    return () => clearInterval(connectionTimer);
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connection_established':
          console.log('WebSocket connection established');
          break;
          
        case 'race_status':
          if (data.status === 'live') {
            setRaceStatus('live');
            // Show notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('F1 Race Live!', {
                body: data.message,
                icon: '/favicon.ico'
              });
            }
          }
          break;
          
        case 'race_progression':
          // Auto-update to next race
          setRaceConfig(prev => ({
            ...prev,
            raceNumber: data.new_race.raceNumber,
            raceName: data.new_race.raceName,
            location: data.new_race.location,
            latitude: data.new_race.latitude,
            longitude: data.new_race.longitude,
            raceDateTime: data.new_race.raceDateTime
          }));
          setRaceStatus('upcoming');
          break;
          
        case 'predictions_update':
          setPredictions(data.predictions);
          setLastUpdate(new Date(data.timestamp));
          break;
          
        case 'countdown':
          // Update countdown data if needed
          break;
          
        case 'pong':
          // Keep connection alive
          break;
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
    };
    
    // Keep connection alive with ping
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const generatePredictions = () => {
    setIsRunning(true);
    
    // Simulate ML model prediction process with real-time updates
    setTimeout(() => {
      const mockPredictions = qualifyingTimes.map((driver, index) => {
        // Add some randomness for real-time feel
        const randomFactor = Math.random() * 0.2 - 0.1;
        const basePrediction = Math.max(1, driver.position + Math.floor(Math.random() * 6) - 3);
        const predictedPos = Math.max(1, Math.min(20, basePrediction + Math.floor(randomFactor * 3)));
        
        return {
          driver: driver.driver,
          team: driver.team,
          qualifyingPos: driver.position,
          predictedPos: predictedPos,
          confidence: Math.max(70, Math.min(99, (85 + Math.random() * 15 + randomFactor * 10))).toFixed(1),
          winProbability: driver.position <= 5 ? 
            Math.max(0, Math.min(25, (20 - driver.position * 3 + Math.random() * 10 + randomFactor * 5))).toFixed(1) : 
            Math.max(0, Math.min(8, (Math.random() * 5 + randomFactor * 3))).toFixed(1),
          pit_stops: Math.floor(Math.random() * 3),
          tire_strategy: Math.floor(Math.random() * 3),
          avg_race_pace: Math.max(1, Math.min(2, Math.random() * 2)),
          weather: Math.floor(Math.random() * 3),
          temp: Math.max(18, Math.min(30, Math.random() * 12 + 18)),
          rain_probability: Math.max(0, Math.min(100, Math.random() * 100))
        };
      }).sort((a, b) => a.predictedPos - b.predictedPos);

      setPredictions(mockPredictions);
      setIsRunning(false);
    }, 2000);
  };

  const updateQualifyingTime = (index, field, value) => {
    const updated = [...qualifyingTimes];
    updated[index][field] = value;
    setQualifyingTimes(updated);
  };

  const updateTeamPoints = (team, points) => {
    setTeamPoints(prev => ({
      ...prev,
      [team]: parseInt(points) || 0
    }));
  };

  const generateCodeSnippet = () => {
    const qualifyingData = qualifyingTimes.map(q => 
      `    ["${q.driver}", "${q.team}", "${q.time}", ${q.position}]`
    ).join(',\n');

    const teamPointsData = Object.entries(teamPoints).map(([team, points]) => 
      `    "${team}": ${points}`
    ).join(',\n');

    return `# Generated F1 Prediction Configuration
import pandas as pd
import fastf1 as fast17

# Race Configuration
session_2024 = fast17.get_session(2024, ${raceConfig.raceNumber}, "R")

# Qualifying Data
qualifying_2025 = pd.DataFrame([
${qualifyingData}
], columns=["Driver", "Team", "Time", "Position"])

# Weather API Configuration
weather_url = f"https://api.openweathermap.org/data/2.5/forecast?lat=${raceConfig.latitude}&lon=${raceConfig.longitude}&appid={YOUR_API_KEY}&units=metric"
forecast_time = "${raceConfig.raceDateTime}"

# Constructor Championship Points
team_points = {
${teamPointsData}
}

# Race Details
race_name = "${raceConfig.raceName}"
race_location = "${raceConfig.location}"
race_coordinates = (${raceConfig.latitude}, ${raceConfig.longitude})
`;
  };

  const loadRacePreset = (race) => {
    setRaceConfig({
      ...raceConfig,
      raceNumber: race.round,
      raceName: race.name,
      location: race.location,
      latitude: race.lat,
      longitude: race.lon,
      raceDateTime: race.date + ' 14:00:00'
    });
    setRaceStatus(race.status);
  };

  const timeUntilRace = getTimeUntilRace();
  const nextRace = getNextRace();

  // Fetch live weather on load and every 5 minutes
  const fetchWeather = async (lat, lon) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/weather/live?lat=${lat}&lon=${lon}`);
      setWeatherLive(res.data);
    } catch (err) {
      setWeatherError('Could not fetch weather');
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleLocationChange = async (e) => {
    const newLocation = e.target.value;
    setRaceConfig(prev => ({ ...prev, location: newLocation }));
    if (newLocation.length > 2) {
      try {
        const apiKey = '3018402e89f6f1aec6cee593d6ff315e';
        const geoUrl = `${API_BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(newLocation)}&limit=1&appid=${apiKey}`;
        const res = await axios.get(geoUrl);
        if (res.data && res.data.length > 0) {
          const lat = res.data[0].lat;
          const lon = res.data[0].lon;
          const updatedConfig = {
            ...raceConfig,
            location: newLocation,
            latitude: lat,
            longitude: lon
          };
          setRaceConfig(updatedConfig);
          await axios.post(`${API_BASE_URL}/config/race`, updatedConfig);
          fetchWeather(lat, lon);
        }
      } catch (err) {
        // Optionally handle geocoding error
      }
    }
  };

  useEffect(() => {
    fetchWeather(raceConfig.latitude, raceConfig.longitude);
    const interval = setInterval(() => fetchWeather(raceConfig.latitude, raceConfig.longitude), 300000);
    return () => clearInterval(interval);
  }, [raceConfig.latitude, raceConfig.longitude]);

  const fetchLiveData = async () => {
    setLiveLoading(true);
    try {
      const lapsRes = await axios.get(`${API_BASE_URL}/live/laps`);
      setLiveLaps(lapsRes.data.laps || []);
      const predRes = await axios.get(`${API_BASE_URL}/live/predictions`);
      setLivePredictions(predRes.data.predictions || []);
    } catch (err) {
      // Optionally handle error
    } finally {
      setLiveLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 10000);
    return () => clearInterval(interval);
  }, [liveSession.year, liveSession.round, liveSession.session]);

  const handleLiveSessionChange = async (field, value) => {
    const updated = { ...liveSession, [field]: value };
    setLiveSession(updated);
    await axios.post(`${API_BASE_URL}/live/session`, updated);
    fetchLiveData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Real-time Status Bar */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {connectionStatus === 'connected' ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
                <span className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>
                  {connectionStatus === 'connected' ? 'Live' : 'Offline'}
                </span>
              </div>
              <div className="text-gray-300">
                Last Update: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-gray-300">
                {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
              </div>
              <div className="flex items-center space-x-2">
                {raceStatus === 'live' && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                <span className={raceStatus === 'live' ? 'text-red-400 font-semibold' : 'text-gray-300'}>
                  {raceStatus === 'live' ? 'LIVE' : raceStatus === 'upcoming' ? 'UPCOMING' : 'FINISHED'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">F1 Race Predictor</h1>
                <p className="text-gray-300 text-sm">Real-time ML-Powered Race Outcome Prediction</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-300">Next Race</div>
                <div className="font-semibold">{nextRace.name}</div>
                <div className="text-xs text-gray-400">{nextRace.date}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav className="flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'config', label: 'Race Config', icon: Settings },
            { id: 'qualifying', label: 'Qualifying', icon: Clock },
            { id: 'points', label: 'Team Points', icon: Trophy },
            { id: 'code', label: 'Generate Code', icon: Play }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Weather Widget */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 flex flex-col md:flex-row items-center md:items-start md:space-x-8 mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Weather at {raceConfig.location}
                </h2>
                {weatherLoading ? (
                  <div className="text-gray-300">Loading weather...</div>
                ) : weatherError ? (
                  <div className="text-red-400">{weatherError}</div>
                ) : weatherLive && weatherLive.main ? (
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      {weatherLive.weather && weatherLive.weather[0] && (
                        <img src={`https://openweathermap.org/img/wn/${weatherLive.weather[0].icon}@2x.png`} alt="icon" className="w-12 h-12" />
                      )}
                      <div>
                        <div className="text-3xl font-bold">{Math.round(weatherLive.main.temp)}°C</div>
                        <div className="capitalize text-gray-200">{weatherLive.weather[0].description}</div>
                      </div>
                    </div>
                    <div className="text-gray-300">
                      <div>Wind: {weatherLive.wind.speed} m/s</div>
                      <div>Humidity: {weatherLive.main.humidity}%</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-300">No weather data.</div>
                )}
              </div>
            </div>

            {/* Race Countdown */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Race Countdown
              </h2>
              {timeUntilRace.status === 'live' ? (
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400 mb-2">RACE IS LIVE!</div>
                  <div className="text-gray-300">Live predictions are being generated</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-400">{timeUntilRace.days}</div>
                    <div className="text-gray-300">Days</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-400">{timeUntilRace.hours}</div>
                    <div className="text-gray-300">Hours</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-400">{timeUntilRace.minutes}</div>
                    <div className="text-gray-300">Minutes</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-orange-400">{timeUntilRace.seconds}</div>
                    <div className="text-gray-300">Seconds</div>
                  </div>
                </div>
              )}
            </div>

            {/* Race Overview */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Race Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">Round {raceConfig.raceNumber}</div>
                  <div className="text-gray-300">Race Number</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{raceConfig.raceName}</div>
                  <div className="text-gray-300">Grand Prix</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{raceConfig.location}</div>
                  <div className="text-gray-300">Location</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{raceConfig.raceDateTime.split(' ')[0]}</div>
                  <div className="text-gray-300">Race Date</div>
                </div>
              </div>
            </div>

            {/* Prediction Results */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Race Predictions
                </h2>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoUpdate}
                      onChange={(e) => setAutoUpdate(e.target.checked)}
                      className="rounded"
                    />
                    <span>Auto-update</span>
                  </label>
                  <button
                    onClick={generatePredictions}
                    disabled={isRunning}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 px-6 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    {isRunning ? 'Running ML Model...' : 'Generate Predictions'}
                  </button>
                </div>
              </div>

              {isRunning && (
                <div className="text-center py-8">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                  <div className="text-gray-300">Processing race data and generating predictions...</div>
                </div>
              )}

              {predictions.length > 0 && !isRunning && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-4">Predicted Position</th>
                        <th className="text-left py-3 px-4">Driver</th>
                        <th className="text-left py-3 px-4">Team</th>
                        <th className="text-left py-3 px-4">Qualifying</th>
                        <th className="text-left py-3 px-4">Win Probability</th>
                        <th className="text-left py-3 px-4">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.map((prediction, index) => (
                        <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-3 px-4 font-bold text-xl">{prediction.predictedPos}</td>
                          <td className="py-3 px-4 font-medium">{prediction.driver}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block w-4 h-4 rounded-full mr-2 ${teamColors[prediction.team]}`}></span>
                            {prediction.team}
                          </td>
                          <td className="py-3 px-4">P{prediction.qualifyingPos}</td>
                          <td className="py-3 px-4">{prediction.winProbability}%</td>
                          <td className="py-3 px-4">{prediction.confidence}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Race Configuration
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Race Number</label>
                  <input
                    type="number"
                    value={raceConfig.raceNumber}
                    onChange={(e) => setRaceConfig({...raceConfig, raceNumber: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Race Name</label>
                  <input
                    type="text"
                    value={raceConfig.raceName}
                    onChange={(e) => setRaceConfig({...raceConfig, raceName: e.target.value})}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    value={raceConfig.location}
                    onChange={handleLocationChange}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-400 mt-1">If you change the location, please update latitude and longitude below for correct weather data.</div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={raceConfig.latitude}
                    onChange={(e) => setRaceConfig({...raceConfig, latitude: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={raceConfig.longitude}
                    onChange={(e) => setRaceConfig({...raceConfig, longitude: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Race Date & Time</label>
                  <input
                    type="datetime-local"
                    value={raceConfig.raceDateTime.replace(' ', 'T')}
                    onChange={(e) => setRaceConfig({...raceConfig, raceDateTime: e.target.value.replace('T', ' ')})}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Race Presets */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold mb-4">2025 F1 Calendar</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {raceSchedule.map((race, index) => (
                  <button
                    key={index}
                    onClick={() => loadRacePreset(race)}
                    className={`text-left p-4 rounded-lg transition-colors border ${
                      race.round === raceConfig.raceNumber 
                        ? 'bg-blue-600/20 border-blue-500' 
                        : 'bg-white/5 hover:bg-white/10 border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Round {race.round}</div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        race.status === 'finished' ? 'bg-gray-600 text-gray-300' :
                        race.status === 'live' ? 'bg-red-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {race.status.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">{race.name}</div>
                    <div className="text-sm text-gray-400">{race.location} • {race.date}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'qualifying' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Qualifying Results
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4">Position</th>
                    <th className="text-left py-3 px-4">Driver</th>
                    <th className="text-left py-3 px-4">Team</th>
                    <th className="text-left py-3 px-4">Time</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {qualifyingTimes.map((driver, index) => (
                    <tr key={index} className="border-b border-white/10">
                      <td className="py-3 px-4 font-bold">{driver.position}</td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={driver.driver}
                          onChange={(e) => updateQualifyingTime(index, 'driver', e.target.value)}
                          className="bg-transparent border-none focus:outline-none focus:bg-white/10 rounded px-2 py-1"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={driver.team}
                          onChange={(e) => updateQualifyingTime(index, 'team', e.target.value)}
                          className="bg-transparent border-none focus:outline-none focus:bg-white/10 rounded px-2 py-1"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={driver.time}
                          onChange={(e) => updateQualifyingTime(index, 'time', e.target.value)}
                          className="bg-transparent border-none focus:outline-none focus:bg-white/10 rounded px-2 py-1"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={async () => {
                            updateQualifyingTime(index, 'position', index + 1);
                            await axios.post(`${API_BASE_URL}/config/qualifying`, qualifyingTimes);
                            alert('Qualifying time updated!');
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'points' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Constructor Championship Points
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(teamPoints).map(([team, points]) => (
                <div key={team} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/20">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${teamColors[team]}`}></div>
                    <span className="font-medium">{team}</span>
                  </div>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => updateTeamPoints(team, e.target.value)}
                    className="w-24 px-3 py-1 bg-white/10 border border-white/20 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Play className="w-5 h-5 mr-2" />
              Generated Python Code
            </h2>
            <div className="relative">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{generateCodeSnippet()}</code>
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(generateCodeSnippet())}
                className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-sm"
              >
                Copy Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default F1PredictionDashboard; 