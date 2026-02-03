
/**
 * Nexus Finance Sync Engine v14.5 - Optimizado para Alta Velocidad
 */

let financeCache: { data: any, timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minuto

export interface SheetMatrix {
  matrix: string[][];
  getCellValue: (coord: string) => string;
  getRangeValues: (range: string) => string[];
}

export async function fetchFinanceFromSheets(sheetUrl: string): Promise<any> {
  const now = Date.now();
  if (financeCache && (now - financeCache.timestamp < CACHE_DURATION)) {
    return financeCache.data;
  }

  try {
    let fetchUrl = (sheetUrl || '').trim();
    if (!fetchUrl) return null;

    if (fetchUrl.includes('docs.google.com/spreadsheets')) {
      if (!fetchUrl.includes('output=csv')) {
        fetchUrl += fetchUrl.includes('?') ? '&output=csv' : '?output=csv';
      }
      // Añadimos cache-buster solo si es necesario
      fetchUrl += `&t=${Math.floor(now / 10000)}`; 
    }

    const response = await fetch(fetchUrl, { method: 'GET', cache: 'default' });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    
    const csvData = await response.text();
    
    // Parseo optimizado: dividimos por líneas y procesamos solo si hay contenido
    const rawLines = csvData.split(/\r?\n/);
    const matrix: string[][] = [];
    
    const delimiter = rawLines[0]?.includes(';') ? ';' : ',';
    const regex = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;
      
      const parts = line.split(regex).map(c => {
        let clean = c.trim();
        if (clean.startsWith('"') && clean.endsWith('"')) {
          clean = clean.substring(1, clean.length - 1);
        }
        return clean;
      });
      matrix.push(parts);
    }

    const colToIndex = (col: string) => {
      let index = 0;
      for (let i = 0; i < col.length; i++) {
        index = index * 26 + (col.charCodeAt(i) - 64);
      }
      return index - 1;
    };

    const getCellValue = (coord: string) => {
      const match = coord.match(/([A-Z]+)(\d+)/);
      if (!match) return "";
      const col = colToIndex(match[1]);
      const row = parseInt(match[2]) - 1;
      return matrix[row]?.[col] || "";
    };

    const result = {
      matrix,
      getCellValue,
      timestamp: now
    };

    financeCache = { data: result, timestamp: now };
    return result;
  } catch (e) {
    console.error("Finance Matrix Critical Error:", e);
    return null;
  }
}
