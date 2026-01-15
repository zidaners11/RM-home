
/**
 * Nexus Home Assistant Bridge - Persistencia de Alta Disponibilidad
 */

export const DEFAULT_HA_URL = "https://3p30htdlzk9a3yu1yzb04956g3pkp1ky.ui.nabu.casa";
export const DEFAULT_HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmNzQ5MGY5ZTUwNTA0NTAwYTYwNzQzMTcyZDBjZDI0NCIsImlhdCI6MTc2NzM3NDA1NywiZXhwIjoyMDgyNzM0MDU3fQ.yoa9yRBkizc1PjFzR7imtu7njshEKWKRN3S0dWkRON0";

// Proxy para evitar bloqueos de CORS al consultar AEMET directamente
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

const getNormalizedSensorId = (username: string) => {
  const slug = username.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^\w\-]+/g, '');
  return `sensor.nexus_config_${slug}`;
};

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
  if (current.attributes?.a) return extractConfigFromRaw(current.attributes.a);
  if (current.json?.config_data) return current.json.config_data;
  if (current.config_data) return current.config_data;
  if (current.json) return extractConfigFromRaw(current.json);
  return (typeof current === 'object' && !Array.isArray(current)) ? current : null;
}

export async function fetchMasterConfig(username: string, url: string, token: string) {
  const cleanUrl = url.replace(/\/$/, '');
  const authHeader = { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" };
  const targetIds = ['sensor.nexus_ultimo_estado', getNormalizedSensorId(username)];
  for (const entityId of targetIds) {
    try {
      const response = await fetch(`${cleanUrl}/api/states/${entityId}`, { method: 'GET', headers: authHeader });
      if (response.ok) {
        const data = await response.json();
        const extracted = extractConfigFromRaw(data);
        if (extracted && (extracted.url || extracted.dashboardWidgets)) return extracted;
      }
    } catch (e) {}
  }
  return null;
}

export async function saveMasterConfig(username: string, config: any, url: string, token: string) {
  const formalUser = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
  const sensorId = getNormalizedSensorId(username);
  const cleanUrl = url.replace(/\/$/, '');
  const payload = {
    state: 'Active',
    attributes: {
      friendly_name: `Nexus Config - ${formalUser}`,
      icon: "mdi:nexus-hub",
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

/**
 * Fetch and parse AEMET XML for weather forecast
 */
export async function fetchAemetXml(url: string) {
  try {
    // Usamos el proxy para saltar el CORS
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) return [];
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    const dias = Array.from(xmlDoc.getElementsByTagName('dia'));
    if (dias.length === 0) {
      console.warn("[NEXUS] XML cargado pero no se encontraron etiquetas <dia>");
      return [];
    }
    
    return dias.map(dia => {
      const fechaAttr = dia.getAttribute('fecha') || '';
      
      // Búsqueda profunda de temperaturas
      const tempMaxNode = dia.querySelector('temperatura maxima');
      const tempMinNode = dia.querySelector('temperatura minima');
      const tMax = tempMaxNode?.textContent || '0';
      const tMin = tempMinNode?.textContent || '0';
      
      // Probabilidades de precipitación (AEMET pone varias por tramos horarios, buscamos la más relevante o la primera)
      const probNodes = Array.from(dia.getElementsByTagName('prob_precipitacion'));
      const popValue = probNodes.find(n => n.textContent && n.textContent !== '0' && n.textContent !== '')?.textContent 
                       || probNodes[0]?.textContent || '0';
      
      // Estado del cielo
      const cieloNodes = Array.from(dia.getElementsByTagName('estado_cielo'));
      const estadoCielo = cieloNodes.find(n => n.getAttribute('descripcion'))?.getAttribute('descripcion') 
                         || cieloNodes[0]?.getAttribute('descripcion') || 'Despejado';
      
      // Formatear fecha para el display (ej: LUN 24)
      const dateObj = new Date(fechaAttr);
      const dayLabel = dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }).toUpperCase();
      
      return {
        day: dayLabel,
        max: parseInt(tMax),
        min: parseInt(tMin),
        pop: parseInt(popValue),
        cond: estadoCielo
      };
    });
  } catch (e) {
    console.error("[NEXUS] Critical AEMET XML Error:", e);
    return [];
  }
}
