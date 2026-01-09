
/**
 * Nexus Home Assistant Bridge - Persistencia de Alta Disponibilidad
 */

export const DEFAULT_HA_URL = "https://3p30htdlzk9a3yu1yzb04956g3pkp1ky.ui.nabu.casa";
export const DEFAULT_HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmNzQ5MGY5ZTUwNTA0NTAwYTYwNzQzMTcyZDBjZDI0NCIsImlhdCI6MTc2NzM3NDA1NywiZXhwIjoyMDgyNzM0MDU3fQ.yoa9yRBkizc1PjFzR7imtu7njshEKWKRN3S0dWkRON0";

const getNormalizedSensorId = (username: string) => {
  const slug = username.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^\w\-]+/g, '');
  return `sensor.nexus_config_${slug}`;
};

/**
 * MOTOR DE EXTRACCIÓN RECURSIVO
 * Capaz de "pelar" capas de JSON anidadas o strings escapados
 */
function extractConfigFromRaw(input: any): any {
  if (!input) return null;

  let current = input;

  // Si es un string, intentamos parsearlo primero
  if (typeof current === 'string') {
    try {
      // Intentamos encontrar el bloque JSON si hay texto basura alrededor
      const startIdx = current.indexOf('{');
      const endIdx = current.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        current = JSON.parse(current.substring(startIdx, endIdx + 1));
      }
    } catch (e) {
      return null;
    }
  }

  // Navegación por la estructura del sensor de respaldo: attributes.a -> json -> config_data
  if (current.attributes?.a) {
    return extractConfigFromRaw(current.attributes.a);
  }
  
  if (current.json?.config_data) {
    return current.json.config_data;
  }

  if (current.config_data) {
    return current.config_data;
  }

  // Si después de parsear el string 'a' obtuvimos un objeto que tiene 'json'
  if (current.json) {
    return extractConfigFromRaw(current.json);
  }

  return (typeof current === 'object' && !Array.isArray(current)) ? current : null;
}

/**
 * BUSCADOR DE CONFIGURACIÓN EN HOME ASSISTANT
 */
export async function fetchMasterConfig(username: string, url: string, token: string) {
  const cleanUrl = url.replace(/\/$/, '');
  const authHeader = { 
    "Authorization": `Bearer ${token.trim()}`, 
    "Content-Type": "application/json" 
  };

  // 1. Intentamos primero con el sensor de respaldo global (sensor.nexus_ultimo_estado)
  // 2. Si falla, intentamos con el sensor específico del usuario
  const targetIds = ['sensor.nexus_ultimo_estado', getNormalizedSensorId(username)];

  for (const entityId of targetIds) {
    try {
      console.log(`[NEXUS] Intentando recuperar desde: ${entityId}`);
      const response = await fetch(`${cleanUrl}/api/states/${entityId}`, {
        method: 'GET',
        headers: authHeader
      });
      
      if (response.ok) {
        const data = await response.json();
        const extracted = extractConfigFromRaw(data);
        
        if (extracted && (extracted.url || extracted.dashboardWidgets)) {
          console.log(`[NEXUS] Sincronización exitosa desde ${entityId}`);
          return extracted;
        }
      }
    } catch (e) {
      console.warn(`[NEXUS] Error al consultar ${entityId}:`, e);
    }
  }

  return null;
}

/**
 * GUARDADO EN HOME ASSISTANT
 */
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
      headers: { 
        "Authorization": `Bearer ${token.trim()}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (e) {
    console.error("[NEXUS] Error al guardar:", e);
    return false;
  }
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
