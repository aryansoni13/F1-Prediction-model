import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from fastf1.ergast import Ergast
import numpy as np
import requests
import fastf1

# Fetch historical race results and qualifying data from Ergast API
ergast = Ergast()

def get_dataframe(resp, year=None):
    if hasattr(resp, 'content'):
        content = resp.content
        if not content:
            return pd.DataFrame()
        # If content is a list of DataFrames or DataFrame-like
        if hasattr(content[0], 'to_dict'):
            dfs = []
            for idx, c in enumerate(content):
                df = pd.DataFrame(c) if not isinstance(c, pd.DataFrame) else c
                # Add year and round columns
                if year is not None:
                    df['season'] = year
                df['round'] = idx + 1  # Use index+1 as round number
                dfs.append(df)
            return pd.concat(dfs, ignore_index=True)
        # Flatten if it's a list of lists
        if isinstance(content[0], list):
            content = [item for sublist in content for item in sublist]
        # If still not a dict, print for debug
        if not isinstance(content[0], dict):
            print(f"Unexpected content structure: {type(content[0])}, value: {content[0]}")
            return None
        # If dicts are nested, use json_normalize
        if any(any(isinstance(v, dict) for v in d.values()) for d in content):
            print("Using json_normalize for nested dicts.")
            return pd.json_normalize(content)
        return pd.DataFrame(content)
    else:
        print(f"Unknown response object: {type(resp)}. Available attributes: {dir(resp)}")
        return None

# Get race results for multiple seasons (e.g., 2018-2023)
dataframes = []
for year in range(2018, 2024):
    print(f"Fetching {year}...")
    results_resp = ergast.get_race_results(season=year)
    results = get_dataframe(results_resp, year=year)
    if results is None or results.empty:
        print(f"No race results for {year}, skipping.")
        continue
    try:
        qualifying_resp = ergast.get_qualifying_results(season=year)
        qualifying = get_dataframe(qualifying_resp, year=year)
        if qualifying is None or qualifying.empty:
            print(f"No qualifying data for {year}, using grid position as proxy.")
            qualifying = None
    except AttributeError:
        print(f"No get_qualifying_results method, using grid position as proxy.")
        qualifying = None
    if qualifying is not None:
        # Merge on season, round, driverId
        merged = pd.merge(
            results,
            qualifying[['season', 'round', 'driverId', 'Q3', 'Q2', 'Q1']],
            left_on=['season', 'round', 'driverId'],
            right_on=['season', 'round', 'driverId'],
            how='left'
        )
    else:
        merged = results.copy()
        merged['Q3'] = np.nan
        merged['Q2'] = np.nan
        merged['Q1'] = np.nan
    dataframes.append(merged)

if not dataframes:
    raise Exception("No data fetched from Ergast API.")
df = pd.concat(dataframes, ignore_index=True)

# Feature engineering
# Use Q3 as qualifying time if available, else Q2, else Q1, else grid position as proxy
def parse_time(t):
    if pd.isnull(t):
        return np.nan
    # If it's a Timedelta, convert to total seconds
    if isinstance(t, pd.Timedelta):
        return t.total_seconds()
    # If it's already a float or int, return as is
    if isinstance(t, (float, int)):
        return t
    # If it's a string with ':', parse as minutes:seconds
    if isinstance(t, str) and ':' in t:
        m, s = t.split(':')
        return float(m) * 60 + float(s)
    # If it's a string and can be converted to float
    try:
        return float(t)
    except Exception:
        return np.nan

if 'Q3' in df.columns:
    df['qualifying_time'] = df['Q3'].combine_first(df['Q2']).combine_first(df['Q1']).apply(parse_time)
else:
    df['qualifying_time'] = np.nan

# If qualifying_time is still missing, use grid position as a proxy (normalized)
df['qualifying_time'] = df['qualifying_time'].fillna(df['grid'] / df['grid'].max())

# Select and rename features
df = df.rename(columns={
    'season': 'year',
    # 'raceName': 'circuit',  # Remove or comment out if not present
    'driverId': 'driver',
    'constructorId': 'team',
    'grid': 'grid_position',
    'points': 'driver_points',
    'position': 'finish_position',  # Use 'position' instead of 'positionOrder'
})

# If 'circuit' is missing, fill with 'Unknown'
if 'circuit' not in df.columns:
    print("Column 'circuit' missing, filling with 'Unknown'.")
    df['circuit'] = 'Unknown'

# Print the first few rows for debugging
print(df.head())

# Print columns after renaming for debugging
print("Columns after renaming:", df.columns.tolist())

# Add dummy/default columns for missing features
for col, default in [
    ('avg_race_pace', 90.0),
    ('pit_stops', 2),
    ('tire_strategy', 'Unknown'),
    ('weather', 'Unknown'),
    ('temp', 20.0),
    ('rain_probability', 0.0),
    ('team_points', 0),
    ('dnf', 0)
]:
    if col not in df:
        df[col] = default

# Only keep necessary columns
keep_cols = [
    'year', 'round', 'circuit', 'driver', 'team', 'grid_position', 'qualifying_time',
    'avg_race_pace', 'pit_stops', 'tire_strategy', 'weather', 'temp', 'rain_probability',
    'team_points', 'driver_points', 'dnf', 'finish_position'
]

# Ensure all required columns exist
for col in keep_cols:
    if col not in df.columns:
        print(f"Column '{col}' missing, filling with NaN.")
        df[col] = np.nan

# Now subset
df = df[keep_cols]

# Drop rows with missing finish_position
df = df.dropna(subset=['finish_position'])

# Feature engineering: categorical encoding
categorical = ['driver', 'team', 'circuit', 'tire_strategy', 'weather']
df = pd.get_dummies(df, columns=categorical)

target = 'finish_position'
features = [col for col in df.columns if col not in [target, 'year', 'round']]
X = df[features]
y = df[target]

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
print('MAE:', mae)

# Save model
model.save_model('f1_model.json')
print('Model saved as f1_model.json')

def fetch_weather(lat, lon, api_key):
    url = f'https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric'
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        weather = data['weather'][0]['main']
        temp = data['main']['temp']
        rain = data.get('rain', {}).get('1h', 0.0)
        return weather, temp, rain
    else:
        print(f"Failed to fetch weather: {response.status_code}")
        return 'Unknown', 20.0, 0.0

api_key = '3018402e89f6f1aec6cee593d6ff315e'

# For demonstration, use Montreal's coordinates for all races (replace with actual race lat/lon if available)
df['latitude'] = 45.5048
df['longitude'] = -73.5522

weather_list, temp_list, rain_list = [], [], []
for idx, row in df.iterrows():
    weather, temp, rain = fetch_weather(row['latitude'], row['longitude'], api_key)
    weather_list.append(weather)
    temp_list.append(temp)
    rain_list.append(rain)

df['weather'] = weather_list
df['temp'] = temp_list
df['rain_probability'] = [min(100, r * 100) for r in rain_list]  # crude estimate

def get_pitstop_and_tire_data(year, round_num):
    try:
        session = fastf1.get_session(year, round_num, 'R')
        session.load()
        laps = session.laps
        pit_stops = laps.groupby('Driver')['PitInTime'].count().to_dict()
        tire_strategy = laps.groupby('Driver')['Compound'].agg(lambda x: x.mode()[0] if not x.mode().empty else 'Unknown').to_dict()
        return pit_stops, tire_strategy
    except Exception as e:
        print(f"Failed to fetch pit/tire data for {year} round {round_num}: {e}")
        return {}, {}

# Fill pit stop and tire strategy data
pitstop_list, tire_list = [], []
for idx, row in df.iterrows():
    year = int(row['year'])
    round_num = int(row['round'])
    driver = row['driver']
    pit_stops, tire_strategy = get_pitstop_and_tire_data(year, round_num)
    pitstop_list.append(pit_stops.get(driver, 0))
    tire_list.append(tire_strategy.get(driver, 'Unknown'))

df['pit_stops'] = pitstop_list
df['tire_strategy'] = tire_list

def get_avg_race_pace(year, round_num):
    try:
        session = fastf1.get_session(year, round_num, 'R')
        session.load()
        laps = session.laps
        avg_pace = (
            laps.groupby('Driver')['LapTime']
            .apply(lambda x: x.dropna().mean().total_seconds() if not x.dropna().empty else np.nan)
            .to_dict()
        )
        return avg_pace
    except Exception as e:
        print(f"Failed to fetch avg race pace for {year} round {round_num}: {e}")
        return {}

# Fill average race pace data
avg_pace_list = []
for idx, row in df.iterrows():
    year = int(row['year'])
    round_num = int(row['round'])
    driver = row['driver']
    avg_pace = get_avg_race_pace(year, round_num)
    avg_pace_list.append(avg_pace.get(driver, np.nan))

df['avg_race_pace'] = avg_pace_list 