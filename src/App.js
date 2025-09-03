import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import toast, { Toaster } from 'react-hot-toast';

// Import dei servizi
import { apiService } from './services/apiService';
// Import del parser Excel aggiornato
import { parseExcelFile, formatCurrency, formatNumber, sortFilesByDate } from './utils/excelParser';
import ConfirmationDialog from './components/ConfirmationDialog';
import ModernAgentsPage from './components/ModernAgentsPage'; // Importa la nuova pagina agenti
import TestPage from './components/TestPage'; // Importa il componente TestPage
import './App.css';

// Context per la gestione dei dati - AGGIORNATO con caricamento globale
const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// 🆕 DATA PROVIDER CON CARICAMENTO GLOBALE
const DataProvider = ({ children, isAuthenticated }) => {
  const [data, setData] = useState({
    uploadedFiles: [],
    processedData: {},
    selectedSM: null,
    selectedAgent: null
  });
  const [selectedFileDate, setSelectedFileDate] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  // 🔧 FUNZIONE DI CARICAMENTO GLOBALE - Condivisa tra tutti i componenti
  const loadFiles = useCallback(async () => {
    if (!isAuthenticated) return; // Non caricare se non autenticato
    
    try {
      setGlobalLoading(true);
      console.log('🔄 Caricamento globale dati dal database...');
      
      const files = await apiService.loadFiles();
      
      if (!files || !Array.isArray(files) || files.length === 0) {
        console.log('📁 Nessun file trovato nel database');
        setData(prevData => ({
          ...prevData,
          uploadedFiles: [],
          processedData: {}
        }));
        return;
      }

      console.log(`📁 ${files.length} file trovati nel database`);
      
      // Converte i dati dal formato database al formato app
      const processedFiles = await Promise.all(files.map(async (file) => {
        try {
          // Prova a caricare dati completi del file se necessario per la dashboard
          let fileData = null;
          
          // Controlla se i dati sono già nel file dalla query principale
          if (file.file_data) {
            if (typeof file.file_data === 'string') {
              fileData = JSON.parse(file.file_data);
            } else {
              fileData = file.file_data;
            }
          } else {
            // Fallback: prova a caricare i dati separatamente
            try {
              fileData = await apiService.getFileData(file.file_date);
            } catch (error) {
              console.warn(`Impossibile caricare dati dettagliati per ${file.file_date}`);
            }
          }
          
          return {
            id: file.id,
            name: file.file_name,
            date: file.file_date,
            displayDate: file.display_date,
            uploadDate: file.upload_date,
            size: file.file_size,
            data: fileData,
            metadata: fileData ? {
              totalAgents: fileData.metadata?.totalAgents || 0,
              totalSMs: fileData.metadata?.totalSMs || 0,
              totalRevenue: fileData.metadata?.totalRevenue || 0,
              totalRush: fileData.metadata?.totalRush || 0,
              totalNewClients: fileData.metadata?.totalNewClients || 0,
              totalFastweb: fileData.metadata?.totalFastweb || 0
            } : {
              // Fallback dai dati di base del file
              totalAgents: file.total_agents || 0,
              totalSMs: file.total_sms || 0,
              totalRevenue: file.total_revenue || 0,
              totalRush: file.total_rush || 0,
              totalNewClients: file.total_new_clients || 0,
              totalFastweb: file.total_fastweb || 0
            }
          };
        } catch (error) {
          console.warn(`Errore processamento file ${file.file_date}:`, error);
          return {
            id: file.id,
            name: file.file_name,
            date: file.file_date,
            displayDate: file.display_date,
            uploadDate: file.upload_date,
            size: file.file_size,
            data: null,
            metadata: {
              totalAgents: 0,
              totalSMs: 0,
              totalRevenue: 0,
              totalRush: 0,
              totalNewClients: 0,
              totalFastweb: 0
            }
          };
        }
      }));
      
      // 🔧 FIX: Ordina i file per data nel nome, non per data upload
      const sortedFiles = sortFilesByDate(processedFiles);
      
      // Crea il processedData per compatibilità con componenti esistenti
      const processedData = {};
      sortedFiles.forEach(file => {
        if (file.data) {
          processedData[file.date] = file.data;
        }
      });
      
      // 🔧 FIX: Seleziona automaticamente il file più recente se non c'è selezione
      const newSelectedFileDate = selectedFileDate && sortedFiles.find(f => f.date === selectedFileDate) 
        ? selectedFileDate 
        : (sortedFiles.length > 0 ? sortedFiles[0].date : null);
      
      setData(prevData => ({
        ...prevData,
        uploadedFiles: sortedFiles,
        processedData: processedData
      }));
      
      setSelectedFileDate(newSelectedFileDate);
      
      console.log(`✅ ${sortedFiles.length} file caricati con successo globalmente`);
      
      if (sortedFiles.length > 0 && newSelectedFileDate) {
        console.log(`📋 File selezionato: ${sortedFiles.find(f => f.date === newSelectedFileDate)?.displayDate || 'N/A'}`);
      }
      
    } catch (error) {
      console.error('Errore nel caricamento globale dei file:', error);
      toast.error('Errore nel caricamento dei dati dal database');
      
      // Reset in caso di errore
      setData(prevData => ({
        ...prevData,
        uploadedFiles: [],
        processedData: {}
      }));
    } finally {
      setGlobalLoading(false);
    } 
  }, [isAuthenticated, selectedFileDate]);

  // 🚀 CARICAMENTO AUTOMATICO ALL'AUTENTICAZIONE
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔐 Utente autenticato - Avvio caricamento dati...');
      loadFiles();
    } else {
      // Reset dati se non autenticato
      setData({
        uploadedFiles: [],
        processedData: {},
        selectedSM: null,
        selectedAgent: null
      });
      setSelectedFileDate(null);
      setGlobalLoading(false);
    }
  }, [isAuthenticated, loadFiles]);

  const contextValue = {
    data,
    setData,
    selectedFileDate,
    setSelectedFileDate,
    loadFiles, // Esponi la funzione per ricaricare quando necessario
    globalLoading
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Tema Material-UI personalizzato
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
  },
});

// Componente Login
const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await apiService.login(credentials.username, credentials.password);
      
      if (result.success) {
        onLogin(result.user);
        toast.success(`Benvenuto, ${result.user.full_name || result.user.username}!`);
      } else {
        toast.error(result.error || 'Credenziali non valide');
      }
    } catch (error) {
      toast.error('Errore di connessione');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏆 RUSH Dashboard</h1>
          <p>Gara di Produzione Agenti</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              placeholder="Inserisci username"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              placeholder="Inserisci password"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className={`login-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>
        
        <div className="login-footer">
          <small>Credenziali demo: admin / rush2025</small>
        </div>
      </div>
    </div>
  );
};

// Componente Sidebar
const Sidebar = ({ activeSection, setActiveSection, currentUser, onLogout, openDialog }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'sm-ranking', label: 'Classifica SM', icon: '🏅' },
    { id: 'agents', label: 'Agenti', icon: '👥' },
    { id: 'products', label: 'Prodotti', icon: '📦' },
    { id: 'new-clients', label: 'Nuovi Clienti', icon: '🆕' },
    { id: 'fastweb', label: 'Fastweb', icon: '⚡' },
    { id: 'files', label: 'Gestione File', icon: '📁' },
    { id: 'test', label: 'Test', icon: '🧪' },
  ];

  const handleLogout = async () => {
    openDialog(
      'Conferma Logout',
      'Sei sicuro di voler uscire?',
      async () => {
        await onLogout();
      }
    );
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>🏆 RUSH</h2>
        {currentUser && (
          <div className="user-info">
            <p className="user-name">{currentUser.full_name || currentUser.username}</p>
            <p className="user-role">{currentUser.role === 'admin' ? '👑 Admin' : '👤 Viewer'}</p>
          </div>
        )}
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => setActiveSection(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
        <div className="version-info">
          <small>v1.0.0</small>
        </div>
      </div>
    </div>
  );
};

// Componente File Upload - SEMPLIFICATO (non più responsabile del caricamento globale)
const FileUpload = ({ openDialog }) => {
  const { data, loadFiles, globalLoading } = useData();
  const [uploading, setUploading] = useState(false);

  // ⚠️ IMPORTANTE: Ora loadFiles è gestito globalmente, non qui

  // *** AGGIORNATO: handleFileUpload per parser dinamico ***
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    toast.loading('Parsing del file Excel...', { id: 'upload' });

    try {
      // Validazione tipo file
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.xlsx')) {
        toast.error('File non valido. Sono supportati solo file Excel (.xlsx, .xls)', { id: 'upload' });
        return;
      }

      // *** NUOVO: Parsing dinamico con gestione anomalie ***
      const parseResult = await parseExcelFile(file);
      
      if (!parseResult.success) {
        if (parseResult.needsMapping) {
          // 🆕 Gestisci mappatura manuale se necessaria
          const userChoice = window.confirm(
            `⚠️ ATTENZIONE: Alcune colonne non sono state trovate automaticamente.\n\n` +
            `Colonne mancanti: ${parseResult.missingColumns.map(c => c.field).join(', ')}\n\n` +
            `Colonne disponibili nel file: ${parseResult.availableColumns.slice(0, 10).join(', ')}${parseResult.availableColumns.length > 10 ? '...' : ''}\n\n` +
            `Vuoi procedere comunque? I campi mancanti saranno impostati a 0.`
          );
          
          if (!userChoice) {
            toast.error('Caricamento annullato', { id: 'upload' });
            return;
          }
          
          // Per ora procediamo, in futuro si può implementare una mappatura manuale
        } else {
          toast.error(`❌ Errore nel parsing del file: ${parseResult.error}`, { id: 'upload' });
          return;
        }
      }

      // *** NUOVO: Gestione warnings per campi opzionali mancanti ***
      if (parseResult.data?.metadata?.warnings && parseResult.data.metadata.warnings.length > 0) {
        const warningCount = parseResult.data.metadata.warnings.length;
        const warningFields = parseResult.data.metadata.warnings.map(w => w.field).join(', ');
        
        toast.success(
          `⚡ File parsato con successo!\n` +
          `⚠️ ${warningCount} campi opzionali impostati a zero: ${warningFields}\n` +
          `Questo è normale per prodotti non disponibili in certi periodi.`,
          { id: 'upload', duration: 6000 }
        );
      }

      const { data: parsedData } = parseResult;
      const fileDate = parsedData.metadata.dateInfo.dateString;

      const uploadFile = async () => {
        // *** AGGIORNATO: Usa la nuova struttura dati dal parser dinamico ***
        const fileData = {
          name: file.name,
          date: fileDate,
          displayDate: `${parsedData.metadata.dateInfo.month}/${parsedData.metadata.dateInfo.year}`,
          size: file.size,
          data: parsedData,
          metadata: {
            totalAgents: parsedData.metadata.totalAgents,
            totalSMs: parsedData.metadata.totalSMs,
            totalRevenue: parsedData.metadata.totalRevenue,
            totalRush: parsedData.metadata.totalRush,
            totalNewClients: parsedData.metadata.totalNewClients,
            totalFastweb: parsedData.metadata.totalFastweb || 0,
            parseDate: new Date().toISOString(),
            warnings: parsedData.metadata.warnings
          }
        };

        const result = await apiService.saveFile(fileData);

        if (result.success) {
          // Success feedback con dettagli migliorati
          const agentsCount = parsedData.metadata.totalAgents;
          const smCount = parsedData.metadata.totalSMs;
          const totalFatturato = parsedData.metadata.totalRevenue;
          const totalRush = parsedData.metadata.totalRush;
          
          const actionText = result.action === 'updated' ? 'aggiornato' : 'caricato';
          toast.success(
            `✅ File ${actionText} con successo!\n` +
            `👥 ${agentsCount} agenti importati\n` +
            `👔 ${smCount} coordinatori\n` +
            `💰 ${formatCurrency(totalFatturato)} fatturato\n` +
            `⚡ ${formatCurrency(totalRush)} Fatturato Rush`,
            { id: 'upload', duration: 5000 }
          );

          // 🔧 FIX: Usa la funzione globale di caricamento
          await loadFiles();
        } else {
          throw new Error(result.error || 'Errore sconosciuto durante il caricamento');
        }
      };

      // Controlla duplicati basandosi sulla data nel nome file
      const existingFile = data.uploadedFiles.find(f => f.date === fileDate);
      
      if (existingFile) {
        toast.dismiss('upload');
        const monthYear = `${parsedData.metadata.dateInfo.month}/${parsedData.metadata.dateInfo.year}`;
        openDialog(
          'Sovrascrivi file',
          `⚠️ ATTENZIONE!\n\nEsiste già un file per ${monthYear}:\n"${existingFile.name}"\n\nVuoi sovrascriverlo?`,
          () => {
            toast.loading('Aggiornamento file...', { id: 'upload' });
            uploadFile();
          }
        );
      } else {
        toast.loading('Caricamento file sul server...', { id: 'upload' });
        await uploadFile();
      }

    } catch (error) {
      toast.error(`❌ Errore: ${error.message || 'Caricamento fallito'}`, { id: 'upload' });
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (fileDate, fileName) => {
    openDialog(
      'Conferma Eliminazione',
      `Sei sicuro di voler eliminare il file ${fileName}?`,
      async () => {
        try {
          toast.loading('Eliminazione file...', { id: 'delete' });

          await apiService.deleteFile(fileDate);

          toast.success('File eliminato con successo', { id: 'delete' });

          // 🔧 FIX: Usa la funzione globale di ricaricamento
          await loadFiles();

        } catch (error) {
          toast.error(`Errore nell'eliminazione: ${error.message}`, { id: 'delete' });
          console.error('Delete error:', error);
        }
      }
    );
  };

  // 🔧 FIX: Mostra loading globale invece di loading locale
  if (globalLoading) {
    return (
      <div className="file-upload-section">
        <div className="loading-indicator">
          <div className="loading-spinner"></div>
          Caricamento file dal database...
        </div>
      </div>
    );
  }

  return (
    <div className="file-upload-section">
      <h3>📁 Carica File Mensile</h3>
      <div className="upload-area">
        <input
          type="file"
          id="file-upload"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          disabled={uploading}
          className="file-input"
        />
        <label htmlFor="file-upload" className={`upload-label ${uploading ? 'uploading' : ''}`}>
          {uploading ? '⏳ Caricamento...' : '📤 Seleziona File Excel'}
        </label>
      </div>
      
      <div className="upload-info">
        <p>Formato file: <code>YYYY.MM.DD Piramis Gara RUSH Inflow Agenti.xlsx</code></p>
        <p>File supportati: .xlsx, .xls</p>
        <p className="parser-info">
          🧠 <strong>Parser Dinamico:</strong> Si adatta automaticamente alle variazioni tra file diversi
        </p>
      </div>
      
      <div className="uploaded-files">
        <h4>File Caricati ({data.uploadedFiles.length})</h4>
        {data.uploadedFiles.length === 0 ? (
          <p className="no-files">Nessun file caricato sul server</p>
        ) : (
          <div className="files-list">
            {data.uploadedFiles.map(file => (
              <div key={file.id} className="file-item">
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  {file.metadata && (
                    <div className="file-stats">
                      <span>{formatNumber(file.metadata.totalAgents)} agenti</span>
                      <span>{formatNumber(file.metadata.totalSMs)} coordinatori</span>
                      <span>{formatCurrency(file.metadata.totalRevenue)} fatturato</span>
                      <span>{formatCurrency(file.metadata.totalRush)} Fatturato Rush</span>
                      {file.metadata.totalFastweb > 0 && (
                        <span className="fastweb-badge">⚡ {formatNumber(file.metadata.totalFastweb)} Fastweb</span>
                      )}
                    </div>
                  )}
                </div>
                <span className="file-date">{file.displayDate}</span>
                <div className="file-actions">
                  <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                  <button 
                    className="delete-file-btn"
                    onClick={() => handleDeleteFile(file.date, file.name)}
                    title="Elimina file"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente Dashboard principale - AGGIORNATO per gestire loading globale
const Dashboard = () => {
  const { data, selectedFileDate, setSelectedFileDate, globalLoading } = useData();
  const [loading, setLoading] = useState(false);
  
  // Effetto per gestire la selezione del periodo
  useEffect(() => {
    // Se non c'è una selezione e ci sono file, seleziona il più recente
    if (!selectedFileDate && data.uploadedFiles.length > 0) {
      setSelectedFileDate(data.uploadedFiles[0].date);
    }
    // Se il file selezionato non è più nella lista (es. eliminato), resetta la selezione
    if (selectedFileDate && !data.uploadedFiles.find(f => f.date === selectedFileDate)) {
      setSelectedFileDate(data.uploadedFiles[0]?.date || null);
    }
  }, [data.uploadedFiles, selectedFileDate, setSelectedFileDate]);

  const { stats, currentFile } = React.useMemo(() => {
    if (data.uploadedFiles.length === 0) {
      return { stats: { totalAgents: 0, totalSMs: 0, totalRevenue: 0, totalRush: 0, totalNewClients: 0, totalFastweb: 0 }, currentFile: null };
    }
    
    const targetFile = selectedFileDate
      ? data.uploadedFiles.find(f => f.date === selectedFileDate)
      : data.uploadedFiles[0];

    // Se il file non si trova, usa il primo come fallback
    const fileToUse = targetFile || data.uploadedFiles[0];

    if (!fileToUse || !fileToUse.metadata) {
      return { stats: { totalAgents: 0, totalSMs: 0, totalRevenue: 0, totalRush: 0, totalNewClients: 0, totalFastweb: 0 }, currentFile: null };
    }
    
    return {
      stats: fileToUse.metadata,
      currentFile: fileToUse
    };
  }, [data.uploadedFiles, selectedFileDate]);
  
  const handlePeriodChange = (e) => {
    const newFileDate = e.target.value;
    setLoading(true);
    setTimeout(() => {
      setSelectedFileDate(newFileDate);
      setLoading(false);
    }, 300);
  };

  // 🔧 FIX: Mostra loading globale durante il caricamento iniziale
  if (globalLoading && data.uploadedFiles.length === 0) {
    return (
      <div className="dashboard-content">
        <div className="loading-indicator">
          <div className="loading-spinner"></div>
          <p>Caricamento dati dal database...</p>
          <small>Prima volta? Vai in "📁 Gestione File" per caricare il primo file Excel.</small>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h2>📊 Dashboard Generale</h2>
        {data.uploadedFiles.length > 0 && currentFile ? (
          <div className="period-selector">
            <label htmlFor="period-select">Periodo di Riferimento:</label>
            <select
              id="period-select"
              value={currentFile.date}
              onChange={handlePeriodChange}
            >
              {data.uploadedFiles.map(file => (
                <option key={file.id} value={file.date}>
                  {file.displayDate}
                </option>
              ))}
            </select>
          </div>
        ) : (
           <p className="current-period">Nessun periodo disponibile - Carica il primo file Excel</p>
        )}
      </div>
      
      {/* 🔧 FIX: Mostra stats solo se ci sono dati */}
      {data.uploadedFiles.length > 0 ? (
        <div className="stats-grid">
          <div className="stat-card" style={{ animationDelay: '200ms' }}>
            <h3>Totale Agenti</h3>
            <div className={`stat-number ${loading ? 'loading' : ''}`}>{formatNumber(stats.totalAgents)}</div>
          </div>
          
          <div className="stat-card" style={{ animationDelay: '300ms' }}>
            <h3>SM Attivi</h3>
            <div className={`stat-number ${loading ? 'loading' : ''}`}>{formatNumber(stats.totalSMs)}</div>
          </div>
          
          <div className="stat-card highlight" style={{ animationDelay: '400ms' }}>
            <h3>Fatturato Totale</h3>
            <div className={`stat-number ${loading ? 'loading' : ''}`}>{formatCurrency(stats.totalRevenue)}</div>
          </div>
          
          <div className="stat-card highlight" style={{ animationDelay: '500ms' }}>
            <h3>Fatturato Rush</h3>
            <div className={`stat-number ${loading ? 'loading' : ''}`}>{formatCurrency(stats.totalRush)}</div>
          </div>
          
          <div className="stat-card" style={{ animationDelay: '600ms' }}>
            <h3>Nuovo Cliente</h3>
            <div className={`stat-number ${loading ? 'loading' : ''}`}>{formatNumber(stats.totalNewClients)}</div>
          </div>
          
          <div className="stat-card" style={{ animationDelay: '700ms' }}>
            <h3>Contratti Fastweb</h3>
            <div className={`stat-number ${loading ? 'loading' : ''}`}>
              {stats.totalFastweb > 0 ? formatNumber(stats.totalFastweb) : '--'}
            </div>
            {stats.totalFastweb === 0 && (
              <div className="stat-note">Non disponibile nel periodo</div>
            )}
          </div>
        </div>
      ) : (
        <div className="welcome-message">
          <h3>👋 Benvenuto nella Dashboard RUSH!</h3>
          <p>Per iniziare, carica il primo file Excel dalla sezione <strong>"📁 Gestione File"</strong>.</p>
          <div className="welcome-steps">
            <div className="step">
              <span className="step-number">1</span>
              <span>Vai in "📁 Gestione File"</span>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <span>Carica il file Excel mensile</span>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <span>Torna qui per vedere le statistiche!</span>
            </div>
          </div>
        </div>
      )}
      
      {currentFile && (
        <div className="quick-insights">
          <h3>📈 Insights Rapidi (Periodo: {currentFile.displayDate})</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <h4>File Selezionato</h4>
              <p>Periodo: <strong>{currentFile.displayDate}</strong></p>
              <p className="insight-detail">Dati relativi al periodo selezionato</p>
            </div>
            <div className="insight-card">
              <h4>Media per Agente</h4>
              <p>Fatturato medio: <strong>{formatCurrency(stats.totalRevenue / (stats.totalAgents || 1))}</strong></p>
              <p>Fatturato Rush medio: <strong>{formatCurrency(stats.totalRush / (stats.totalAgents || 1))}</strong></p>
            </div>
            <div className="insight-card">
              <h4>Performance Generale</h4>
              <p>Rapporto Rush/Fatturato: <strong>{((stats.totalRush / (stats.totalRevenue || 1)) * 100).toFixed(1)}%</strong></p>
              <p>Nuovi clienti per agente: <strong>{(stats.totalNewClients / (stats.totalAgents || 1)).toFixed(2)}</strong></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente principale con routing - AGGIORNATO per usare DataProvider
const MainApp = ({ currentUser, onLogout, isAuthenticated }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const openDialog = (title, message, onConfirm) => {
    setDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        handleCloseDialog();
      }
    });
  };

  const handleCloseDialog = () => {
    setDialog({ ...dialog, isOpen: false });
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'files':
        return <FileUpload openDialog={openDialog} />;
      case 'sm-ranking':
        return <div className="section-placeholder">🏅 Classifica SM - Disponibile dopo caricamento componenti avanzati</div>;
      case 'agents':
        return <ModernAgentsPage />;
      case 'products':
        return <div className="section-placeholder">📦 Analisi Prodotti - Disponibile dopo caricamento componenti avanzati</div>;
      case 'new-clients':
        return <div className="section-placeholder">🆕 Nuovi Clienti - Disponibile dopo caricamento componenti avanzati</div>;
      case 'fastweb':
        return <div className="section-placeholder">⚡ Contratti Fastweb - Disponibile dopo caricamento componenti avanzati</div>;
      case 'test':
        return <TestPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <DataProvider isAuthenticated={isAuthenticated}>
      <div className="app-layout">
        <Sidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection}
          currentUser={currentUser}
          onLogout={onLogout}
          openDialog={openDialog}
        />
        <main className="main-content">
          <div className="content-container">
            {renderContent()}
          </div>
        </main>
        <ConfirmationDialog
          open={dialog.isOpen}
          onClose={handleCloseDialog}
          onConfirm={dialog.onConfirm}
          title={dialog.title}
          message={dialog.message}
        />
      </div>
    </DataProvider>
  );
};

// App principale
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Controlla autenticazione all'avvio
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (apiService.isAuthenticated()) {
          const user = apiService.getCurrentUser();
          if (user) {
            setCurrentUser(user);
            setIsAuthenticated(true);
            
            // Test connessione API
            try {
              await apiService.healthCheck();
              console.log('✅ Connessione API verificata');
            } catch (error) {
              console.warn('⚠️ Problema connessione API:', error);
              toast.warning('Connessione al server instabile');
            }
          }
        }
      } catch (error) {
        console.error('Errore verifica autenticazione:', error);
      } finally {
        setInitializing(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setCurrentUser(null);
      setIsAuthenticated(false);
      toast.success('Logout effettuato con successo');
    } catch (error) {
      console.error('Errore durante logout:', error);
      // Logout locale comunque
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  };

  // Loading iniziale
  if (initializing) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="App">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Inizializzazione RUSH Dashboard...</p>
          </div>
          <Toaster position="top-right" />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        {!isAuthenticated ? (
          <Login onLogin={handleLogin} />
        ) : (
          <MainApp 
            currentUser={currentUser} 
            onLogout={handleLogout}
            isAuthenticated={isAuthenticated}
          />
        )}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              maxWidth: '500px', // ← Più spazio per i messaggi dettagliati
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4aed88',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ff6b6b',
              },
            },
          }}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;