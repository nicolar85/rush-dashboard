import * as XLSX from 'xlsx';

/**
 * Mappatura colonne basata sui NOMI degli header invece che posizione fissa
 * Questo è più robusto contro cambiamenti nella struttura del file
 */
const HEADER_NAMES_MAPPING = {
  // Identificatori agente
  NUMERO: ['n.', 'numero', 'n', '#'],
  AGENTE: ['agente', 'nome agente', 'agent'],
  SM: ['sm', 'sales manager', 'coordinatore'],
  SE: ['se', 'sales executive'],
  DISTRETTO: ['distretto', 'area'],
  TIPOLOGIA: ['tipologia', 'tipo'],
  
  // Prodotti - Pezzi
  SIM_VOCE_TOTALI: ['sim voce totali', 'voce totale', 'sim voce'],
  SIM_DATI_TOTALI: ['sim dati totali', 'dati totale', 'sim dati'],
  SIM_MNP_VOCE: ['sim mnp voce', 'mnp voce'],
  SIM_MNP_DATI: ['sim mnp dati', 'mnp dati'],
  STATION: ['station'],
  EASY_RENT: ['easy rent'],
  ADSL: ['adsl'],
  OU: ['ou', 'offerte ufficiali'],
  OA: ['oa', 'offerte avanzate'],
  
  // Fatturato per prodotto
  FATTURATO_VOCE: ['fatturato voce'],
  FATTURATO_MNP_VOCE: ['fatturato mnp voce'],
  FATTURATO_DATI: ['fatturato dati'],
  FATTURATO_EASY_RENT: ['fatturato easy rent'],
  FATTURATO_ADSL: ['fatturato adsl'],
  FATTURATO_OU: ['fatturato ou'],
  FATTURATO_OA: ['fatturato oa'],
  FATTURATO_SERVIZI_DIGITALI: ['fatturato servizi digitali'],
  
  // Metriche principali
  FATTURATO_COMPLESSIVO: ['fatturato complessivo', 'fatturato totale'],
  NUOVO_CLIENTE: ['nuovo cliente', 'nuovi clienti'],
  FASTWEB_ENERGIA: ['fastweb energia', 'fastweb'],
  FATTURATO_RUSH: ['fatturato rush', 'inflow rush', 'rush'] // ← COLONNA CORRETTA PER INFLOW
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
    displayDate: `${month}/${year}`,
    sortDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  };
}

/**
 * Trova la riga degli header nel foglio Excel
 */
function findHeaderRow(worksheet) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  
  for (let row = 0; row <= Math.min(15, range.e.r); row++) {
    // Cerca una riga che contenga "agente" in una delle prime 10 colonne
    for (let col = 0; col < Math.min(10, range.e.c); col++) {
      const cellRef = XLSX.utils.encode_cell({r: row, c: col});
      const cell = worksheet[cellRef];
      
      if (cell && cell.v && 
          cell.v.toString().toLowerCase().includes('agente')) {
        return row;
      }
    }
  }
  
  // Default alla riga 4 (indice 4) se non trovato
  return 4;
}

/**
 * Mappa gli header del file Excel alle nostre colonne interne
 */
function mapHeaders(worksheet, headerRow) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  const headerMapping = {};
  const foundHeaders = {};
  const missingHeaders = [];
  
  // Leggi tutti gli header dalla riga
  for (let col = 0; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({r: headerRow, c: col});
    const cell = worksheet[cellRef];
    
    if (cell && cell.v) {
      const headerText = cell.v.toString().toLowerCase().trim();
      const columnLetter = indexToColumn(col);
      
      foundHeaders[columnLetter] = headerText;
      
      // Trova corrispondenza con i nostri mapping
      for (const [internalName, possibleNames] of Object.entries(HEADER_NAMES_MAPPING)) {
        for (const possibleName of possibleNames) {
          if (headerText.includes(possibleName.toLowerCase()) || 
              possibleName.toLowerCase().includes(headerText)) {
            headerMapping[internalName] = columnLetter;
            break;
          }
        }
      }
    }
  }
  
  // Controlla se mancano colonne importanti
  const criticalColumns = [
    'AGENTE', 'SM', 'FATTURATO_COMPLESSIVO', 'FATTURATO_RUSH', 
    'NUOVO_CLIENTE', 'FASTWEB_ENERGIA'
  ];
  
  for (const critical of criticalColumns) {
    if (!headerMapping[critical]) {
      missingHeaders.push(critical);
    }
  }
  
  return {
    mapping: headerMapping,
    foundHeaders,
    missingHeaders,
    hasAnomalies: missingHeaders.length > 0
  };
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
 * Parsa una singola riga di dati agente usando la mappatura dinamica
 */
function parseAgentRow(worksheet, rowIndex, headerMapping) {
  const agent = {};
  
  // Funzione helper per ottenere valore da colonna mappata
  const getColumnValue = (internalName, expectedType = 'auto') => {
    const columnLetter = headerMapping[internalName];
    if (!columnLetter) return expectedType === 'number' ? 0 : '';
    
    const cellRef = XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex(columnLetter)});
    return cleanCellValue(worksheet[cellRef], expectedType);
  };
  
  // Dati base agente
  agent.numero = getColumnValue('NUMERO', 'number');
  agent.nome = getColumnValue('AGENTE', 'string');
  agent.sm = getColumnValue('SM', 'string');
  agent.se = getColumnValue('SE', 'string');
  agent.distretto = getColumnValue('DISTRETTO', 'string');
  agent.tipologia = getColumnValue('TIPOLOGIA', 'string');
  
  // Prodotti - Pezzi
  agent.prodotti = {
    simVoceTotali: getColumnValue('SIM_VOCE_TOTALI', 'number'),
    simDatiTotali: getColumnValue('SIM_DATI_TOTALI', 'number'),
    simMnpVoce: getColumnValue('SIM_MNP_VOCE', 'number'),
    simMnpDati: getColumnValue('SIM_MNP_DATI', 'number'),
    station: getColumnValue('STATION', 'number'),
    easyRent: getColumnValue('EASY_RENT', 'number'),
    adsl: getColumnValue('ADSL', 'number'),
    ou: getColumnValue('OU', 'number'),
    oa: getColumnValue('OA', 'number')
  };
  
  // Fatturati per prodotto
  agent.fatturato = {
    voce: getColumnValue('FATTURATO_VOCE', 'number'),
    mnpVoce: getColumnValue('FATTURATO_MNP_VOCE', 'number'),
    dati: getColumnValue('FATTURATO_DATI', 'number'),
    easyRent: getColumnValue('FATTURATO_EASY_RENT', 'number'),
    adsl: getColumnValue('FATTURATO_ADSL', 'number'),
    ou: getColumnValue('FATTURATO_OU', 'number'),
    oa: getColumnValue('FATTURATO_OA', 'number'),
    serviziDigitali: getColumnValue('FATTURATO_SERVIZI_DIGITALI', 'number')
  };
  
  // Metriche principali
  agent.fatturato.complessivo = getColumnValue('FATTURATO_COMPLESSIVO', 'number');
  agent.nuoviClienti = getColumnValue('NUOVO_CLIENTE', 'number');
  agent.fastwebEnergia = getColumnValue('FASTWEB_ENERGIA', 'number');
  
  // *** FIX IMPORTANTE: Usa FATTURATO_RUSH invece di colonna fissa ***
  agent.inflowTotale = getColumnValue('FATTURATO_RUSH', 'number');
  
  // Calcola totali prodotti
  agent.totaliProdotti = {
    pezziTotali: Object.values(agent.prodotti).reduce((sum, val) => sum + val, 0),
    fatturatoTotale: agent.fatturato.complessivo
  };
  
  return agent;
}

/**
 * Crea una mappatura interattiva per colonne mancanti
 */
function createInteractiveMapping(missingHeaders, foundHeaders) {
  const suggestions = {};
  
  for (const missing of missingHeaders) {
    const possibleNames = HEADER_NAMES_MAPPING[missing] || [];
    const suggestions_for_missing = [];
    
    // Cerca header simili
    for (const [column, headerText] of Object.entries(foundHeaders)) {
      for (const possibleName of possibleNames) {
        const similarity = calculateSimilarity(headerText, possibleName);
        if (similarity > 0.3) { // Soglia di similarità
          suggestions_for_missing.push({
            column,
            headerText,
            similarity
          });
        }
      }
    }
    
    // Ordina per similarità
    suggestions_for_missing.sort((a, b) => b.similarity - a.similarity);
    suggestions[missing] = suggestions_for_missing.slice(0, 3); // Top 3
  }
  
  return suggestions;
}

/**
 * Calcola similarità tra due stringhe (algoritmo semplificato)
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calcola distanza di Levenshtein
 */
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Funzione principale per parsare il file Excel con controllo anomalie
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
    
    // *** NUOVO: Mappa gli header dinamicamente ***
    const headerAnalysis = mapHeaders(worksheet, headerRow);
    
    // Se ci sono anomalie, ritorna info per mappatura manuale
    if (headerAnalysis.hasAnomalies) {
      const suggestions = createInteractiveMapping(
        headerAnalysis.missingHeaders, 
        headerAnalysis.foundHeaders
      );
      
      return {
        success: false,
        needsMapping: true,
        error: 'Alcune colonne non sono state trovate automaticamente',
        details: {
          missingHeaders: headerAnalysis.missingHeaders,
          foundHeaders: headerAnalysis.foundHeaders,
          suggestions: suggestions,
          fileName: file.name,
          dateInfo: dateInfo
        }
      };
    }
    
    // Parsa tutti gli agenti usando la mappatura dinamica
    const agents = [];
    const smStats = new Map();
    
    for (let rowIndex = headerRow + 1; rowIndex <= range.e.r; rowIndex++) {
      // Controlla se la riga ha dati (verifica colonna nome agente)
      const agentNameColumn = headerAnalysis.mapping['AGENTE'];
      if (!agentNameColumn) continue;
      
      const nomeCell = worksheet[XLSX.utils.encode_cell({
        r: rowIndex, 
        c: columnToIndex(agentNameColumn)
      })];
      
      if (!nomeCell || !nomeCell.v || nomeCell.v.toString().trim() === '') {
        continue;
      }
      
      try {
        const agent = parseAgentRow(worksheet, rowIndex, headerAnalysis.mapping);
        
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
        smData.totali.inflow += agent.inflowTotale; // *** FIX: Usa colonna corretta ***
        smData.totali.nuoviClienti += agent.nuoviClienti;
        smData.totali.fastweb += agent.fastwebEnergia;
        smData.totali.pezzi += agent.totaliProdotti.pezziTotali;
        
      } catch (error) {
        console.warn(`Errore nel parsing riga ${rowIndex + 1}:`, error);
      }
    }
    
    // Calcola statistiche generali (FIX: Usa inflowTotale corretto)
    const totali = agents.reduce((acc, agent) => ({
      fatturato: acc.fatturato + agent.fatturato.complessivo,
      inflow: acc.inflow + agent.inflowTotale, // *** FIX ***
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
          dataRows: agents.length,
          headerMapping: headerAnalysis.mapping,
          foundHeaders: headerAnalysis.foundHeaders
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
 * Funzione per applicare mappatura manuale delle colonne
 */
export async function parseExcelFileWithMapping(file, manualMapping) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      cellStyles: true,
      cellFormulas: true,
      cellDates: true,
      cellNF: true,
      sheetStubs: true
    });
    
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const dateInfo = extractDateFromFilename(file.name);
    const headerRow = findHeaderRow(worksheet);
    
    // Usa la mappatura manuale fornita
    return await parseWithCustomMapping(worksheet, dateInfo, headerRow, manualMapping);
    
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

/**
 * Utility per ordinare file per data nel nome (non per data upload)
 */
export function sortFilesByDate(files) {
  return files.sort((a, b) => {
    try {
      const dateA = extractDateFromFilename(a.name);
      const dateB = extractDateFromFilename(b.name);
      return dateB.sortDate.localeCompare(dateA.sortDate); // Più recente per primo
    } catch (error) {
      // Fallback su data upload se non riesce ad estrarre data dal nome
      return new Date(b.uploadDate) - new Date(a.uploadDate);
    }
  });
}

export default {
  parseExcelFile,
  parseExcelFileWithMapping,
  formatCurrency,
  formatNumber,
  calculatePercentageChange,
  sortFilesByDate
};