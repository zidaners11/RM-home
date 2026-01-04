
/**
 * Nexus Home Assistant Bridge - Ultra Sync Engine v12.8 (Deep Debug & Aggressive Discovery)
 */

export const DEFAULT_HA_URL = "https://3p30htdlzk9a3yu1yzb04956g3pkp1ky.ui.nabu.casa";
export const DEFAULT_HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmNzQ5MGY5ZTUwNTA0NTAwYTYwNzQzMTcyZDBjZDI0NCIsImlhdCI6MTc2NzM3NDA1NywiZXhwIjoyMDgyNzM0MDU3fQ.yoa9yRBkizc1PjFzR7imtu7njshEKWKRN3S0dWkRON0";

const getNormalizedSensorId = (username: string) => {
  const slug = username.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^\w\-]+/g, '');
  return `sensor.nexus_config_${slug}`;
};

const getCleanBaseUrl = (url: string) => {
  let clean = (url || DEFAULT_HA_URL).trim().replace(/\/+$/, '');
  if (clean.endsWith('/api')) clean = clean.slice(0, -4);
  return clean;
};

/**
 * BUSCADOR MAESTRO DE CONFIGURACIÓN CON ESCANEO AGRESIVO
 */
export async function fetchMasterConfig(username: string, url: string, token: string) {
  const targetId = getNormalizedSensorId(username);
  const cleanUrl = getCleanBaseUrl(url);
  const authHeader = { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" };
  const userLower = username.toLowerCase().trim();

  console.log(`[NEXUS DEBUG] Iniciando búsqueda para: ${userLower}`);

  try {
    // 1. INTENTO DIRECTO
    const response = await fetch(`${cleanUrl}/api/states/${targetId}`, {
      method: 'GET',
      headers: authHeader,
      mode: 'cors'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.attributes?.config_data) {
        console.log(`[NEXUS CLOUD] Enlace directo OK: ${targetId}`);
        return typeof data.attributes.config_data === 'string' ? JSON.parse(data.attributes.config_data) : data.attributes.config_data;
      }
    }

    // 2. ESCANEO PROFUNDO (Si el directo falla con 404)
    console.warn(`[NEXUS CLOUD] ${targetId} no responde. Escaneando TODAS las entidades de Home Assistant...`);
    const globalResp = await fetch(`${cleanUrl}/api/states`, {
      method: 'GET',
      headers: authHeader,
      mode: 'cors'
    });

    if (globalResp.ok) {
      const allStates = await globalResp.json();
      console.log(`[NEXUS DEBUG] Recibidas ${allStates.length} entidades de HA.`);

      // Búsqueda multivariable:
      // - Coincidencia en entity_id que contenga el usuario y "config" o "nexus"
      // - Coincidencia en friendly_name
      // - Coincidencia en el atributo "user"
      const foundEntity = allStates.find((s: any) => {
        const eid = s.entity_id.toLowerCase();
        const fname = (s.attributes?.friendly_name || '').toLowerCase();
        const attrUser = (s.attributes?.user || '').toLowerCase();

        const matchId = eid.includes(userLower) && (eid.includes('config') || eid.includes('nexus'));
        const matchName = fname.includes('nexus') && fname.includes(userLower);
        const matchAttr = attrUser === userLower;

        return matchId || matchName || matchAttr;
      });

      if (foundEntity) {
        console.log(`[NEXUS CLOUD] ¡Discovery Exitoso! Encontrado en: ${foundEntity.entity_id}`);
        const config = foundEntity.attributes?.config_data;
        if (config) {
            return typeof config === 'string' ? JSON.parse(config) : config;
        }
      } else {
        // Log de ayuda: mostrar entidades que contengan al menos el nombre de usuario
        const closeMatches = allStates
            .filter((s: any) => s.entity_id.toLowerCase().includes(userLower))
            .map((s: any) => s.entity_id);
        if (closeMatches.length > 0) {
            console.log(`[NEXUS DEBUG] No hay sensor de config, pero encontré estas entidades de ${userLower}:`, closeMatches);
        }
      }
    } else {
        console.error(`[NEXUS DEBUG] Error al obtener listado global: ${globalResp.status}`);
    }
  } catch (e) {
    console.error("[NEXUS CLOUD] Error crítico de red:", e);
  }

  return null;
}

/**
 * GUARDADO MAESTRO
 */
export async function saveMasterConfig(username: string, config: any, url: string, token: string) {
  const sensorId = getNormalizedSensorId(username);
  const cleanUrl = getCleanBaseUrl(url);

  try {
    const payload = {
      state: 'OK',
      attributes: {
        friendly_name: `Nexus Config - ${username}`,
        icon: 'mdi:nexus-hub',
        last_sync: new Date().toISOString(),
        user: username,
        config_data: config 
      }
    };

    const response = await fetch(`${cleanUrl}/api/states/${sensorId}`, {
      method: 'POST',
      headers: { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" },
      mode: 'cors',
      body: JSON.stringify(payload)
    });

    if (response.ok) {
        console.log(`[NEXUS CLOUD] Guardado forzado exitoso en ${sensorId}`);
    }
    return response.ok;
  } catch (e) {
    return false;
  }
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
  } catch (error: any) { return null; }
}

export async function callHAService(url: string, token: string, domain: string, service: string, serviceData: any) {
  try {
    const cleanUrl = getCleanBaseUrl(url);
    await fetch(`${cleanUrl}/api/services/${domain}/${service}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token.trim()}`, "Content-Type": "application/json" },
      mode: 'cors',
      body: JSON.stringify(serviceData),
    });
  } catch (e) {}
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
