import Papa from 'papaparse';
import { SupplyChainRow, calculateProjections, getCurrentWeek } from './supplyChainLogic';

const GOOGLE_SHEETS_BASE_URL = "https://docs.google.com/spreadsheets/d/1fQd9xCRT0LE6WFmphoSFvdxfWhbhlSMopijREGOT79I/export?format=csv";

function parseNumber(value: string | undefined): number {
  if (!value || value === '-' || value === '$-') return 0;
  // Remove currency symbols, commas, and trim
  const cleanVal = value.replace(/[\$,]/g, '').trim();
  const num = parseFloat(cleanVal);
  return isNaN(num) ? 0 : num;
}

export async function fetchSupplyChainData(gid: string = '0'): Promise<SupplyChainRow[]> {
  const currentWeek = getCurrentWeek();

  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`${GOOGLE_SHEETS_BASE_URL}&gid=${gid}&t=${timestamp}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Google Sheets: ${response.statusText}`);
    }

    const csvText = await response.text();
    
    // Parse CSV
    const result = Papa.parse<string[]>(csvText, {
      header: false,
      skipEmptyLines: true,
    });

    const rows = result.data;
    if (rows.length < 2) return [];

    const supplyChainData: SupplyChainRow[] = [];

    // Start from row 1 (index 1) to skip header
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[0]) continue; // Skip empty rows

      // Parse SKU Info
      const skuInfo = {
        sku: r[0],
        description: r[2] || '',
        supplier: r[3] || '',
        buyer: r[4] || '',
        paymentTerms: r[5] || '',
        paymentDays: parseNumber(r[6]),
        moq: parseNumber(r[7]),
        leadTimeWeeks: Math.ceil(parseNumber(r[8]) / 7), // Convert days to weeks roughly
        uom: r[9] || '',
        unitPrice: parseNumber(r[10]),
        minSafetyStock: parseNumber(r[19]), // From Week N Min/Optimo
        maxOptimalStock: parseNumber(r[21]), // From Week N Max/Optimo
        category: r[73] || 'Sin Categoría',
        status: r[74] || 'ACTIVO', // Default to ACTIVO if column missing temporarily
      };

      if (skuInfo.status.toUpperCase().trim() !== 'ACTIVO') {
        continue;
      }

      // Extract Weekly Inputs
      // N
      const reqN = parseNumber(r[11]);
      const initInvN = parseNumber(r[12]);
      const receiptsN = parseNumber(r[14]);
      const preAuthN = parseNumber(r[22]);
      
      // N+1
      const reqN1 = parseNumber(r[24]);
      const preAuthN1 = parseNumber(r[32]);
      
      // N+2
      const reqN2 = parseNumber(r[34]);
      const preAuthN2 = parseNumber(r[42]);
      
      // N+3
      const reqN3 = parseNumber(r[44]);
      const preAuthN3 = parseNumber(r[52]);
      
      // N+4
      const reqN4 = parseNumber(r[54]);
      const preAuthN4 = parseNumber(r[62]);
      
      // N+5
      const reqN5 = parseNumber(r[64]);
      const preAuthN5 = parseNumber(r[72]);

      const weeklyRequirements = [reqN, reqN1, reqN2, reqN3, reqN4, reqN5];
      const preAuthPurchases = [preAuthN, preAuthN1, preAuthN2, preAuthN3, preAuthN4, preAuthN5];

      // Use our engine to project based on the raw inputs from the sheet
      const row = calculateProjections(
        skuInfo,
        initInvN,
        weeklyRequirements,
        receiptsN,
        preAuthPurchases,
        currentWeek
      );

      supplyChainData.push(row);
    }

    return supplyChainData;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}
