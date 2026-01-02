
/**
 * Nexus Home Assistant Bridge - Master Control Edition
 * Pre-configured for Nabu Casa Secure Tunnel
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

export async function notifyAuthorizationRequest(username: string) {
  try {
    const cleanUrl = getCleanBaseUrl(DEFAULT_HA_URL);
    await fetch(`${cleanUrl}/api/services/persistent_notification/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEFAULT_HA_TOKEN.trim()}`,
        "Content-Type": "application/json",
      },
      mode: 'cors',
      body: JSON.stringify({
        notification_id: "nexus_auth_request",
        title: "NEXUS_ACCESS_REQUEST",
        message: `ALERTA: El usuario [${username}] está intentando acceder a Nexus Home Hub. Se ha enviado un correo de validación a juanmirs@gmail.com.`
      }),
    });
    return true;
  } catch (e) {
    return false;
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

export async function getCloudSyncConfig(url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN) {
  try {
    const states = await fetchHAStates(url, token);
    const syncNotification = states.find((s: any) => s.entity_id === 'persistent_notification.nexus_cloud_sync');
    if (syncNotification && syncNotification.attributes.message) {
      return JSON.parse(syncNotification.attributes.message);
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function saveConfigToHA(url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN, configData: any) {
  try {
    const cleanUrl = getCleanBaseUrl(url);
    await fetch(`${cleanUrl}/api/services/persistent_notification/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      mode: 'cors',
      body: JSON.stringify({
        notification_id: "nexus_cloud_sync",
        title: "NEXUS_SYNC_DATA",
        message: JSON.stringify(configData)
      }),
    });
    return true;
  } catch (e) {
    return false;
  }
}

export async function testHAConnection(url: string, token: string) {
  try {
    const cleanUrl = getCleanBaseUrl(url);
    const response = await fetch(`${cleanUrl}/api/config`, {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      mode: 'cors'
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, version: data.version };
    }
    return { success: false, error: `HTTP_${response.status}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
