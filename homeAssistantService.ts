
/**
 * Nexus Home Assistant Bridge - Cloud Sync Edition v2.1
 */

export const DEFAULT_HA_URL = "https://3p30htdlzk9a3yu1yzb04956g3pkp1ky.ui.nabu.casa";
export const DEFAULT_HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmNzQ5MGY5ZTUwNTA0NTAwYTYwNzQzMTcyZDBjZDI0NCIsImlhdCI6MTc2NzM3NDA1NywiZXhwIjoyMDgyNzM0MDU3fQ.yoa9yRBkizc1PjFzR7imtu7njshEKWKRN3S0dWkRON0";

const getCleanBaseUrl = (url: string) => {
  let clean = (url || DEFAULT_HA_URL).trim().replace(/\/+$/, '');
  if (clean.endsWith('/api')) {
    clean = clean.slice(0, -4);
  }
  return clean;
};

export async function fetchHAStates(url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN) {
  try {
    const cleanUrl = getCleanBaseUrl(url);
    const response = await fetch(`${cleanUrl}/api/states`, {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      mode: 'cors'
    });
    if (!response.ok) throw new Error(`HA_FETCH_FAILED_${response.status}`);
    return await response.json();
  } catch (error: any) {
    console.error("HA Fetch States Error:", error);
    return null;
  }
}

export async function fetchHAHistory(url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN, entityId: string, hours: number = 24) {
  try {
    const cleanUrl = getCleanBaseUrl(url);
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const response = await fetch(`${cleanUrl}/api/history/period/${startTime}?filter_entity_id=${entityId}`, {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      mode: 'cors'
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data[0] || [];
  } catch (error) {
    return [];
  }
}

export async function callHAService(url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN, domain: string, service: string, serviceData: any) {
  try {
    const cleanUrl = getCleanBaseUrl(url);
    const response = await fetch(`${cleanUrl}/api/services/${domain}/${service}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      mode: 'cors',
      body: JSON.stringify(serviceData),
    });
    return await response.json();
  } catch (error) {
    console.error("HA Service Call Error:", error);
    return null;
  }
}

export async function getCloudSyncConfig(username: string, url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN) {
  try {
    console.log(`[CLOUD_SYNC] Intentando descargar de: ${url}`);
    const states = await fetchHAStates(url, token);
    if (!states) return null;
    
    // El ID de la notificación debe coincidir con el que creamos en saveConfigToHA
    const syncId = `persistent_notification.nexus_config_${username.toLowerCase()}`;
    const syncNotification = states.find((s: any) => s.entity_id === syncId);
    
    if (syncNotification && syncNotification.attributes.message) {
      try {
        const config = JSON.parse(syncNotification.attributes.message);
        console.log("[CLOUD_SYNC] Configuración JSON parseada correctamente.");
        return config;
      } catch (e) {
        console.error("[CLOUD_SYNC] El mensaje en la notificación no es un JSON válido.");
        return null;
      }
    }
    console.warn(`[CLOUD_SYNC] No se encontró la entidad ${syncId} en este Home Assistant.`);
    return null;
  } catch (e) {
    console.error("Cloud Sync Load Error:", e);
    return null;
  }
}

export async function saveConfigToHA(username: string, configData: any, url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN) {
  try {
    const cleanUrl = getCleanBaseUrl(url);
    const syncId = `nexus_config_${username.toLowerCase()}`;
    
    const response = await fetch(`${cleanUrl}/api/services/persistent_notification/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      mode: 'cors',
      body: JSON.stringify({
        notification_id: syncId,
        title: `NEXUS_SYNC_${username.toUpperCase()}`,
        message: JSON.stringify(configData)
      }),
    });
    
    return response.ok;
  } catch (e) {
    console.error("Cloud Sync Save Error:", e);
    return false;
  }
}
