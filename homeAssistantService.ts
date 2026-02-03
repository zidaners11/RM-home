
/**
 * Kame House RM - Home Assistant Bridge
 */

export const DEFAULT_HA_URL = "https://3p30htdlzk9a3yu1yzb04956g3pkp1ky.ui.nabu.casa";
export const DEFAULT_HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmNzQ5MGY5ZTUwNTA0NTAwYTYwNzQzMTcyZDBjZDI0NCIsImlhdCI6MTc2NzM3NDA1NywiZXhwIjoyMDgyNzM0MDU3fQ.yoa9yRBkizc1PjFzR7imtu7njshEKWKRN3S0dWkRON0";

const CORS_PROXY = "https://api.allorigins.win/raw?url=";

/**
 * Función CRÍTICA para CrowdSec.
 * Al no poder escribir archivos desde el navegador, generamos una entrada en el access.log de Nginx.
 * Configura CrowdSec para buscar "/auth/audit/failure" en tus logs de Nginx.
 */
export async function recordAuthAudit(username: string, status: 'success' | 'failure') {
  const timestamp = Date.now();
  const auditPath = `/auth/audit/${status}?u=${encodeURIComponent(username)}&t=${timestamp}`;
  
  try {
    // Intentamos llamar a una ruta local. Nginx registrará esto en access.log
    // aunque devuelva un 404, la línea del log contendrá el usuario y el estado.
    await fetch(auditPath, { priority: 'low' });
  } catch (e) {
    // El error es esperado si la ruta no existe, pero Nginx ya lo habrá logueado.
  }
}

export async function logAccessFailure(username: string, url: string, token: string) {
  const cleanUrl = url.replace(/\/$/, '');
  // 1. Registro en Nginx para CrowdSec
  await recordAuthAudit(username, 'failure');

  // 2. Registro en Home Assistant
  try {
    await fetch(`${cleanUrl}/api/services/persistent_notification/create`, {
      method: 'POST',
      headers: { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "SEGURIDAD: Intento Fallido",
        message: `Usuario: ${username}. IP registrada en logs de Nginx.`,
        notification_id: `auth_fail_${Date.now()}`
      })
    });
  } catch (e) {}
}

const getNormalizedSensorId = (username: string) => {
  const slug = username.toLowerCase().trim().replace(/\s+/g, '').replace(/[^\w\-]+/g, '');
  return `sensor.nexus_config_${slug}`;
};

export async function fetchMasterConfig(username: string, url: string, token: string) {
  const cleanUrl = url.replace(/\/$/, '');
  const authHeader = { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" };
  const targetIds = [getNormalizedSensorId(username), 'sensor.nexus_ultimo_estado'];
  
  for (const entityId of targetIds) {
    try {
      const response = await fetch(`${cleanUrl}/api/states/${entityId}`, { method: 'GET', headers: authHeader });
      if (response.ok) {
        const data = await response.json();
        const extracted = extractConfigFromRaw(data);
        if (extracted) return extracted;
      }
    } catch (e) {}
  }
  return null;
}

function extractConfigFromRaw(input: any): any {
  if (!input) return null;
  let current = input;
  if (typeof current === 'string') {
    try {
      const startIdx = current.indexOf('{');
      const endIdx = current.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        current = JSON.parse(current.substring(startIdx, endIdx + 1));
      }
    } catch (e) { return null; }
  }
  if (current.attributes?.config_data) return current.attributes.config_data;
  if (current.config_data) return current.config_data;
  return (typeof current === 'object' && !Array.isArray(current)) ? current : null;
}

export async function saveMasterConfig(username: string, config: any, url: string, token: string) {
  const formalUser = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
  const sensorId = getNormalizedSensorId(username);
  const cleanUrl = url.replace(/\/$/, '');
  const payload = {
    state: 'Activo',
    attributes: {
      friendly_name: `Kame House RM Config - ${formalUser}`,
      icon: "mdi:home-assistant",
      last_sync: new Date().toISOString(),
      user: formalUser,
      config_data: config 
    }
  };
  try {
    const response = await fetch(`${cleanUrl}/api/states/${sensorId}`, {
      method: 'POST',
      headers: { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch (e) { return false; }
}

export async function fetchHAStates(url: string = DEFAULT_HA_URL, token: string = DEFAULT_HA_TOKEN) {
  try {
    const cleanUrl = url.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/states`, {
      method: 'GET',
      headers: { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" }
    });
    return response.ok ? await response.json() : null;
  } catch (error) { return null; }
}

export async function fetchHAHistory(url: string, token: string, entityId: string, hours: number = 24) {
  try {
    const cleanUrl = url.replace(/\/$/, '');
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const response = await fetch(`${cleanUrl}/api/history/period/${startTime}?filter_entity_id=${entityId}`, {
      method: 'GET',
      headers: { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" }
    });
    const data = await response.json();
    return data[0] || [];
  } catch (e) { return []; }
}

export async function callHAService(url: string, token: string, domain: string, service: string, serviceData: any) {
  try {
    const cleanUrl = url.replace(/\/$/, '');
    await fetch(`${cleanUrl}/api/services/${domain}/${service}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify(serviceData),
    });
  } catch (e) {}
}

export async function fetchAemetXml(url: string) {
  try {
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return [];
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const dias = Array.from(xmlDoc.getElementsByTagName('dia'));
    if (dias.length === 0) return [];
    return dias.map(dia => {
      const fechaAttr = dia.getAttribute('fecha') || '';
      const tMax = dia.querySelector('temperatura maxima')?.textContent || '0';
      const tMin = dia.querySelector('temperatura minima')?.textContent || '0';
      const probNodes = Array.from(dia.getElementsByTagName('prob_precipitacion'));
      const popValue = probNodes.find(n => n.textContent && n.textContent !== '0' && n.textContent !== '')?.textContent || probNodes[0]?.textContent || '0';
      const estadoCielo = dia.querySelector('estado_cielo')?.getAttribute('descripcion') || 'Despejado';
      const dateObj = new Date(fechaAttr);
      const dayLabel = dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }).toUpperCase();
      return { day: dayLabel, max: parseInt(tMax), min: parseInt(tMin), pop: parseInt(popValue), cond: estadoCielo };
    });
  } catch (e) { return []; }
}
