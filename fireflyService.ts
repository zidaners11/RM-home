
/**
 * Nexus Finance Sync Engine v13.0 - Soporte de Mapeo por Coordenadas
 */

export interface SheetMatrix {
  raw: string[][];
  getCell: (coord: string) => string;
  getRange: (range: string) => string[];
}

export async function fetchFinanceFromSheets(sheetUrl: string) {
  try {
    let fetchUrl = (sheetUrl || '').trim();
    if (!fetchUrl) return null;

    if (fetchUrl.includes('docs.google.com/spreadsheets')) {
      if (!fetchUrl.includes('output=csv')) {
        fetchUrl += fetchUrl.includes('?') ? '&output=csv' : '?output=csv';
      }
      fetchUrl += `&t=${Date.now()}`;
    }

    const response = await fetch(fetchUrl, { method: 'GET', mode: 'cors', cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    
    const csvData = await response.text();
    const lines = csvData.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return null;

    const delimiter = lines[0].includes(';') ? ';' : ',';
    
    // Convertimos el CSV en una matriz real [fila][columna]
    const matrix: string[][] = lines.map(line => {
      const regex = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
      return line.split(regex).map(c => c.replace(/"/g, '').trim());
    });

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

    const getRangeValues = (range: string) => {
      const [start, end] = range.split(':');
      const startMatch = start.match(/([A-Z]+)(\d+)/);
      const endMatch = end.match(/([A-Z]+)(\d+)/);
      if (!startMatch || !endMatch) return [];

      const startCol = colToIndex(startMatch[1]);
      const startRow = parseInt(startMatch[2]) - 1;
      const endCol = colToIndex(endMatch[1]);
      const endRow = parseInt(endMatch[2]) - 1;

      const results = [];
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          results.push(matrix[r]?.[c] || "");
        }
      }
      return results;
    };

    return {
      matrix,
      getCellValue,
      getRangeValues,
      // Mantenemos compatibilidad con el sistema anterior si es necesario
      oldFormat: {
         transactions: [], // Se puede recrear si es necesario
         budgets: [],
         summaries: []
      }
    };
  } catch (e) {
    console.error("Finance Matrix Error:", e);
    return null;
  }
}
