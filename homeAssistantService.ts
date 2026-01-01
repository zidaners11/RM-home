
export async function fetchHAStates(url: string, token: string) {
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
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

export async function fetchHAHistory(url: string, token: string, entityId: string, hours: number = 72) {
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    // Calculamos el tiempo atrás solicitado (por defecto 72h)
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
    console.error("Error fetching HA History:", error);
    return [];
  }
}

export async function testHAConnection(url: string, token: string) {
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
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

export async function callHAService(url: string, token: string, domain: string, service: string, entity_id: string) {
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/api/services/${domain}/${service}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      mode: 'cors',
      body: JSON.stringify({ entity_id }),
    });
    return await response.json();
  } catch (error) {
    console.error("HA Service Call Error:", error);
    return null;
  }
}
