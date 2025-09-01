import * as XLSX from 'xlsx';

// Mapping delle colonne basato sull'analisi del file
const COLUMN_MAPPING = {
  // Colonne base
  N: 'B',           // Numero progressivo
  AGENTE: 'C',      // Nome agente
  SM: 'D',          // Sales Manager (Coordinatore)
  SE: 'E',          // Sales Executive  
  DISTRETTO: 'F',   // Distretto
  SUPPORTO_PE: 'G', // Supporto PE
  TIPOLOGIA: 'H',   // Tipologia agente
  
  // Prodotti SIM
  SIM_VOCE_TOTALI: 'I',
  SIM_DATI_TOTALI: 'J',
  SIM_MNP_VOCE: 'K',
  SIM_MNP_DATI: 'L',
  
  // Altri prodotti
  STATION: 'M',
  EASY_RENT: 'N',
  ADSL: 'O',
  OU: 'P',
  OA: 'Q',
  EASY_COMPLEX_DEAL: 'R',
  
  // Fatturato per prodotto
  FATTURATO_VOCE: 'Y',
  FATTURATO_MNP_VOCE: 'Z',
  FATTURATO_DATI: 'AA',
  FATTURATO_EASY_RENT: 'AB',
  FATTURATO_ADSL: 'AC',
  FATTURATO_OU: 'AD',
  FATTURATO_OA: 'AE',
  FATTURATO_INTERNI_OA: 'AF',
  FATTURATO_EASY_COMPLEX: 'AG',
  FATTURATO_ALTRO: 'AH',
  FATTURATO_SERVIZI_DIGITALI: 'AI',
  FATTURATO_CUSTOM: 'AJ',
  
  // Metriche principali
  FATTURATO_COMPLESSIVO: 'AK', // Colonna principale per fatturato
  NUOVO_CLIENTE: 'BD',         // Nuovi clienti
  FASTWEB_ENERGIA: 'BC',       // Contratti Fastweb
  FATTURATO_RUSH: 'BI'         // Inflow totale
};

/**
 * Converte una colonna Excel (es. 'AK') in indice numerico
 */
function columnToIndex(column) {
  let result = 0;
  for (let i = 0; i < column.length; i++) {
    result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result - 1;
}

/**
 * Converte un indice numerico in colonna Excel (es. 36 -> 'AK')
 */
function indexToColumn(index) {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode((index % 26) + 'A'.charCodeAt(0)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}

/**
 * Estrae la data dal nome del file
 */
function extractDateFromFilename(filename) {
  const dateMatch = filename.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!dateMatch) {
    throw new Error('Nome file non valido. Formato atteso: YYYY.MM.DD');
  }
  
  const [, year, month, day] = dateMatch;
  return {
    year: parseInt(year),
    month: parseInt(month),
    day: parseInt(day),
    dateString: `${year}-${month.padStart(2, '0')}`,
    displayDate: `${month}/${year}`
  };
}

/**
 * Trova la riga degli header nel foglio Excel
 */
function findHeaderRow(worksheet) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  
  for (let row = 0; row <= Math.min(10, range.e.r); row++) {
    const cellRef = XLSX.utils.encode_cell({r: row, c: columnToIndex('C')});
    const cell = worksheet[cellRef];
    
    if (cell && cell.v && cell.v.toString().toLowerCase().includes('agente')) {
      return row;
    }
  }
  
  // Default alla riga 4 (indice 4) se non trovato
  return 4;
}

/**
 * Pulisce e normalizza i valori delle celle
 */
function cleanCellValue(cell, expectedType = 'auto') {
  if (!cell || cell.v === undefined || cell.v === null) {
    return expectedType === 'number' ? 0 : '';
  }
  
  let value = cell.v;
  
  if (expectedType === 'number') {
    if (typeof value === 'string') {
      // Rimuovi caratteri non numerici eccetto punto e virgola
      value = value.replace(/[^\d.,-]/g, '');
      // Sostituisci virgola con punto per decimali
      value = value.replace(',', '.');
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  if (expectedType === 'string') {
    return value.toString().trim();
  }
  
  // Auto-detect
  if (typeof value === 'number') {
    return value;
  }
  
  return value.toString().trim();
}

/**
 * Parsa una singola riga di dati agente
 */
function parseAgentRow(worksheet, rowIndex, headerRow) {
  const agent = {};
  
  // Dati base agente
  agent.numero = cleanCellValue(
    worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('B')})], 
    'number'
  );
  
  agent.nome = cleanCellValue(
    worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('C')})], 
    'string'
  );
  
  agent.sm = cleanCellValue(
    worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('D')})], 
    'string'
  );
  
  agent.se = cleanCellValue(
    worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('E')})], 
    'string'
  );
  
  agent.distretto = cleanCellValue(
    worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('F')})], 
    'string'
  );
  
  agent.tipologia = cleanCellValue(
    worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('H')})], 
    'string'
  );
  
  // Prodotti - Pezzi
  agent.prodotti = {
    simVoceTotali: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('I')})], 
      'number'
    ),
    simDatiTotali: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('J')})], 
      'number'
    ),
    simMnpVoce: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('K')})], 
      'number'
    ),
    simMnpDati: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('L')})], 
      'number'
    ),
    station: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('M')})], 
      'number'
    ),
    easyRent: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('N')})], 
      'number'
    ),
    adsl: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('O')})], 
      'number'
    ),
    ou: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('P')})], 
      'number'
    ),
    oa: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('Q')})], 
      'number'
    )
  };
  
  // Fatturati per prodotto
  agent.fatturato = {
    voce: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('Y')})], 
      'number'
    ),
    mnpVoce: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('Z')})], 
      'number'
    ),
    dati: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('AA')})], 
      'number'
    ),
    easyRent: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('AB')})], 
      'number'
    ),
    adsl: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('AC')})], 
      'number'
    ),
    ou: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('AD')})], 
      'number'
    ),
    oa: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('AE')})], 
      'number'
    ),
    serviziDigitali: cleanCellValue(
      worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('AI')})], 
      'number'
    )
  };
  
  // Metriche principali
  agent.fatturato.complessivo = cleanCellValue(
    worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('AK')})], 
    'number'
  );
  
  agent.nuoviClienti = cleanCellValue(
    worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('BD')})], 
    'number'
  );
  
  agent.fastwebEnergia = cleanCellValue(
    worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('BC')})], 
    'number'
  );
  
  agent.inflowTotale = cleanCellValue(
    worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('BI')})], 
    'number'
  );
  
  // Calcola totali prodotti
  agent.totaliProdotti = {
    pezziTotali: Object.values(agent.prodotti).reduce((sum, val) => sum + val, 0),
    fatturatoTotale: agent.fatturato.complessivo
  };
  
  return agent;
}

/**
 * Funzione principale per parsare il file Excel
 */
export async function parseExcelFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      cellStyles: true,
      cellFormulas: true,
      cellDates: true,
      cellNF: true,
      sheetStubs: true
    });
    
    if (workbook.SheetNames.length === 0) {
      throw new Error('Il file Excel non contiene fogli');
    }
    
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    // Estrai informazioni dal nome file
    const dateInfo = extractDateFromFilename(file.name);
    
    // Trova la riga degli header
    const headerRow = findHeaderRow(worksheet);
    
    // Parsa tutti gli agenti
    const agents = [];
    const smStats = new Map();
    
    for (let rowIndex = headerRow + 1; rowIndex <= range.e.r; rowIndex++) {
      // Controlla se la riga ha dati (verifica colonna nome agente)
      const nomeCell = worksheet[XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex('C')})];
      
      if (!nomeCell || !nomeCell.v || nomeCell.v.toString().trim() === '') {
        continue;
      }
      
      try {
        const agent = parseAgentRow(worksheet, rowIndex, headerRow);
        
        // Salta agenti con nome vuoto o invalido
        if (!agent.nome || agent.nome.length < 2) {
          continue;
        }
        
        agents.push(agent);
        
        // Aggiorna statistiche SM
        const smKey = agent.sm || 'Senza SM';
        if (!smStats.has(smKey)) {
          smStats.set(smKey, {
            nome: smKey,
            agenti: [],
            totali: {
              fatturato: 0,
              inflow: 0,
              nuoviClienti: 0,
              fastweb: 0,
              pezzi: 0
            }
          });
        }
        
        const smData = smStats.get(smKey);
        smData.agenti.push(agent);
        smData.totali.fatturato += agent.fatturato.complessivo;
        smData.totali.inflow += agent.inflowTotale;
        smData.totali.nuoviClienti += agent.nuoviClienti;
        smData.totali.fastweb += agent.fastwebEnergia;
        smData.totali.pezzi += agent.totaliProdotti.pezziTotali;
        
      } catch (error) {
        console.warn(`Errore nel parsing riga ${rowIndex + 1}:`, error);
      }
    }
    
    // Calcola statistiche generali
    const totali = agents.reduce((acc, agent) => ({
      fatturato: acc.fatturato + agent.fatturato.complessivo,
      inflow: acc.inflow + agent.inflowTotale,
      nuoviClienti: acc.nuoviClienti + agent.nuoviClienti,
      fastweb: acc.fastweb + agent.fastwebEnergia,
      pezzi: acc.pezzi + agent.totaliProdotti.pezziTotali
    }), { fatturato: 0, inflow: 0, nuoviClienti: 0, fastweb: 0, pezzi: 0 });
    
    // Converti smStats in array e ordina per fatturato
    const smRanking = Array.from(smStats.values())
      .sort((a, b) => b.totali.fatturato - a.totali.fatturato);
    
    return {
      success: true,
      data: {
        fileInfo: {
          name: file.name,
          size: file.size,
          dateInfo,
          parseDate: new Date().toISOString()
        },
        agents: agents.sort((a, b) => b.fatturato.complessivo - a.fatturato.complessivo),
        smRanking,
        totali,
        metadata: {
          totalAgents: agents.length,
          totalSMs: smStats.size,
          headerRow,
          dataRows: agents.length
        }
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
}

/**
 * Utility per formattare valori monetari
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
}

/**
 * Utility per formattare numeri
 */
export function formatNumber(value) {
  return new Intl.NumberFormat('it-IT').format(value || 0);
}

/**
 * Utility per calcolare la variazione percentuale
 */
export function calculatePercentageChange(current, previous) {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

export default {
  parseExcelFile,
  formatCurrency,
  formatNumber,
  calculatePercentageChange
};