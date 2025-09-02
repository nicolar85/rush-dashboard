import * as XLSX from 'xlsx';

/**
 * 🧠 MAPPATURA DINAMICA E FLESSIBILE
 * Usa pattern matching intelligente per gestire variazioni nei file
 */
const DYNAMIC_FIELD_PATTERNS = {
  // Identificatori agente - Sempre fissi
  NUMERO: {
    patterns: ['n.', 'numero', 'n', '#'],
    required: true,
    type: 'number'
  },
  AGENTE: {
    patterns: ['agente', 'nome agente', 'agent'],
    required: true,
    type: 'string'
  },
  SM: {
    patterns: ['sm', 'sales manager', 'coordinatore'],
    required: true,
    type: 'string'
  },
  SE: {
    patterns: ['se', 'sales executive'],
    required: false,
    type: 'string'
  },
  DISTRETTO: {
    patterns: ['distretto', 'area'],
    required: false,
    type: 'string'
  },
  TIPOLOGIA: {
    patterns: ['tipologia', 'tipo'],
    required: false,
    type: 'string'
  },
  
  // Prodotti - Pezzi (possono variare)
  SIM_VOCE_TOTALI: {
    patterns: ['sim voce totali', 'voce totale', 'sim voce'],
    required: false,
    type: 'number'
  },
  SIM_DATI_TOTALI: {
    patterns: ['sim dati totali', 'dati totale', 'sim dati'],
    required: false,
    type: 'number'
  },
  SIM_MNP_VOCE: {
    patterns: ['sim mnp voce', 'mnp voce'],
    required: false,
    type: 'number'
  },
  EASY_RENT: {
    patterns: ['easy rent'],
    required: false,
    type: 'number'
  },
  ADSL: {
    patterns: ['adsl'],
    required: false,
    type: 'number'
  },
  LINK_OU: {
    patterns: ['link ou', 'ou'],
    required: false,
    type: 'number'
  },
  LINK_OA: {
    patterns: ['link oa', 'oa'],
    required: false,
    type: 'number'
  },
  
  // Fatturato per prodotto (possono variare)
  FATTURATO_VOCE: {
    patterns: ['fatturato voce'],
    required: false,
    type: 'number'
  },
  FATTURATO_DATI: {
    patterns: ['fatturato dati'],
    required: false,
    type: 'number'
  },
  FATTURATO_EASY_RENT: {
    patterns: ['fatturato easy rent'],
    required: false,
    type: 'number'
  },
  FATTURATO_ADSL: {
    patterns: ['fatturato adsl'],
    required: false,
    type: 'number'
  },
  FATTURATO_OU: {
    patterns: ['fatturato ou'],
    required: false,
    type: 'number'
  },
  FATTURATO_OA: {
    patterns: ['fatturato oa'],
    required: false,
    type: 'number'
  },
  FATTURATO_SERVIZI_DIGITALI: {
    patterns: ['fatturato servizi digitali'],
    required: false,
    type: 'number'
  },
  
  // Metriche principali - SEMPRE IMPORTANTI
  FATTURATO_COMPLESSIVO: {
    patterns: ['fatturato complessivo', 'fatturato totale'],
    required: true,
    type: 'number'
  },
  FATTURATO_RUSH: {
    patterns: ['fatturato rush', 'inflow rush', 'rush'],
    required: true,
    type: 'number',
    description: 'Inflow totale della gara'
  },
  NUOVO_CLIENTE: {
    patterns: ['nuovo cliente', 'nuovi clienti'],
    required: true,
    type: 'number'
  },
  
  // FASTWEB - Può esistere o non esistere!
  FASTWEB_ENERGIA: {
    patterns: ['fastweb energia', 'fastweb'],
    required: false, // ← NON OBBLIGATORIO!
    type: 'number',
    description: 'Contratti Fastweb (può non esistere in alcuni periodi)'
  },
  
  // Altri campi che possono variare
  TOTALE_PEZZI: {
    patterns: ['totale pezzi'],
    required: false,
    type: 'number'
  },
  BSALES_MOBILE: {
    patterns: ['bsales mobile'],
    required: false,
    type: 'number'
  },
  PDA_DIGITALE: {
    patterns: ['pda digitale'],
    required: false,
    type: 'number'
  }
};

/**
 * 🔍 TROVA LA RIGA HEADER AUTOMATICAMENTE
 * Cerca la riga con più colonne che sembrano header
 */
function findHeaderRow(worksheet) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  let bestRow = -1;
  let bestScore = 0;
  
  for (let row = 0; row <= Math.min(10, range.e.r); row++) {
    let score = 0;
    const headers = [];
    
    for (let col = 0; col <= Math.min(50, range.e.c); col++) {
      const cellRef = XLSX.utils.encode_cell({r: row, c: col});
      const cell = worksheet[cellRef];
      
      if (cell && cell.v && typeof cell.v === 'string') {
        const value = cell.v.toString().toLowerCase();
        headers.push(value);
        
        // Punteggio per parole chiave tipiche degli header
        const keywords = ['agente', 'sm', 'fatturato', 'sim', 'inflow', 'nuovo', 'cliente'];
        for (const keyword of keywords) {
          if (value.includes(keyword)) {
            score += 2;
          }
        }
        
        // Punteggio per pattern generici
        if (value.length > 3 && value.length < 50) {
          score += 0.5;
        }
      }
    }
    
    console.log(`Riga ${row + 1}: ${score} punti, ${headers.length} colonne`);
    
    if (score > bestScore && score > 10) {
      bestScore = score;
      bestRow = row;
    }
  }
  
  if (bestRow === -1) {
    throw new Error('Impossibile trovare la riga header nel file');
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
 * Utility functions (rimangono uguali)
 */
function columnToIndex(column) {
  let result = 0;
  for (let i = 0; i < column.length; i++) {
    result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result - 1;
}

function extractDateFromFilename(filename) {
  const dateMatch = filename.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!dateMatch) {
    throw new Error('Nome file non valido. Formato atteso: YYYY.MM.DD');
  }
  
  return {
    year: parseInt(dateMatch[1]),
    month: parseInt(dateMatch[2]),
    day: parseInt(dateMatch[3]),
    dateString: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
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
      value = value.toString().replace(/[€$,.\s]/g, '').replace(',', '.');
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
  
  if (expectedType === 'string') {
    return value.toString().trim();
  }
  
  return value;
}

/**
 * 📊 PARSA SINGOLA RIGA AGENTE CON GESTIONE DINAMICA
 */
function parseAgentRow(worksheet, rowIndex, columnMapping) {
  const agent = {};
  
  const getColumnValue = (fieldKey, expectedType = 'auto') => {
    const columnLetter = columnMapping[fieldKey];
    if (!columnLetter) {
      // Campo non trovato - restituisci valore di default
      return expectedType === 'number' ? 0 : '';
    }
    
    const cellRef = XLSX.utils.encode_cell({r: rowIndex, c: columnToIndex(columnLetter)});
    return cleanCellValue(worksheet[cellRef], expectedType);
  };
  
  // Dati base agente - OBBLIGATORI
  agent.numero = getColumnValue('NUMERO', 'number');
  agent.nome = getColumnValue('AGENTE', 'string');
  agent.sm = getColumnValue('SM', 'string');
  agent.se = getColumnValue('SE', 'string');
  agent.distretto = getColumnValue('DISTRETTO', 'string');
  agent.tipologia = getColumnValue('TIPOLOGIA', 'string');
  
  // Prodotti - DINAMICI (0 se non esistono)
  agent.prodotti = {
    simVoceTotali: getColumnValue('SIM_VOCE_TOTALI', 'number'),
    simDatiTotali: getColumnValue('SIM_DATI_TOTALI', 'number'),
    simMnpVoce: getColumnValue('SIM_MNP_VOCE', 'number'),
    easyRent: getColumnValue('EASY_RENT', 'number'),
    adsl: getColumnValue('ADSL', 'number'),
    linkOU: getColumnValue('LINK_OU', 'number'),
    linkOA: getColumnValue('LINK_OA', 'number')
  };
  
  // Fatturati per prodotto - DINAMICI
  agent.fatturato = {
    voce: getColumnValue('FATTURATO_VOCE', 'number'),
    dati: getColumnValue('FATTURATO_DATI', 'number'),
    easyRent: getColumnValue('FATTURATO_EASY_RENT', 'number'),
    adsl: getColumnValue('FATTURATO_ADSL', 'number'),
    ou: getColumnValue('FATTURATO_OU', 'number'),
    oa: getColumnValue('FATTURATO_OA', 'number'),
    serviziDigitali: getColumnValue('FATTURATO_SERVIZI_DIGITALI', 'number'),
    complessivo: getColumnValue('FATTURATO_COMPLESSIVO', 'number'),
    rush: getColumnValue('FATTURATO_RUSH', 'number')
  };
  
  // Metriche principali - IMPORTANTI
  agent.nuoviClienti = getColumnValue('NUOVO_CLIENTE', 'number');
  
  // 🎯 FASTWEB - PUÒ NON ESISTERE!
  agent.fastwebEnergia = getColumnValue('FASTWEB_ENERGIA', 'number');
  
  // Altri campi opzionali
  agent.totalePezzi = getColumnValue('TOTALE_PEZZI', 'number');
  agent.bsalesMobile = getColumnValue('BSALES_MOBILE', 'number');
  agent.pdaDigitale = getColumnValue('PDA_DIGITALE', 'number');
  
  return agent;
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
    // Estrai la data dal nome del file o usa la proprietà date
    const dateA = a.date || extractDateFromFilename(a.name).dateString;
    const dateB = b.date || extractDateFromFilename(b.name).dateString;
    
    // Ordina dal più recente al più vecchio
    return new Date(dateB) - new Date(dateA);
  });
}

/**
 * 🚀 PARSING PRINCIPALE - DINAMICO E INTELLIGENTE
 */
export async function parseExcelFile(file) {
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
      
      throw new Error(
        `Impossibile procedere: mancano campi obbligatori: ${criticalMissing}.\n` +
        `Verifica che il file contenga le colonne necessarie.`
      );
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
        
        // Calcola totali dinamici
        agent.totaliProdotti = {
          pezziTotali: Object.values(agent.prodotti).reduce((sum, val) => sum + (val || 0), 0)
        };
        
        // Inflow = FATTURATO RUSH
        agent.inflowTotale = agent.fatturato.rush || 0;
        
        // Info temporale
        agent.mese = dateInfo.month;
        agent.anno = dateInfo.year;
        agent.dataFile = dateInfo.dateString;
        
        agents.push(agent);
        
        // Statistiche SM
        if (agent.sm && agent.sm.trim() !== '') {
          if (!smStats.has(agent.sm)) {
            smStats.set(agent.sm, {
              nome: agent.sm,
              agenti: [],
              totali: {
                fatturato: 0,
                inflow: 0,
                nuoviClienti: 0,
                fastwebEnergia: 0,
                pezzi: 0
              }
            });
          }
          
          const smData = smStats.get(agent.sm);
          smData.agenti.push(agent);
          smData.totali.fatturato += agent.fatturato.complessivo || 0;
          smData.totali.inflow += agent.inflowTotale || 0;
          smData.totali.nuoviClienti += agent.nuoviClienti || 0;
          smData.totali.fastwebEnergia += agent.fastwebEnergia || 0;
          smData.totali.pezzi += agent.totaliProdotti.pezziTotali || 0;
        }
        
      } catch (rowError) {
        console.warn(`⚠️ Errore riga ${row + 1}:`, rowError);
      }
    }
    
    // 📊 RISULTATO FINALE
    const result = {
      success: true,
      data: {
        agents,
        smStats: Array.from(smStats.values()),
        metadata: {
          totalAgents: agents.length,
          totalSMs: smStats.size,
          dateInfo,
          filename: file.name,
          uploadDate: new Date().toISOString(),
          headerRow: headerRow + 1,
          totalColumns,
          mappedFields: Object.keys(mapping).length,
          warnings: warnings.length > 0 ? warnings : null,
          availableColumns
        },
        totals: {
          fatturato: agents.reduce((sum, a) => sum + (a.fatturato.complessivo || 0), 0),
          inflow: agents.reduce((sum, a) => sum + (a.inflowTotale || 0), 0),
          nuoviClienti: agents.reduce((sum, a) => sum + (a.nuoviClienti || 0), 0),
          fastwebEnergia: agents.reduce((sum, a) => sum + (a.fastwebEnergia || 0), 0),
          pezzi: agents.reduce((sum, a) => sum + (a.totaliProdotti.pezziTotali || 0), 0)
        }
      }
    };
    
    console.log('✅ Parsing completato con successo!');
    console.log(`📊 ${agents.length} agenti, ${smStats.size} SM`);
    console.log(`💰 €${result.data.totals.fatturato.toLocaleString()} fatturato`);
    console.log(`⚡ €${result.data.totals.inflow.toLocaleString()} inflow`);
    
    if (warnings.length > 0) {
      console.log(`💡 ${warnings.length} campi opzionali impostati a 0:`);
      warnings.forEach(w => console.log(`  - ${w.field}: ${w.description || 'N/A'}`));
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Errore nel parsing:', error);
    return {
      success: false,
      error: error.message
    };
  }
}