
/**
 * Nexus Home Assistant Bridge - Cloud Sync Engine v9.0 (Docker-Ready)
 */

export const DEFAULT_HA_URL = "https://3p30htdlzk9a3yu1yzb04956g3pkp1ky.ui.nabu.casa";
export const DEFAULT_HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmNzQ5MGY5ZTUwNTA0NTAwYTYwNzQzMTcyZDBjZDI0NCIsImlhdCI6MTc2NzM3NDA1NywiZXhwIjoyMDgyNzM0MDU3fQ.yoa9yRBkizc1PjFzR7imtu7njshEKWKRN3S0dWkRON0";

/**
 * NUEVO: Intenta leer la configuración directamente del sistema de archivos local (montado vía Docker)
 * Esto evita problemas de CORS y latencia.
 */
export async function fetchLocalConfig() {
  try {
    const response = await fetch('/config.json', { cache: 'no-store' });
    if (response.ok) {
      const config = await response.json();
      console.log("[NEXUS_SYSTEM] Configuración local cargada desde volumen Docker.");
      return config;
    }
    return null;
  } catch (e) {
    return null;
  }
}

const getCleanBaseUrl = (url: string) => {
  let clean = (url || DEFAULT_HA_URL).trim().replace(/\/+$/, '');
  if (clean.endsWith('/api')) clean = clean.slice(0, -4);
  return clean;
};

export async function fetchSingleEntity(entityId: string, url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN) {
  try {
    const cleanUrl = getCleanBaseUrl(url);
    const response = await fetch(`${cleanUrl}/api/states/${entityId}`, {
      method: 'GET',
      headers: { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" },
      mode: 'cors'
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) { return null; }
}

export async function fetchHAStates(url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN) {
  try {
    const cleanUrl = getCleanBaseUrl(url);
    const response = await fetch(`${cleanUrl}/api/states`, {
      method: 'GET',
      headers: { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" },
      mode: 'cors'
    });
    return response.ok ? await response.json() : null;
  } catch (error: any) {
    return null;
  }
}

export async function getCloudSyncConfig(username: string, url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN) {
  const userUpper = username.toUpperCase();
  const userLower = username.toLowerCase();

  // Priorizamos Stage 1: Pruebas Directas por ID
  const probeIds = [
    `persistent_notification.nexus_sync_${userLower}`,
    `persistent_notification.nexus_config_${userLower}`
  ];

  for (const id of probeIds) {
    const entity = await fetchSingleEntity(id, url, token);
    if (entity && entity.attributes?.message) {
      try {
        const msg = entity.attributes.message;
        return JSON.parse(msg.substring(msg.indexOf('{'), msg.lastIndexOf('}') + 1));
      } catch (e) {}
    }
  }

  // Fallback a Stage 2: Escaneo Global (Buscando cualquier notificación que contenga el JSON)
  const states = await fetchHAStates(url, token);
  if (!states || !Array.isArray(states)) return null;

  for (const entity of states) {
    const msg = (entity.attributes?.message || "").toString();
    if (msg.includes('"url"') && msg.toUpperCase().includes(userUpper)) {
       try {
          return JSON.parse(msg.substring(msg.indexOf('{'), msg.lastIndexOf('}') + 1));
       } catch (e) {}
    }
  }
  return null;
}

// Updated callHAService to return boolean success status
export async function callHAService(url: string, token: string, domain: string, service: string, serviceData: any) {
  try {
    const cleanUrl = getCleanBaseUrl(url);
    const response = await fetch(`${cleanUrl}/api/services/${domain}/${service}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" },
      mode: 'cors',
      body: JSON.stringify(serviceData),
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

// Added saveConfigToHA to fix missing export in SettingsView.tsx
/**
 * Persists the user configuration into Home Assistant as a persistent notification.
 * This ensures the configuration is available across devices.
 */
export async function saveConfigToHA(username: string, config: any, url: string, token: string) {
  try {
    const userLower = username.toLowerCase();
    const serviceData = {
      message: JSON.stringify(config),
      notification_id: `nexus_sync_${userLower}`,
      title: `Nexus Sync Profile for ${username}`
    };
    return await callHAService(url, token, 'persistent_notification', 'create', serviceData);
  } catch (e) {
    console.error("Failed to save config to HA:", e);
    return false;
  }
}

export async function fetchHAHistory(url: string, token: string, entityId: string, hours: number = 24) {
  try {
    const cleanUrl = getCleanBaseUrl(url);
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const response = await fetch(`${cleanUrl}/api/history/period/${startTime}?filter_entity_id=${entityId}`, {
      method: 'GET',
      headers: { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" },
      mode: 'cors'
    });
    const data = await response.json();
    return data[0] || [];
  } catch (e) { return []; }
}
