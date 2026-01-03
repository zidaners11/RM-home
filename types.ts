
export type WidgetType = 'sensor' | 'chart' | 'switch' | 'climate' | 'checklist' | 'button';

export interface WidgetConfig {
  id: string;
  entity_id: string;
  type: WidgetType;
  title: string;
  icon?: string;
  unit?: string;
  colSpan: 1 | 2 | 3;
  color?: string;
}

export interface VehicleConfig {
  battery_entity: string;
  odometer_entity: string;
  fuel_entity: string;
  service_km_entity: string;
  saving_entity: string;
  electric_use_entity: string;
  avg_consumption_entity: string;
  time_to_charge_entity: string;
  km_today_entity: string;
  charging_speed_entity: string;
  status_entity: string;
  refresh_button_entity: string; 
  image_url: string; 
}

export interface HomeAssistantConfig {
  url: string;
  token: string;
  pinnedEntities: string[];
  solar_production_entity?: string;
  solar_daily_entity?: string;
  solar_monthly_entity?: string;
  grid_consumption_entity?: string;
  grid_export_entity?: string; 
  energy_cost_entity?: string;
  car_battery_entity?: string;
  invoice_entity?: string; 
  security_cameras: string[];
  security_sensors: string[];
  temperature_sensors: string[];
  tracked_people: string[];
  alarm_entity?: string;
  vehicle: VehicleConfig;
  custom_bg_url?: string; 
  weather_nodes: {
    torrejon: { id: string, name: string; temp_entity?: string; humidity_entity?: string; wind_entity?: string; camera_entity?: string };
    navalacruz: { id: string, name: string; temp_entity?: string; humidity_entity?: string; wind_entity?: string; camera_entity?: string };
    santibanez: { id: string, name: string; temp_entity?: string; humidity_entity?: string; wind_entity?: string; camera_entity?: string };
  };
}

export interface FireflyConfig {
  url: string;
  token: string;
  use_sheets_mirror?: boolean;
  sheets_csv_url?: string;
  main_account_id?: string;
  proxy_url?: string;
}

export interface SensorData {
  id: string;
  name: string;
  value: any;
  unit: string;
  icon: string;
  type: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface UserLocation {
  entity_id: string;
  name: string;
  lat: number;
  lng: number;
  lastSeen: string;
  battery: number;
  status: string;
  history?: { lat: number; lng: number; time: string }[];
}

export interface WeatherData {
  location: string;
  temp: number;
  condition: string;
  forecast: string;
  humidity: number;
  wind: number;
}

export enum AppSection {
  DASHBOARD = 'dashboard',
  ENERGY = 'energy',
  VEHICLE = 'vehicle',
  FINANCE = 'finance',
  FIREFLY = 'firefly',
  SECURITY = 'security',
  WEATHER = 'weather',
  MAPS = 'maps',
  SHEETS = 'sheets',
  SETTINGS = 'settings'
}
