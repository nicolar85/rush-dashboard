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
  'DISTRETTO': {
    patterns: ['distretto'],
    required: false,
    description: 'Distretto di appartenenza'
  },
  
  // Metriche finanziarie (OBBLIGATORIE)
  'FATTURATO_RUSH': {
    patterns: ['fatturato rush', 'rush fatturato', 'fat rush'], // Rimosso 'fatturato' generico
    required: true,
    description: 'Fatturato Rush dell\'agente'
  },
  'FATTURATO_COMPLESSIVO': {
    patterns: ['fatturato complessivo', 'fatturato totale', 'totale fatturato'], // Rimosso 'fatturato agente'
    required: true,
    description: 'Fatturato Complessivo dell\'agente'
  },
  'BONUS_RISULTATI': {
    patterns: ['importo totale'],
    required: false,
    description: 'Bonus economico per risultati'
  },
  
  // Prodotti voce (opzionali ma importanti)
  'SIM_VOCE': {
    patterns: ['sim voce totali', 'sim voce'],
    required: false,
    description: 'Contratti SIM Voce'
  },
  'SIM_DATI': {
    patterns: ['sim dati totali', 'sim dati'],
    required: false,
    description: 'Contratti SIM Dati'
  },
  'MNP': {
    patterns: ['sim mnp voce', 'mnp'],
    required: false,
    description: 'Contratti MNP'
  },

  // Nuovi campi prodotti e fatturati specifici
  'EASY_RENT': { patterns: ['easy rent'], required: false, description: 'Contratti Easy Rent' },
  'LINK_OU': { patterns: ['link ou'], required: false, description: 'Contratti Link OU' },
  'LINK_OA': { patterns: ['link oa'], required: false, description: 'Contratti Link OA' },
  'LINK_OA_START': { patterns: ['link oa start'], required: false, description: 'Contratti Link OA Start' },
  'INTERNI_OA': { patterns: ['interni oa'], required: false, description: 'Contratti Interni OA' },
  'FATTURATO_VOCE': { patterns: ['fatturato voce'], required: false, description: 'Fatturato Voce' },
  'FATTURATO_DATI': { patterns: ['fatturato dati'], required: false, description: 'Fatturato Dati' },
  'FATTURATO_EASY_RENT': { patterns: ['fatturato easy rent'], required: false, description: 'Fatturato Easy Rent' },
  'FATTURATO_OU': { patterns: ['fatturato ou'], required: false, description: 'Fatturato OU' },
  'FATTURATO_OA': { patterns: ['fatturato oa'], required: false, description: 'Fatturato OA' },
  'FATTURATO_EASY_DEAL': { patterns: ['fatturato easy e complex deal'], required: false, description: 'Fatturato Easy & Complex Deal' },
  'FATTURATO_ALTRO': { patterns: ['fatturato altro'], required: false, description: 'Fatturato Altro' },
  'FATTURATO_SERVIZI_DIGITALI': { patterns: ['fatturato servizi digitali'], required: false, description: 'Fatturato Servizi Digitali' },
  'FATTURATO_CUSTOM': { patterns: ['fatturato custom'], required: false, description: 'Fatturato Custom' },
  'SDM': { patterns: ['sdm'], required: false, description: 'Contratti SDM' },
  'FATTURATO_SDM': { patterns: ['fatturato sdm'], required: false, description: 'Fatturato SDM' },
  'SSC': { patterns: ['ssc'], required: false, description: 'Contratti SSC' },
  'FATTURATO_SSC': { patterns: ['fatturato ssc'], required: false, description: 'Fatturato SSC' },
  'YOUR_BACKUP': { patterns: ['your backup'], required: false, description: 'Contratti Your Backup' },
  'FATTURATO_YOUR_BACKUP': { patterns: ['inflow your backup'], required: false, description: 'Fatturato Your Backup' },
  'CLOUD_NAS': { patterns: ['cloud nas'], required: false, description: 'Contratti Cloud NAS' },
  'FATTURATO_CLOUD_NAS': { patterns: ['inflow cloud nas'], required: false, description: 'Fatturato Cloud NAS' },
  'EASY_GDPR': { patterns: ['easy gdpr'], required: false, description: 'Contratti Easy GDPR' },
  'FATTURATO_EASY_GDPR': { patterns: ['fatturato easy gdpr'], required: false, description: 'Fatturato Easy GDPR' },
  'MIIA': { patterns: ['miia'], required: false, description: 'Contratti MIIA' },
  'FATTURATO_MIIA': { patterns: ['inflow miia'], required: false, description: 'Fatturato MIIA' },
  'FATTURATO_NUOVO_CLIENTE': { patterns: ['fatturato nuovo cliente'], required: false, description: 'Fatturato Nuovo Cliente' },
  'BSALES_MOBILE': { patterns: ['bsales mobile'], required: false, description: 'Contratti Bsales Mobile' },
  'PDA_DIGITALE': { patterns: ['pda digitale'], required: false, description: 'Contratti PDA Digitale' },
  
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
  
  // Nuovi clienti e station
  'NUOVO_CLIENTE': {
    patterns: ['nuovo cliente', 'nuovi clienti', 'nc', 'new customers', 'clienti nuovi'],
    required: false,
    description: 'Nuovi Clienti acquisiti'
  },
  'STATION': {
    patterns: ['station', 'tim station', 'negozi'],
    required: false,
    description: 'Contratti via Station'
  },
  
  // Fastweb
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
  
  let bestRow = -1;
  let bestScore = 0;
  
  // Controlla le prime 15 righe per trovare gli header
  for (let row = 0; row <= Math.min(15, range.e.r); row++) {
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
        if (cellText.length > 2 && cellText.length < 35) {
          score += 1;
        }
      }
    }
    
    // Normalizza il punteggio e considera solo righe con almeno 5 header
    if (cellCount > 5) {
      const normalizedScore = score + cellCount;
      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestRow = row;
      }
    }
  }
  
  if (bestRow === -1) {
    throw new Error('Impossibile trovare una riga di header valida nel file.');
  }

  console.log(`✅ Riga header selezionata dinamicamente: ${bestRow + 1} (punteggio: ${bestScore})`);
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
  
  const mappedHeaders = new Set();

  // Fase 1: Cerca corrispondenze esatte per la massima precisione
  for (const [fieldKey, fieldConfig] of Object.entries(DYNAMIC_FIELD_PATTERNS)) {
    for (const header of headers) {
      if (mappedHeaders.has(header.col)) continue; // Salta header già mappato

      for (const pattern of fieldConfig.patterns) {
        if (header.normalized === pattern.toLowerCase()) {
          mapping[fieldKey] = header.col;
          mappedHeaders.add(header.col);
          console.log(`✅ [EXACT] ${fieldKey} → ${header.col} ("${header.name}")`);
          break; // Trovato, passa al campo successivo
        }
      }
      if (mapping[fieldKey]) break; // Trovato, passa al campo successivo
    }
  }

  // Fase 2: Cerca corrispondenze parziali per i campi non ancora mappati
  for (const [fieldKey, fieldConfig] of Object.entries(DYNAMIC_FIELD_PATTERNS)) {
    if (mapping[fieldKey]) continue; // Salta i campi già mappati

    let bestMatch = null;
    let bestScore = 0;

    for (const header of headers) {
      if (mappedHeaders.has(header.col)) continue;

      for (const pattern of fieldConfig.patterns) {
        let score = 0;
        const normalizedPattern = pattern.toLowerCase();

        // Evita che "fatturato" matchi "fatturato complessivo"
        if (fieldKey === 'FATTURATO_RUSH' && header.normalized.includes('complessivo')) {
            continue;
        }

        if (header.normalized.includes(normalizedPattern)) {
          // Privilegia i match più lunghi e specifici
          score = 80 + normalizedPattern.length;
        } else if (normalizedPattern.includes(header.normalized)) {
          score = 60 + header.normalized.length;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = header;
        }
      }
    }

    if (bestMatch) {
      mapping[fieldKey] = bestMatch.col;
      mappedHeaders.add(bestMatch.col);
      console.log(`✅ [PARTIAL] ${fieldKey} → ${bestMatch.col} ("${bestMatch.name}") [score: ${bestScore}]`);
    } else {
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
        console.log(`⚠️ Opzionale mancante: ${fieldKey} (sarà 0)`);
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
  agent.distretto = getColumnValue('DISTRETTO', 'string');
  
  // 🔧 FIX: Metriche finanziarie con calcolo corretto
  agent.fatturatoRush = getColumnValue('FATTURATO_RUSH', 'number');
  agent.bonusRisultati = getColumnValue('BONUS_RISULTATI', 'number');
  
  // ⭐️ NUOVA STRUTTURA DATI PER IL FRONTEND (basata sui requisiti)
  agent.fatturato = {
    complessivo: getColumnValue('FATTURATO_COMPLESSIVO', 'number')
  };

  // Prodotti voce
  agent.simVoce = getColumnValue('SIM_VOCE', 'number');
  
  // Prodotti dati
  agent.adsl = getColumnValue('ADSL', 'number');
  agent.simDati = getColumnValue('SIM_DATI', 'number');
  agent.fibra = getColumnValue('FIBRA', 'number');
  agent.fibraBusiness = getColumnValue('FIBRA_BUSINESS', 'number');
  
  // Prodotti energia
  agent.fastwebEnergia = getColumnValue('FASTWEB_ENERGIA', 'number');
  
  // Altri
  agent.nuovoCliente = getColumnValue('NUOVO_CLIENTE', 'number');
  agent.station = getColumnValue('STATION', 'number');
  agent.mnp = getColumnValue('MNP', 'number');
  
  // Altri campi opzionali
  agent.totalePezzi = getColumnValue('TOTALE_PEZZI', 'number');
  agent.numero = getColumnValue('NUMERO', 'string');

  // Nuovi campi aggiunti
  agent.easyRent = getColumnValue('EASY_RENT', 'number');
  agent.linkOu = getColumnValue('LINK_OU', 'number');
  agent.linkOa = getColumnValue('LINK_OA', 'number');
  agent.linkOaStart = getColumnValue('LINK_OA_START', 'number');
  agent.interniOa = getColumnValue('INTERNI_OA', 'number');
  agent.fatturatoVoce = getColumnValue('FATTURATO_VOCE', 'number');
  agent.fatturatoDati = getColumnValue('FATTURATO_DATI', 'number');
  agent.fatturatoEasyRent = getColumnValue('FATTURATO_EASY_RENT', 'number');
  agent.fatturatoOu = getColumnValue('FATTURATO_OU', 'number');
  agent.fatturatoOa = getColumnValue('FATTURATO_OA', 'number');
  agent.fatturatoEasyDeal = getColumnValue('FATTURATO_EASY_DEAL', 'number');
  agent.fatturatoAltro = getColumnValue('FATTURATO_ALTRO', 'number');
  agent.fatturatoServiziDigitali = getColumnValue('FATTURATO_SERVIZI_DIGITALI', 'number');
  agent.fatturatoCustom = getColumnValue('FATTURATO_CUSTOM', 'number');
  agent.sdm = getColumnValue('SDM', 'number');
  agent.fatturatoSdm = getColumnValue('FATTURATO_SDM', 'number');
  agent.ssc = getColumnValue('SSC', 'number');
  agent.fatturatoSsc = getColumnValue('FATTURATO_SSC', 'number');
  agent.yourBackup = getColumnValue('YOUR_BACKUP', 'number');
  agent.fatturatoYourBackup = getColumnValue('FATTURATO_YOUR_BACKUP', 'number');
  agent.cloudNas = getColumnValue('CLOUD_NAS', 'number');
  agent.fatturatoCloudNas = getColumnValue('FATTURATO_CLOUD_NAS', 'number');
  agent.easyGdpr = getColumnValue('EASY_GDPR', 'number');
  agent.fatturatoEasyGdpr = getColumnValue('FATTURATO_EASY_GDPR', 'number');
  agent.miia = getColumnValue('MIIA', 'number');
  agent.fatturatoMiia = getColumnValue('FATTURATO_MIIA', 'number');
  agent.fatturatoNuovoCliente = getColumnValue('FATTURATO_NUOVO_CLIENTE', 'number');
  agent.bsalesMobile = getColumnValue('BSALES_MOBILE', 'number');
  agent.pdaDigitale = getColumnValue('PDA_DIGITALE', 'number');
  
  // 🔧 FIX: Calcoli derivati corretti
  agent.totaleVoce = agent.simVoce; // Aggiornato dopo rimozione di casa e business
  agent.totaleDati = agent.adsl + agent.fibra + agent.fibraBusiness + agent.simDati;
  agent.totaleFastweb = agent.fastwebEnergia; // Aggiornato dopo rimozione di altri campi fastweb

  // Calcolo aggregato di tutti i nuovi fatturati per prodotto/servizio
  agent.fatturatoProdotti =
    agent.fatturatoVoce +
    agent.fatturatoDati +
    agent.fatturatoEasyRent +
    agent.fatturatoOu +
    agent.fatturatoOa +
    agent.fatturatoEasyDeal +
    agent.fatturatoAltro +
    agent.fatturatoServiziDigitali +
    agent.fatturatoCustom +
    agent.fatturatoSdm +
    agent.fatturatoSsc +
    agent.fatturatoYourBackup +
    agent.fatturatoCloudNas +
    agent.fatturatoEasyGdpr +
    agent.fatturatoMiia +
    agent.fatturatoNuovoCliente;
  
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
      // Rimuovi simboli di valuta e separatori, mantenendo la virgola per i decimali
      value = value.toString().replace(/[€$.\s]/g, '').replace(',', '.');
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
            fatturatoRush: 0,
            nuovoCliente: 0,
            totaleFastweb: 0
          });
        }
        
        const smData = smStats.get(agent.sm);
        smData.agenti.push(agent);
        smData.fatturatoTotale += agent.fatturato.complessivo;
        smData.fatturatoRush += agent.fatturatoRush;
        smData.nuovoCliente += agent.nuovoCliente;
        smData.totaleFastweb += agent.totaleFastweb;
        
      } catch (error) {
        console.warn(`Errore riga ${row + 1}:`, error);
        continue;
      }
    }
    
    console.log(`✅ Parsing completato: ${agents.length} agenti trovati`);
    
    // 🔧 FIX: Calcola i totali CORRETTI
    const totals = agents.reduce((acc, agent) => {
      acc.totalRevenue += agent.fatturato.complessivo;
      acc.totalRush += agent.fatturatoRush;
      acc.totalNewClients += agent.nuovoCliente;
      acc.totalFastweb += agent.totaleFastweb;
      return acc;
    }, {
      totalRevenue: 0,
      totalRush: 0,
      totalNewClients: 0,
      totalFastweb: 0
    });
    
    console.log('💰 Totali calcolati:', {
      fatturato: formatCurrency(totals.totalRevenue),
      fatturatoRush: formatCurrency(totals.totalRush),
      nuovoCliente: totals.totalNewClients,
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
          totalRush: totals.totalRush,
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