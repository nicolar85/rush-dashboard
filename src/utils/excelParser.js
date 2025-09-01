import * as XLSX from 'xlsx';

// Definisce i nomi delle intestazioni che ci aspettiamo di trovare nel file Excel.
// La chiave è il nome interno che usiamo nel codice (es. 'nome').
// Il valore è un array di possibili nomi di colonna nel file (case-insensitive).
const EXPECTED_HEADERS = {
  // Dati Anagrafici
  numero: ['N', 'NUMERO', 'N.'],
  nome: ['AGENTE', 'NOME AGENTE'],
  sm: ['SM', 'SALES MANAGER', 'COORDINATORE'],
  se: ['SE', 'SALES EXECUTIVE'],
  distretto: ['DISTRETTO'],
  supportoPE: ['SUPPORTO PE'],
  tipologia: ['TIPOLOGIA', 'TIPOLOGIA AGENTE'],

  // Prodotti (Pezzi)
  simVoceTotali: ['SIM VOCE TOTALI', 'SIM VOCE'],
  simDatiTotali: ['SIM DATI TOTALI', 'SIM DATI'],
  simMnpVoce: ['SIM MNP VOCE', 'MNP VOCE'],
  simMnpDati: ['SIM MNP DATI', 'MNP DATI'],
  station: ['STATION', 'FW STATION'],
  easyRent: ['EASY RENT'],
  adsl: ['ADSL', 'CONNESSIONE'],
  ou: ['OU'],
  oa: ['OA'],
  easyComplexDeal: ['EASY COMPLEX DEAL'],

  // Prodotti (Fatturato)
  fatturatoVoce: ['FATTURATO VOCE'],
  fatturatoMnpVoce: ['FATTURATO MNP VOCE'],
  fatturatoDati: ['FATTURATO DATI'],
  fatturatoEasyRent: ['FATTURATO EASY RENT'],
  fatturatoAdsl: ['FATTURATO ADSL'],
  fatturatoOu: ['FATTURATO OU'],
  fatturatoOa: ['FATTURATO OA'],
  fatturatoInterniOa: ['FATTURATO INTERNI OA'],
  fatturatoEasyComplex: ['FATTURATO EASY COMPLEX'],
  fatturatoAltro: ['FATTURATO ALTRO'],
  fatturatoServiziDigitali: ['FATTURATO SERVIZI DIGITALI'],
  fatturatoCustom: ['FATTURATO CUSTOM'],

  // Metriche Principali
  fatturatoComplessivo: ['FATTURATO COMPLESSIVO', 'FATTURATO TOTALE'],
  nuoviClienti: ['NUOVO CLIENTE', 'NUOVI CLIENTI'],
  fastwebEnergia: ['FASTWEB ENERGIA', 'ENERGIA'],
  inflowTotale: ['FATTURATO RUSH', 'INFLOW TOTALE', 'INFLOW'],
};

// Campi obbligatori per un'analisi valida. Se mancano, verrà chiesta la mappatura manuale.
const REQUIRED_FIELDS = ['nome', 'fatturatoComplessivo'];


/**
 * Converte una colonna Excel (es. 'AK') in indice numerico (base 0).
 */
function columnToIndex(column) {
  if (!column) return -1;
  let result = 0;
  for (let i = 0; i < column.length; i++) {
    result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result - 1;
}

/**
 * Crea una mappa dinamica delle colonne leggendo l'intestazione del foglio.
 * @param {object} worksheet - Il foglio di lavoro di XLSX.
 * @param {number} headerRow - L'indice della riga di intestazione.
 * @returns {object} - Un oggetto con la mappa delle colonne e le intestazioni trovate.
 */
function createColumnMap(worksheet, headerRow) {
  const columnMap = {}; // { nome: 'C', sm: 'D', ... }
  const foundHeaders = {}; // { C: 'Agente', D: 'SM', ... }
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

  for (let c = range.s.c; c <= range.e.c; c++) {
    const colLetter = XLSX.utils.encode_col(c);
    const cellRef = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = worksheet[cellRef];

    if (cell && cell.v) {
      const headerText = cell.v.toString().trim();
      foundHeaders[colLetter] = headerText;

      // Cerca una corrispondenza nei nostri header attesi
      const normalizedHeaderText = headerText.toUpperCase();
      for (const [internalKey, possibleNames] of Object.entries(EXPECTED_HEADERS)) {
        if (possibleNames.includes(normalizedHeaderText)) {
          columnMap[internalKey] = colLetter;
          break; // Trovato, passa alla prossima colonna
        }
      }
    }
  }
  return { columnMap, foundHeaders };
}


/**
 * Estrae la data dal nome del file (es. report_YYYY.MM.DD.xlsx)
 */
function extractDateFromFilename(filename) {
    const dateMatch = filename.match(/(\d{4})\.(\d{2})\.(\d{2})/);
    if (!dateMatch) {
      // Se non trova il formato, restituisce la data odierna come fallback
      const today = new Date();
      return {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
        dateString: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
        displayDate: `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`,
        error: 'Formato data non trovato nel nome file, usata data odierna.'
      };
    }
    const [, year, month, day] = dateMatch;
    return {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      dateString: `${year}-${String(month).padStart(2, '0')}`,
      displayDate: `${String(month).padStart(2, '0')}/${year}`
    };
}


/**
 * Trova la riga degli header nel foglio Excel cercando una colonna chiave.
 */
function findHeaderRow(worksheet) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  const searchKey = 'AGENTE'; // Cerchiamo la colonna "AGENTE" per identificare l'header

  for (let r = 0; r <= Math.min(10, range.e.r); r++) {
    for (let c = range.s.c; c <= Math.min(20, range.e.c); c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellRef];
        if (cell && cell.v && cell.v.toString().trim().toUpperCase() === searchKey) {
            return r; // Restituisce l'indice della riga trovata
        }
    }
  }
  return 4; // Default alla riga 5 (indice 4) se non trovato
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
      value = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  if (expectedType === 'string') {
    return value.toString().trim();
  }
  
  if (typeof value === 'number') return value;
  return value.toString().trim();
}


/**
 * Estrae il valore da una cella usando la mappa delle colonne.
 */
function getValue(worksheet, rowIndex, columnMap, fieldName, type) {
    const col = columnMap[fieldName];
    if (!col) return type === 'number' ? 0 : '';

    const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnToIndex(col) })];
    return cleanCellValue(cell, type);
}


/**
 * Parsa una singola riga di dati agente usando la mappa dinamica delle colonne.
 */
function parseAgentRow(worksheet, rowIndex, columnMap) {
  const agent = {};
  
  // Dati base agente
  agent.numero = getValue(worksheet, rowIndex, columnMap, 'numero', 'number');
  agent.nome = getValue(worksheet, rowIndex, columnMap, 'nome', 'string');
  agent.sm = getValue(worksheet, rowIndex, columnMap, 'sm', 'string');
  agent.se = getValue(worksheet, rowIndex, columnMap, 'se', 'string');
  agent.distretto = getValue(worksheet, rowIndex, columnMap, 'distretto', 'string');
  agent.tipologia = getValue(worksheet, rowIndex, columnMap, 'tipologia', 'string');

  // Prodotti - Pezzi
  agent.prodotti = {
    simVoceTotali: getValue(worksheet, rowIndex, columnMap, 'simVoceTotali', 'number'),
    simDatiTotali: getValue(worksheet, rowIndex, columnMap, 'simDatiTotali', 'number'),
    simMnpVoce: getValue(worksheet, rowIndex, columnMap, 'simMnpVoce', 'number'),
    simMnpDati: getValue(worksheet, rowIndex, columnMap, 'simMnpDati', 'number'),
    station: getValue(worksheet, rowIndex, columnMap, 'station', 'number'),
    easyRent: getValue(worksheet, rowIndex, columnMap, 'easyRent', 'number'),
    adsl: getValue(worksheet, rowIndex, columnMap, 'adsl', 'number'),
    ou: getValue(worksheet, rowIndex, columnMap, 'ou', 'number'),
    oa: getValue(worksheet, rowIndex, columnMap, 'oa', 'number'),
  };

  // Fatturati per prodotto
  agent.fatturato = {
    voce: getValue(worksheet, rowIndex, columnMap, 'fatturatoVoce', 'number'),
    mnpVoce: getValue(worksheet, rowIndex, columnMap, 'fatturatoMnpVoce', 'number'),
    dati: getValue(worksheet, rowIndex, columnMap, 'fatturatoDati', 'number'),
    easyRent: getValue(worksheet, rowIndex, columnMap, 'fatturatoEasyRent', 'number'),
    adsl: getValue(worksheet, rowIndex, columnMap, 'fatturatoAdsl', 'number'),
    ou: getValue(worksheet, rowIndex, columnMap, 'fatturatoOu', 'number'),
    oa: getValue(worksheet, rowIndex, columnMap, 'fatturatoOa', 'number'),
    serviziDigitali: getValue(worksheet, rowIndex, columnMap, 'fatturatoServiziDigitali', 'number'),
  };

  // Metriche principali
  agent.fatturato.complessivo = getValue(worksheet, rowIndex, columnMap, 'fatturatoComplessivo', 'number');
  agent.nuoviClienti = getValue(worksheet, rowIndex, columnMap, 'nuoviClienti', 'number');
  agent.fastwebEnergia = getValue(worksheet, rowIndex, columnMap, 'fastwebEnergia', 'number');
  agent.inflowTotale = getValue(worksheet, rowIndex, columnMap, 'inflowTotale', 'number');

  // Calcola totali
  agent.totaliProdotti = {
    pezziTotali: Object.values(agent.prodotti).reduce((sum, val) => sum + val, 0),
    fatturatoTotale: agent.fatturato.complessivo
  };

  return agent;
}

/**
 * Funzione principale per parsare il file Excel
 */
export async function parseExcelFile(file, manualMapping = {}) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    if (!workbook.SheetNames.length) throw new Error('Il file Excel non contiene fogli');
    
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const dateInfo = extractDateFromFilename(file.name);
    const headerRow = findHeaderRow(worksheet);

    // Crea la mappa delle colonne
    let { columnMap, foundHeaders } = createColumnMap(worksheet, headerRow);

    // Applica eventuali mappature manuali fornite dall'utente
    Object.assign(columnMap, manualMapping);

    // Controlla se mancano campi obbligatori
    const missingFields = REQUIRED_FIELDS.filter(field => !columnMap[field]);
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Mancano colonne obbligatorie: ${missingFields.join(', ')}`,
        needsMapping: true,
        data: {
          fileInfo: { name: file.name },
          missingFields: missingFields,
          availableHeaders: foundHeaders,
          expectedHeaders: EXPECTED_HEADERS
        }
      };
    }

    // Parsa tutti gli agenti
    const agents = [];
    const smStats = new Map();
    
    for (let rowIndex = headerRow + 1; rowIndex <= range.e.r; rowIndex++) {
      const agentNameValue = getValue(worksheet, rowIndex, columnMap, 'nome', 'string');
      if (!agentNameValue || agentNameValue.trim() === '') {
        continue; // Salta righe vuote
      }
      
      try {
        const agent = parseAgentRow(worksheet, rowIndex, columnMap);
        if (!agent.nome || agent.nome.length < 2) continue;
        
        agents.push(agent);
        
        // Aggiorna statistiche SM
        const smKey = agent.sm || 'Senza SM';
        if (!smStats.has(smKey)) {
          smStats.set(smKey, {
            nome: smKey,
            agenti: [],
            totali: { fatturato: 0, inflow: 0, nuoviClienti: 0, fastweb: 0, pezzi: 0 }
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
    
    const totali = agents.reduce((acc, agent) => ({
      fatturato: acc.fatturato + agent.fatturato.complessivo,
      inflow: acc.inflow + agent.inflowTotale,
      nuoviClienti: acc.nuoviClienti + agent.nuoviClienti,
      fastweb: acc.fastweb + agent.fastwebEnergia,
      pezzi: acc.pezzi + agent.totaliProdotti.pezziTotali
    }), { fatturato: 0, inflow: 0, nuoviClienti: 0, fastweb: 0, pezzi: 0 });
    
    const smRanking = Array.from(smStats.values()).sort((a, b) => b.totali.fatturato - a.totali.fatturato);
    
    return {
      success: true,
      data: {
        fileInfo: { name: file.name, size: file.size, dateInfo, parseDate: new Date().toISOString() },
        agents: agents.sort((a, b) => b.fatturato.complessivo - a.fatturato.complessivo),
        smRanking,
        totali,
        metadata: { totalAgents: agents.length, totalSMs: smStats.size, headerRow, dataRows: agents.length }
      }
    };
    
  } catch (error) {
    return { success: false, error: error.message, details: error };
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