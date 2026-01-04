
/**
 * Nexus Home Assistant Bridge - Cloud Sync Edition
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
    throw error;
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

/**
 * Recupera la configuración guardada en HA para un usuario específico.
 */
export async function getCloudSyncConfig(username: string, url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN) {
  try {
    const states = await fetchHAStates(url, token);
    const syncId = `persistent_notification.nexus_config_${username.toLowerCase()}`;
    const syncNotification = states.find((s: any) => s.entity_id === syncId);
    if (syncNotification && syncNotification.attributes.message) {
      return JSON.parse(syncNotification.attributes.message);
    }
    return null;
  } catch (e) {
    console.error("Cloud Sync Load Error:", e);
    return null;
  }
}

/**
 * Guarda la configuración en HA como una notificación persistente (nuestra "DB" Cloud).
 */
export async function saveConfigToHA(username: string, configData: any, url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN) {
  try {
    const cleanUrl = getCleanBaseUrl(url);
    const syncId = `nexus_config_${username.toLowerCase()}`;
    await fetch(`${cleanUrl}/api/services/persistent_notification/create`, {
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
    return true;
  } catch (e) {
    console.error("Cloud Sync Save Error:", e);
    return false;
  }
}
