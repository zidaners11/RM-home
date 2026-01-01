
/**
 * Nexus Finance Sync Engine v12.1 - Optimized Ingestion & User URL handling
 */

export async function fetchFinanceFromSheets(sheetUrl: string) {
  try {
    let fetchUrl = (sheetUrl || '').trim();
    if (!fetchUrl) return { transactions: [], budgets: [], summaries: [] };

    // Limpieza y preparación de la URL de Google Sheets
    if (fetchUrl.includes('docs.google.com/spreadsheets')) {
      // Si no tiene output=csv, lo forzamos
      if (!fetchUrl.includes('output=csv')) {
        fetchUrl += fetchUrl.includes('?') ? '&output=csv' : '?output=csv';
      }
      // Cache-busting para evitar datos viejos
      fetchUrl += `&t=${Date.now()}`;
    }

    const response = await fetch(fetchUrl, { 
      method: 'GET', 
      mode: 'cors', 
      cache: 'no-store'
    });
    
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    
    const csvData = await response.text();
    if (csvData.trim().startsWith('<!DOCTYPE') || csvData.trim().startsWith('<html')) {
       throw new Error("URL_NOT_A_CSV_ERROR");
    }

    const lines = csvData.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return { transactions: [], budgets: [], summaries: [] };

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    
    const transactions: any[] = [];
    const budgets: any[] = [];
    const summaries: any[] = [];

    const parseCurrency = (val: string) => {
      if (!val) return 0;
      let clean = val.replace(/[^\d,.-]/g, '').trim();
      if (clean.includes(',') && clean.includes('.')) {
         clean = clean.replace(/\./g, '').replace(',', '.');
      } else if (clean.includes(',')) {
         clean = clean.replace(',', '.');
      }
      return parseFloat(clean) || 0;
    };

    lines.slice(1).forEach(line => {
      const regex = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
      const cells = line.split(regex).map(c => c.replace(/"/g, '').trim());
      
      // Columnas A-D: Transacciones
      if (cells[0] && cells[2]) {
        transactions.push({
          attributes: {
            transactions: [{
              date: cells[0],
              description: cells[1] || 'Transacción',
              amount: parseCurrency(cells[2]).toString(),
              category_name: cells[3] || 'Varios'
            }]
          }
        });
      }

      // Columnas F-I: Presupuestos
      if (cells[5] && cells[7]) {
        budgets.push({
          month: cells[5].toLowerCase(),
          category: cells[6],
          limit: parseCurrency(cells[7]),
          spent: parseCurrency(cells[8])
        });
      }

      // Columnas K-N: Resúmenes Globales
      if (cells[10] && cells[11]) {
        summaries.push({
          month: cells[10].toLowerCase(),
          income: parseCurrency(cells[11]),
          realSpent: parseCurrency(cells[12]),
          predictedSpent: parseCurrency(cells[13])
        });
      }
    });

    return {
      transactions: transactions.sort((a, b) => {
        try {
          return new Date(b.attributes.transactions[0].date).getTime() - new Date(a.attributes.transactions[0].date).getTime();
        } catch(e) { return 0; }
      }),
      budgets,
      summaries
    };
  } catch (e: any) {
    console.error("Finance Sync Engine Error:", e);
    throw e;
  }
}

const getBaseUrl = (url: string, proxy?: string) => {
  if (!url) return '';
  let instanceUrl = url.trim().replace(/\/+$/, '');
  if (!instanceUrl.startsWith('http')) instanceUrl = `https://${instanceUrl}`;
  let apiPath = instanceUrl.endsWith('/api/v1') ? instanceUrl : (instanceUrl.endsWith('/api') ? `${instanceUrl}/v1` : `${instanceUrl}/api/v1`);
  if (proxy && proxy.trim() !== '') return `${proxy.trim().replace(/\/+$/, '')}/${apiPath}`;
  return apiPath;
};

const getHeaders = (token: string) => ({
  "Authorization": `Bearer ${token}`,
  "Accept": "application/vnd.api+json",
  "Content-Type": "application/json",
});

export async function testFireflyConnection(url: string, token: string, proxy?: string) {
  const fullUrl = getBaseUrl(url, proxy);
  try {
    const response = await fetch(`${fullUrl}/about`, {
      method: 'GET',
      headers: getHeaders(token),
      mode: 'cors'
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, version: data.data.version };
    }
    return { success: false, status: response.status };
  } catch (error) {
    throw new Error("NETWORK_ERROR");
  }
}

export async function fetchFireflyAccounts(url: string, token: string, proxy?: string) {
  const fullUrl = getBaseUrl(url, proxy);
  const response = await fetch(`${fullUrl}/accounts?type=asset`, {
    method: 'GET',
    headers: getHeaders(token),
    mode: 'cors'
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const data = await response.json();
  return data.data;
}

export async function fetchFireflyTransactions(url: string, token: string, accountId?: string, proxy?: string) {
  const fullUrl = getBaseUrl(url, proxy);
  const endpoint = accountId ? `${fullUrl}/accounts/${accountId}/transactions?limit=15` : `${fullUrl}/transactions?limit=20`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHeaders(token),
    mode: 'cors'
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const data = await response.json();
  return data.data;
}
