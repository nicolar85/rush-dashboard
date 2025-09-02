// src/utils/excelParser.js - PARSER COMPLETAMENTE DINAMICO E ROBUSTO

import * as XLSX from 'xlsx';

/**
 * 🎯 MAPPATURA DINAMICA BASATA SUI NOMI DEGLI HEADER
 * Questo sistema cerca le colonne in base al CONTENUTO dell'header, non alla posizione
 */
const DYNAMIC_FIELD_PATTERNS = {
  // Identificatori agente (OBBLIGATORI)
  'AGENTE': {
    patterns: ['nome agente', 'agente', 'nome', 'cognome agente', 'consulente'],
    required: true,
    description: 'Nome/Cognome dell\'agente'
  },
  'SM': {
    patterns: ['sm', 'sales manager', 'coordinatore', 'coord', 'manager'],
    required: true,
    description: 'Sales Manager / Coordinatore'
  },
  
  // Metriche finanziarie (OBBLIGATORIE)
  'FATTURATO_RUSH': {
    patterns: ['fatturato rush', 'fatturato', 'rush fatturato', 'fat rush', 'revenue'],
    required: true,
    description: 'Fatturato Rush dell\'agente'
  },
  'INFLOW': {
    patterns: ['inflow', 'in flow', 'entrate', 'ricavi'],
    required: true,
    description: 'Inflow dell\'agente'
  },
  
  // Prodotti voce (opzionali ma importanti)
  'CASA': {
    patterns: ['casa', 'fisso casa', 'linea casa', 'casa voce'],
    required: false,
    description: 'Contratti Casa/Fisso'
  },
  'BUSINESS': {
    patterns: ['business', 'aziende', 'aziendale', 'biz'],
    required: false,
    description: 'Contratti Business'
  },
  'MOBILE': {
    patterns: ['mobile', 'cellulare', 'sim', 'telefonia mobile'],
    required: false,
    description: 'Contratti Mobile'
  },
  
  // Prodotti dati
  'ADSL': {
    patterns: ['adsl', 'adsl casa', 'internet casa'],
    required: false,
    description: 'Contratti ADSL'
  },
  'FIBRA': {
    patterns: ['fibra', 'ftth', 'fibra ottica', 'fibra casa'],
    required: false,
    description: 'Contratti Fibra'
  },
  'FIBRA_BUSINESS': {
    patterns: ['fibra business', 'fibra aziendale', 'ftth business'],
    required: false,
    description: 'Contratti Fibra Business'
  },
  
  // Prodotti energia
  'LUCE': {
    patterns: ['luce', 'energia elettrica', 'elettricità', 'ee'],
    required: false,
    description: 'Contratti Luce'
  },
  'GAS': {
    patterns: ['gas', 'gas naturale', 'metano'],
    required: false,
    description: 'Contratti Gas'
  },
  
  // Nuovi clienti e station
  'NUOVI_CLIENTI': {
    patterns: ['nuovi clienti', 'nc', 'new customers', 'clienti nuovi'],
    required: false,
    description: 'Nuovi Clienti acquisiti'
  },
  'STATION': {
    patterns: ['station', 'tim station', 'negozi'],
    required: false,
    description: 'Contratti via Station'
  },
  
  // Fastweb
  'FASTWEB_MOBILE': {
    patterns: ['fastweb mobile', 'fw mobile', 'fastweb sim'],
    required: false,
    description: 'Contratti Fastweb Mobile'
  },
  'FASTWEB_CASA': {
    patterns: ['fastweb casa', 'fw casa', 'fastweb fisso'],
    required: false,
    description: 'Contratti Fastweb Casa'
  },
  'FASTWEB_BUSINESS': {
    patterns: ['fastweb business', 'fw business', 'fastweb aziendale'],
    required: false,
    description: 'Contratti Fastweb Business'
  },
  'FASTWEB_ENERGIA': {
    patterns: ['fastweb energia', 'fw energia', 'fastweb luce gas'],
    required: false,
    description: 'Contratti Fastweb Energia'
  },
  
  // Altri campi utili
  'TOTALE_PEZZI': {
    patterns: ['totale pezzi', 'pezzi totali', 'tot pezzi', 'pieces'],
    required: false,
    description: 'Totale contratti/pezzi'
  },
  'NUMERO': {
    patterns: ['n.', 'numero', 'n', '#', 'id'],
    required: false,
    description: 'Numero identificativo'
  }
};

/**
 * 🔍 TROVA LA RIGA HEADER AUTOMATICAMENTE
 * Cerca la riga che contiene più keywords tipiche degli header
 */
function findHeaderRow(worksheet) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  const headerKeywords = ['agente', 'nome', 'fatturato', 'rush', 'sm', 'coordinatore', 'inflow'];
  
  let bestRow = 4; // Default basato sull'analisi precedente
  let bestScore = 0;
  
  // Controlla le prime 10 righe per trovare gli header
  for (let row = 0; row <= Math.min(10, range.e.r); row++) {
    let score = 0;
    let cellCount = 0;
    
    for (let col = 0; col <= Math.min(50, range.e.c); col++) {
      const cellRef = XLSX.utils.encode_cell({r: row, c: col});
      const cell = worksheet[cellRef];
      
      if (cell && cell.v !== undefined && cell.v !== '') {
        cellCount++;
        const cellText = cell.v.toString().toLowerCase();
        
        // Conta quante keywords header sono presenti
        for (const keyword of headerKeywords) {
          if (cellText.includes(keyword)) {
            score += 10;
          }
        }
        
        // Bonus se la cella sembra un header tipico
        if (cellText.length > 3 && cellText.length < 30) {
          score += 1;
        }
      }
    }
    
    // Normalizza il punteggio per il numero di celle
    if (cellCount > 5) { // Deve avere almeno 5 colonne per essere un header valido
      const normalizedScore = score + (cellCount * 0.5);
      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestRow = row;
      }
    }
  }
  
  console.log(`✅ Riga header selezionata: ${bestRow + 1} (score: ${bestScore})`);
  return bestRow;
}

/**
 * 🎯 MAPPATURA INTELLIGENTE CON FUZZY MATCHING
 * Trova le colonne anche con piccole variazioni nei nomi
 */
function createIntelligentMapping(worksheet, headerRow) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  const mapping = {};
  const availableColumns = [];
  const missingColumns = [];
  const warnings = [];
  
  // Estrai tutti gli header disponibili
  const headers = [];
  for (let col = 0; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({r: headerRow, c: col});
    const cell = worksheet[cellRef];
    if (cell && cell.v !== undefined && cell.v !== '') {
      const colLetter = XLSX.utils.encode_col(col);
      const headerText = cell.v.toString().trim();
      headers.push({ col: colLetter, name: headerText, normalized: headerText.toLowerCase() });
      availableColumns.push(`${colLetter}: ${headerText}`);
    }
  }
  
  console.log(`📋 Trovati ${headers.length} header nel file`);
  
  // Mappa ogni campo usando pattern matching intelligente
  for (const [fieldKey, fieldConfig] of Object.entries(DYNAMIC_FIELD_PATTERNS)) {
    let found = false;
    let bestMatch = null;
    let bestScore = 0;
    
    // Cerca match perfetti o parziali
    for (const header of headers) {
      for (const pattern of fieldConfig.patterns) {
        let score = 0;
        
        // Match perfetto
        if (header.normalized === pattern.toLowerCase()) {
          score = 100;
        }
        // Match parziale - contiene il pattern
        else if (header.normalized.includes(pattern.toLowerCase())) {
          score = 80;
        }
        // Match inverso - il pattern contiene l'header
        else if (pattern.toLowerCase().includes(header.normalized)) {
          score = 60;
        }
        // Match fuzzy - parole in comune
        else {
          const headerWords = header.normalized.split(/\s+/);
          const patternWords = pattern.toLowerCase().split(/\s+/);
          const commonWords = headerWords.filter(w => patternWords.includes(w));
          if (commonWords.length > 0) {
            score = (commonWords.length / Math.max(headerWords.length, patternWords.length)) * 40;
          }
        }
        
        if (score > bestScore && score >= 60) {
          bestScore = score;
          bestMatch = header;
        }
      }
    }
    
    if (bestMatch) {
      mapping[fieldKey] = bestMatch.col;
      console.log(`✅ ${fieldKey} → ${bestMatch.col} ("${bestMatch.name}") [score: ${bestScore}]`);
      found = true;
    }
    
    if (!found) {
      if (fieldConfig.required) {
        missingColumns.push({
          field: fieldKey,
          patterns: fieldConfig.patterns,
          required: true,
          description: fieldConfig.description
        });
        console.warn(`❌ OBBLIGATORIO MANCANTE: ${fieldKey}`);
      } else {
        warnings.push({
          field: fieldKey,
          patterns: fieldConfig.patterns,
          required: false,
          description: fieldConfig.description
        });
        console.log(`⚠️  Opzionale mancante: ${fieldKey} (sarà 0)`);
      }
    }
  }
  
  return { 
    mapping, 
    missingColumns, 
    warnings, 
    availableColumns,
    totalColumns: headers.length 
  };
}

/**
 * 📊 PARSING DINAMICO DI UNA RIGA AGENTE
 */
function parseAgentRow(worksheet, row, mapping) {
  const getColumnValue = (fieldKey, expectedType = 'auto') => {
    const column = mapping[fieldKey];
    if (!column) return expectedType === 'number' ? 0 : '';
    
    const cellRef = `${column}${row + 1}`;
    const cell = worksheet[cellRef];
    return cleanCellValue(cell, expectedType);
  };
  
  const agent = {};
  
  // Campi base (obbligatori)
  agent.nome = getColumnValue('AGENTE', 'string');
  agent.sm = getColumnValue('SM', 'string');
  
  // 🔧 FIX: Metriche finanziarie con calcolo corretto
  agent.fatturatoRush = getColumnValue('FATTURATO_RUSH', 'number');
  agent.inflow = getColumnValue('INFLOW', 'number');
  
  // Prodotti voce
  agent.casa = getColumnValue('CASA', 'number');
  agent.business = getColumnValue('BUSINESS', 'number');
  agent.mobile = getColumnValue('MOBILE', 'number');
  
  // Prodotti dati
  agent.adsl = getColumnValue('ADSL', 'number');
  agent.fibra = getColumnValue('FIBRA', 'number');
  agent.fibraBusiness = getColumnValue('FIBRA_BUSINESS', 'number');
  
  // Prodotti energia
  agent.luce = getColumnValue('LUCE', 'number');
  agent.gas = getColumnValue('GAS', 'number');
  
  // Altri
  agent.nuoviClienti = getColumnValue('NUOVI_CLIENTI', 'number');
  agent.station = getColumnValue('STATION', 'number');
  
  // Fastweb
  agent.fastwebMobile = getColumnValue('FASTWEB_MOBILE', 'number');
  agent.fastwebCasa = getColumnValue('FASTWEB_CASA', 'number');
  agent.fastwebBusiness = getColumnValue('FASTWEB_BUSINESS', 'number');
  agent.fastwebEnergia = getColumnValue('FASTWEB_ENERGIA', 'number');
  
  // Altri campi opzionali
  agent.totalePezzi = getColumnValue('TOTALE_PEZZI', 'number');
  agent.numero = getColumnValue('NUMERO', 'string');
  
  // 🔧 FIX: Calcoli derivati corretti
  agent.totaleFastweb = agent.fastwebMobile + agent.fastwebCasa + agent.fastwebBusiness + agent.fastwebEnergia;
  agent.totaleVoce = agent.casa + agent.business + agent.mobile;
  agent.totaleDati = agent.adsl + agent.fibra + agent.fibraBusiness;
  agent.totaleEnergia = agent.luce + agent.gas;
  
  return agent;
}

/**
 * 🛠️ UTILITY FUNCTIONS
 */
function columnToIndex(column) {
  let result = 0;
  for (let i = 0; i < column.length; i++) {
    result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result - 1;
}

function extractDateFromFilename(filename) {
  // Pattern per data nel formato YYYY.MM.DD
  const dateMatch = filename.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!dateMatch) {
    throw new Error('Nome file non valido. Formato atteso: YYYY.MM.DD');
  }
  
  const year = parseInt(dateMatch[1]);
  const month = parseInt(dateMatch[2]);
  const day = parseInt(dateMatch[3]);
  
  return {
    year,
    month,
    day,
    dateString: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`,
    displayDate: `${month}/${year}`
  };
}

function cleanCellValue(cell, expectedType = 'auto') {
  if (!cell || cell.v === undefined || cell.v === null || cell.v === '') {
    return expectedType === 'number' ? 0 : '';
  }
  
  let value = cell.v;
  
  if (expectedType === 'number') {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Rimuovi simboli di valuta e separatori
      value = value.toString().replace(/[€$,.\s]/g, '').replace(',', '.');
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
  
  if (expectedType === 'string') {
    return value.toString().trim();
  }
  
  // Auto-detect
  if (typeof value === 'number') return value;
  return value.toString().trim();
}

/**
 * 💰 UTILITY FUNCTIONS - Formattazione e Ordinamento
 */
export function formatCurrency(value) {
  if (!value || isNaN(value)) return '€0';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(value) {
  if (!value || isNaN(value)) return '0';
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * 📅 ORDINAMENTO FILE PER DATA NEL NOME (non data upload)
 */
export function sortFilesByDate(files) {
  return [...files].sort((a, b) => {
    try {
      // Estrai la data dal nome del file o usa la proprietà date
      const dateA = a.date || extractDateFromFilename(a.name).dateString;
      const dateB = b.date || extractDateFromFilename(b.name).dateString;
      
      // Ordina dal più recente al più vecchio
      return new Date(dateB) - new Date(dateA);
    } catch (error) {
      console.warn('Errore nell\'ordinamento dei file:', error);
      // Fallback: ordina per nome
      return b.name.localeCompare(a.name);
    }
  });
}

/**
 * 🚀 PARSING PRINCIPALE - DINAMICO E INTELLIGENTE
 */
export async function parseExcelFile(file, userMapping = null) {
  try {
    console.log('🔄 Inizio parsing dinamico:', file.name);
    
    // Estrai data dal nome file
    const dateInfo = extractDateFromFilename(file.name);
    console.log('📅 Data estratta:', dateInfo);
    
    // Leggi il file Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    if (!workbook.SheetNames.length) {
      throw new Error('Il file Excel non contiene fogli di lavoro');
    }
    
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    console.log('📊 Foglio selezionato:', workbook.SheetNames[0]);
    
    // 🔍 Trova automaticamente la riga header
    const headerRow = findHeaderRow(worksheet);
    
    // 🧠 Crea mappatura intelligente
    const { mapping, missingColumns, warnings, availableColumns, totalColumns } = 
      createIntelligentMapping(worksheet, headerRow);
    
    console.log('🎯 Mappatura creata:', Object.keys(mapping).length, 'campi mappati');
    console.log('⚠️ Campi mancanti obbligatori:', missingColumns.length);
    console.log('💡 Campi opzionali mancanti:', warnings.length);
    
    // 🚨 CONTROLLO ERRORI CRITICI
    if (missingColumns.length > 0) {
      const criticalMissing = missingColumns.map(c => c.field).join(', ');
      console.error('❌ CAMPI OBBLIGATORI MANCANTI:', criticalMissing);
      
      return {
        success: false,
        needsMapping: true,
        error: `Campi obbligatori mancanti: ${criticalMissing}`,
        missingColumns,
        availableColumns,
        totalColumns
      };
    }
    
    // Parsa i dati
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const agents = [];
    const smStats = new Map();
    
    console.log('🏁 Parsing righe da', headerRow + 1, 'a', range.e.r);
    
    for (let row = headerRow + 1; row <= range.e.r; row++) {
      try {
        // Controlla se la riga ha dati (colonna agente)
        const agentCol = mapping['AGENTE'];
        if (!agentCol) continue;
        
        const agentCell = worksheet[XLSX.utils.encode_cell({r: row, c: columnToIndex(agentCol)})];
        if (!agentCell || !agentCell.v || agentCell.v.toString().trim() === '') {
          continue;
        }
        
        // Parsa la riga
        const agent = parseAgentRow(worksheet, row, mapping);
        
        // Validazione
        if (!agent.nome || agent.nome.trim() === '') continue;
        if (!agent.sm || agent.sm.trim() === '') continue;
        
        agents.push(agent);
        
        // Accumula statistiche SM
        if (!smStats.has(agent.sm)) {
          smStats.set(agent.sm, {
            nome: agent.sm,
            agenti: [],
            fatturatoTotale: 0,
            inflowTotale: 0,
            nuoviClienti: 0,
            totaleFastweb: 0
          });
        }
        
        const smData = smStats.get(agent.sm);
        smData.agenti.push(agent);
        smData.fatturatoTotale += agent.fatturatoRush;
        smData.inflowTotale += agent.inflow;
        smData.nuoviClienti += agent.nuoviClienti;
        smData.totaleFastweb += agent.totaleFastweb;
        
      } catch (error) {
        console.warn(`Errore riga ${row + 1}:`, error);
        continue;
      }
    }
    
    console.log(`✅ Parsing completato: ${agents.length} agenti trovati`);
    
    // 🔧 FIX: Calcola i totali CORRETTI
    const totals = agents.reduce((acc, agent) => {
      acc.totalRevenue += agent.fatturatoRush;
      acc.totalInflow += agent.inflow;
      acc.totalNewClients += agent.nuoviClienti;
      acc.totalFastweb += agent.totaleFastweb;
      return acc;
    }, {
      totalRevenue: 0,
      totalInflow: 0,
      totalNewClients: 0,
      totalFastweb: 0
    });
    
    console.log('💰 Totali calcolati:', {
      fatturato: formatCurrency(totals.totalRevenue),
      inflow: formatCurrency(totals.totalInflow),
      nuoviClienti: totals.totalNewClients,
      fastweb: totals.totalFastweb
    });
    
    // Struttura risultato
    const result = {
      success: true,
      data: {
        agents,
        smData: Array.from(smStats.values()),
        fileInfo: {
          name: file.name,
          dateInfo,
          parsedRows: agents.length,
          headerRow: headerRow + 1,
          totalColumns
        },
        metadata: {
          totalAgents: agents.length,
          totalSMs: smStats.size,
          totalRevenue: totals.totalRevenue,
          totalInflow: totals.totalInflow,
          totalNewClients: totals.totalNewClients,
          totalFastweb: totals.totalFastweb,
          dateInfo,
          warnings: warnings.length > 0 ? warnings : null
        }
      }
    };
    
    console.log('🎉 Parsing completato con successo!');
    return result;
    
  } catch (error) {
    console.error('❌ Errore parsing:', error);
    return {
      success: false,
      error: error.message
    };
  }
}