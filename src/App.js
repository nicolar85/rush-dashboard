import React, { useState, createContext, useContext } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import toast, { Toaster } from 'react-hot-toast';

// Import dei servizi
import { apiService } from './services/apiService';
// Import del parser Excel aggiornato
import { parseExcelFile, formatCurrency, formatNumber, sortFilesByDate } from './utils/excelParser';
import ConfirmationDialog from './components/ConfirmationDialog';
import './App.css';

// Context per la gestione dei dati
const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
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

// Componente File Upload - VERSIONE AGGIORNATA CON PARSER DINAMICO
const FileUpload = ({ openDialog }) => {
  const { data, setData } = useData();
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // *** FIX: useCallback per loadFiles per risolvere dependency warning ***
  const loadFiles = React.useCallback(async () => {
    try {
      const files = await apiService.loadFiles();
      
      // Converte i dati dal formato database al formato app
      const processedFiles = await Promise.all(files.map(async (file) => {
        try {
          // Carica dati completi del file se necessario per la dashboard
          const fileData = await apiService.getFileData(file.file_date);
          
          return {
            id: file.id,
            name: file.file_name,
            date: file.file_date,
            displayDate: file.display_date,
            uploadDate: file.upload_date,
            size: file.file_size,
            data: fileData, // Dati completi per la dashboard
            metadata: {
              totalAgents: fileData.metadata.totalAgents,
              totalSMs: fileData.metadata.totalSMs,
              totalRevenue: fileData.metadata.totalRevenue,
              totalInflow: fileData.metadata.totalInflow,
              totalNewClients: fileData.metadata.totalNewClients,
              totalFastweb: fileData.metadata.totalFastweb || 0
            }
          };
        } catch (error) {
          console.warn(`Errore caricamento dati file ${file.file_date}:`, error);
          // Ritorna file senza dati completi se il caricamento fallisce
          return {
            id: file.id,
            name: file.file_name,
            date: file.file_date,
            displayDate: file.display_date,
            uploadDate: file.upload_date,
            size: file.file_size,
            data: null,
            metadata: {
              totalAgents: file.total_agents,
              totalSMs: file.total_sms,
              totalRevenue: file.total_revenue,
              totalInflow: file.total_inflow,
              totalNewClients: file.total_new_clients,
              totalFastweb: file.total_fastweb
            }
          };
        }
      }));
      
      // *** FIX: Ordina i file per data nel nome, non per data upload ***
      const sortedFiles = sortFilesByDate(processedFiles);
      
      // Crea anche il processedData per compatibilità
      const processedData = {};
      sortedFiles.forEach(file => {
        if (file.data) {
          processedData[file.date] = file.data;
        }
      });
      
      setData(prevData => ({
        ...prevData,
        uploadedFiles: sortedFiles, // ← Usa file ordinati per data
        processedData: processedData
      }));
      
    } catch (error) {
      toast.error('Errore nel caricamento dei file dal server');
      console.error('Load files error:', error);
    } finally {
      setLoading(false);
    } 
  }, [setData]); // ← FIX: Aggiungi dipendenza

  // *** FIX: useEffect ora ha tutte le dipendenze corrette ***
  React.useEffect(() => {
    loadFiles();
  }, [loadFiles]);

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
        toast.error(`❌ Errore nel parsing del file: ${parseResult.error}`, { id: 'upload' });
        return;
      }

      // *** NUOVO: Gestione warnings per campi opzionali mancanti ***
      if (parseResult.data.metadata.warnings && parseResult.data.metadata.warnings.length > 0) {
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
            totalRevenue: parsedData.totals.fatturato,
            totalInflow: parsedData.totals.inflow,
            totalNewClients: parsedData.totals.nuoviClienti,
            totalFastweb: parsedData.totals.fastwebEnergia || 0, // ← Gestisce se non esiste
            parseDate: new Date().toISOString(),
            warnings: parseResult.data.metadata.warnings
          }
        };

        const result = await apiService.saveFile(fileData);

        if (result.success) {
          // Success feedback con dettagli migliorati
          const agentsCount = parsedData.metadata.totalAgents;
          const smCount = parsedData.metadata.totalSMs;
          const totalFatturato = parsedData.totals.fatturato;
          const totalInflow = parsedData.totals.inflow;
          
          const actionText = result.action === 'updated' ? 'aggiornato' : 'caricato';
          toast.success(
            `✅ File ${actionText} con successo!\n` +
            `👥 ${agentsCount} agenti importati\n` +
            `👔 ${smCount} coordinatori\n` +
            `💰 ${formatCurrency(totalFatturato)} fatturato\n` +
            `⚡ ${formatCurrency(totalInflow)} inflow`,
            { id: 'upload', duration: 5000 }
          );

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

          // Ricarica la lista
          await loadFiles();

        } catch (error) {
          toast.error(`Errore nell'eliminazione: ${error.message}`, { id: 'delete' });
          console.error('Delete error:', error);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="file-upload-section">
        <div className="loading-indicator">
          <div className="loading-spinner"></div>
          Caricamento file dal server...
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
                      <span>{formatCurrency(file.metadata.totalInflow)} inflow</span>
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

// Componente Dashboard principale - AGGIORNATO
const Dashboard = () => {
  const { data, selectedFileDate, setSelectedFileDate } = useData();
  const [loading, setLoading] = useState(false);
  
  // Effetto per gestire la selezione del periodo
  React.useEffect(() => {
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
      return { stats: { totalAgents: 0, totalSMs: 0, totalRevenue: 0, totalInflow: 0, totalNewClients: 0, totalFastweb: 0 }, currentFile: null };
    }
    
    const targetFile = selectedFileDate
      ? data.uploadedFiles.find(f => f.date === selectedFileDate)
      : data.uploadedFiles[0];

    // Se il file non si trova, usa il primo come fallback
    const fileToUse = targetFile || data.uploadedFiles[0];

    if (!fileToUse || !fileToUse.metadata) {
      return { stats: { totalAgents: 0, totalSMs: 0, totalRevenue: 0, totalInflow: 0, totalNewClients: 0, totalFastweb: 0 }, currentFile: null };
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
    }, 500); // Simula un caricamento per l'effetto di transizione
  };

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
           <p className="current-period">Nessun periodo disponibile</p>
        )}
      </div>
      
      <div className="stats-grid">
        <div className="stat-card" style={{ animationDelay: '100ms' }}>
          <h3>File Caricati</h3>
          <div className={`stat-number ${loading ? 'loading' : ''}`}>{data.uploadedFiles.length}</div>
        </div>
        
        <div className="stat-card" style={{ animationDelay: '200ms' }}>
          <h3>Totale Agenti</h3>
          <div className={`stat-number ${loading ? 'loading' : ''}`}>{formatNumber(stats.totalAgents)}</div>
        </div>
        
        <div className="stat-card" style={{ animationDelay: '300ms' }}>
          <h3>SM Attivi</h3>
          <div className={`stat-number ${loading ? 'loading' : ''}`}>{formatNumber(stats.totalSMs)}</div>
        </div>
        
        <div className="stat-card" style={{ animationDelay: '400ms' }}>
          <h3>Fatturato Totale</h3>
          <div className={`stat-number ${loading ? 'loading' : ''}`}>{formatCurrency(stats.totalRevenue)}</div>
        </div>
        
        <div className="stat-card" style={{ animationDelay: '500ms' }}>
          <h3>Inflow Totale</h3>
          <div className={`stat-number ${loading ? 'loading' : ''}`}>{formatCurrency(stats.totalInflow)}</div>
        </div>
        
        <div className="stat-card" style={{ animationDelay: '600ms' }}>
          <h3>Nuovi Clienti</h3>
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
      
      {data.uploadedFiles.length === 0 && (
        <div className="welcome-message">
          <h3>👋 Benvenuto nella Dashboard RUSH!</h3>
          <p>Per iniziare, carica il primo file Excel dalla sezione "Gestione File".</p>
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
              <p>Inflow medio: <strong>{formatCurrency(stats.totalInflow / (stats.totalAgents || 1))}</strong></p>
            </div>
            <div className="insight-card">
              <h4>Performance Generale</h4>
              <p>Rapporto Inflow/Fatturato: <strong>{((stats.totalInflow / (stats.totalRevenue || 1)) * 100).toFixed(1)}%</strong></p>
              <p>Nuovi clienti per agente: <strong>{(stats.totalNewClients / (stats.totalAgents || 1)).toFixed(2)}</strong></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente principale con routing
const MainApp = ({ currentUser, onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [data, setData] = useState({
    uploadedFiles: [],
    processedData: {},
    selectedSM: null,
    selectedAgent: null
  });
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [selectedFileDate, setSelectedFileDate] = useState(null);

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
        return <div className="section-placeholder">👥 Dettagli Agenti - Disponibile dopo caricamento componenti avanzati</div>;
      case 'products':
        return <div className="section-placeholder">📦 Analisi Prodotti - Disponibile dopo caricamento componenti avanzati</div>;
      case 'new-clients':
        return <div className="section-placeholder">🆕 Nuovi Clienti - Disponibile dopo caricamento componenti avanzati</div>;
      case 'fastweb':
        return <div className="section-placeholder">⚡ Contratti Fastweb - Disponibile dopo caricamento componenti avanzati</div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <DataContext.Provider value={{ data, setData, selectedFileDate, setSelectedFileDate }}>
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
    </DataContext.Provider>
  );
};

// App principale
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Controlla autenticazione all'avvio
  React.useEffect(() => {
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