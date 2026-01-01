
import { SensorData, UserLocation, WeatherData } from './types';

export const LOCATIONS = [
  { name: 'Torrejón de la Calzada', lat: 40.1989, lng: -3.8014 },
  { name: 'Navalacruz', lat: 40.4397, lng: -4.9389 },
  { name: 'Santibáñez el Bajo', lat: 40.1758, lng: -6.2239 }
];

export const MOCK_SENSORS: SensorData[] = [
  { id: 'cons_main', name: 'Consumo Total', value: 1.2, unit: 'kW', icon: 'zap', type: 'energy', trend: 'up' },
  { id: 'solar_gen', name: 'Producción Solar', value: 4.5, unit: 'kW', icon: 'sun', type: 'solar', trend: 'stable' },
  { id: 'ev_charge', name: 'Carga Coche', value: 85, unit: '%', icon: 'battery', type: 'battery', trend: 'down' },
  { id: 'temp_salon', name: 'Temp Salon', value: 22.5, unit: '°C', icon: 'thermometer', type: 'environment' },
  { id: 'door_main', name: 'Puerta Principal', value: 'Cerrada', unit: '', icon: 'lock', type: 'security' },
  { id: 'alarm_status', name: 'Alarma', value: 'Armada', unit: '', icon: 'shield', type: 'security' }
];

export const MOCK_PEOPLE: UserLocation[] = [
  { entity_id: 'person.juan', name: 'Juan', lat: 40.1990, lng: -3.8015, lastSeen: 'Hace 2 min', battery: 92, status: 'home' },
  { entity_id: 'person.maria', name: 'Maria', lat: 40.4400, lng: -4.9390, lastSeen: 'Hace 5 min', battery: 45, status: 'not_home' },
  { entity_id: 'person.carlos', name: 'Carlos', lat: 40.1760, lng: -6.2240, lastSeen: 'Ahora', battery: 100, status: 'home' }
];

export interface ForecastPoint {
  time: string;
  temp: number;
  condition: string;
}

export interface ExtendedWeatherData extends WeatherData {
  webcamUrl?: string;
  aqi: number;
  uv: number;
  sunrise: string;
  sunset: string;
  forecastTimeline: ForecastPoint[];
}

export const MOCK_WEATHER: ExtendedWeatherData[] = [
  { 
    location: 'Torrejón de la Calzada', 
    temp: 18, 
    condition: 'Despejado', 
    forecast: 'Estabilidad térmica', 
    humidity: 42, 
    wind: 10,
    webcamUrl: 'HOME_HA_CAM',
    aqi: 32,
    uv: 4,
    sunrise: '07:42',
    sunset: '19:15',
    forecastTimeline: [
      { time: '3h', temp: 19, condition: 'Despejado' },
      { time: '6h', temp: 17, condition: 'Intervalos' },
      { time: '12h', temp: 14, condition: 'Despejado' },
      { time: '24h', temp: 16, condition: 'Nuboso' }
    ]
  },
  { 
    location: 'Navalacruz', 
    temp: 11, 
    condition: 'Nuboso', 
    forecast: 'Frío en cumbres', 
    humidity: 65, 
    wind: 22,
    webcamUrl: 'https://www.meteonavalacruz.es/webcamnavalacruz.jpg?nocache=',
    aqi: 12,
    uv: 2,
    sunrise: '07:44',
    sunset: '19:18',
    forecastTimeline: [
      { time: '3h', temp: 10, condition: 'Nieve' },
      { time: '6h', temp: 8, condition: 'Nieve' },
      { time: '12h', temp: 6, condition: 'Nuboso' },
      { time: '24h', temp: 9, condition: 'Lluvias' }
    ]
  },
  { 
    location: 'Santibáñez el Bajo', 
    temp: 15, 
    condition: 'Lluvias', 
    forecast: 'Lluvias débiles', 
    humidity: 55, 
    wind: 14,
    webcamUrl: 'https://meteopino.es/cam_1.jpg?t=',
    aqi: 18,
    uv: 3,
    sunrise: '07:49',
    sunset: '19:24',
    forecastTimeline: [
      { time: '3h', temp: 14, condition: 'Lluvias' },
      { time: '6h', temp: 13, condition: 'Intervalos' },
      { time: '12h', temp: 12, condition: 'Nuboso' },
      { time: '24h', temp: 15, condition: 'Despejado' }
    ]
  }
];
