
export type WidgetType = 'value' | 'area-chart' | 'bar-chart' | 'gauge' | 'switch' | 'environment';

export interface WidgetConfig {
  id: string;
  entity_id: string;
  type: WidgetType;
  title: string;
  unit?: string;
  colSpan?: 1 | 2;
  color?: string;
}

export interface WeatherNodeConfig {
  id: string;
  name: string;
  camera_entity?: string;
  temp_entity?: string;
  humidity_entity?: string;
  wind_entity?: string;
  aqi_entity?: string;
}

export interface HomeAssistantConfig {
  url: string;
  token: string;
  pinnedEntities: string[];
  solar_production_entity?: string;
  grid_consumption_entity?: string;
  grid_export_entity?: string; 
  car_battery_entity?: string;
  invoice_entity?: string; 
  security_cameras: string[];
  security_sensors: string[];
  temperature_sensors: string[];
  tracked_people: string[];
  alarm_entity?: string;
  weather_nodes: {
    torrejon: WeatherNodeConfig;
    navalacruz: WeatherNodeConfig;
    santibanez: WeatherNodeConfig;
  };
}

export interface FireflyConfig {
  url: string;
  token: string;
  proxy_url?: string;
  main_account_id?: string;
  savings_account_id?: string;
  credit_card_id?: string;
  use_sheets_mirror?: boolean;
  sheets_csv_url?: string;
}

export interface AppConfig {
  ha: HomeAssistantConfig;
  firefly: FireflyConfig;
}

export interface UserLocation {
  entity_id: string;
  name: string;
  lat: number;
  lng: number;
  lastSeen: string;
  battery: number;
  status: string;
  history?: {lat: number, lng: number, time: string}[];
}

export interface WeatherData {
  location: string;
  temp: number;
  condition: string;
  forecast: string;
  humidity: number;
  wind: number;
}

export interface SensorData {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  icon: string;
  type: string;
  trend?: 'up' | 'down' | 'stable';
}

export enum AppSection {
  DASHBOARD = 'dashboard',
  ENERGY = 'energy',
  FINANCE = 'finance',
  FIREFLY = 'firefly',
  SECURITY = 'security',
  WEATHER = 'weather',
  MAPS = 'maps',
  REMOTE = 'remote',
  SHEETS = 'sheets',
  SETTINGS = 'settings'
}
