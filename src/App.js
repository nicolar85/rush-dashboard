import React, { useState, createContext, useContext } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import toast, { Toaster } from 'react-hot-toast';

// Import dei servizi
import { apiService } from './services/apiService';
// Import del parser Excel
import { parseExcelFile, formatCurrency, formatNumber } from './utils/excelParser';
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
const Sidebar = ({ activeSection, setActiveSection, currentUser, onLogout }) => {
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
    if (window.confirm('Sei sicuro di voler uscire?')) {
      await onLogout();
    }
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

// Componente File Upload
const FileUpload = () => {
  const { data, setData } = useData();
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carica file all'avvio
  React.useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
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
              totalAgents: file.total_agents,
              totalSMs: file.total_sms,
              totalRevenue: file.total_revenue,
              totalInflow: file.total_inflow,
              totalNewClients: file.total_new_clients,
              totalFastweb: file.total_fastweb
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
      
      // Crea anche il processedData per compatibilità
      const processedData = {};
      processedFiles.forEach(file => {
        if (file.data) {
          processedData[file.date] = file.data;
        }
      });
      
      setData(prevData => ({
        ...prevData,
        uploadedFiles: processedFiles,
        processedData: processedData
      }));
      
    } catch (error) {
      toast.error('Errore nel caricamento dei file dal server');
      console.error('Load files error:', error);
    } finally {
      setLoading(false);
    }
  };

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

      // Parsing del file Excel
      const parseResult = await parseExcelFile(file);
      
      if (!parseResult.success) {
        toast.error(`Errore nel parsing: ${parseResult.error}`, { id: 'upload' });
        return;
      }

      const { data: parsedData } = parseResult;
      const fileDate = parsedData.fileInfo.dateInfo.dateString;

      // Controlla duplicati localmente
      const existingFile = data.uploadedFiles.find(f => f.date === fileDate);
      
      if (existingFile) {
        toast.dismiss('upload');
        const confirm = window.confirm(
          `Esiste già un file per ${parsedData.fileInfo.dateInfo.displayDate}. Vuoi sovrascriverlo?`
        );
        if (!confirm) return;
        toast.loading('Aggiornamento file...', { id: 'upload' });
      } else {
        toast.loading('Caricamento file sul server...', { id: 'upload' });
      }

      // Prepara dati per API
      const fileData = {
        name: file.name,
        date: fileDate,
        displayDate: parsedData.fileInfo.dateInfo.displayDate,
        size: file.size,
        data: parsedData,
        metadata: {
          totalAgents: parsedData.metadata.totalAgents,
          totalSMs: parsedData.metadata.totalSMs,
          parseDate: new Date().toISOString()
        }
      };

      // Salva nel database tramite API
      const result = await apiService.saveFile(fileData);
      
      if (result.success) {
        const actionText = result.action === 'updated' ? 'aggiornato' : 'caricato';
        toast.success(
          `File ${actionText} con successo! ${result.stats?.total_agents || 0} agenti importati`, 
          { id: 'upload' }
        );
        
        // Ricarica la lista files dal server
        await loadFiles();
      } else {
        throw new Error(result.error || 'Errore sconosciuto durante il caricamento');
      }

    } catch (error) {
      toast.error(`Errore: ${error.message || 'Caricamento fallito'}`, { id: 'upload' });
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (fileDate, fileName) => {
    if (!window.confirm(`Sei sicuro di voler eliminare il file ${fileName}?`)) {
      return;
    }

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

// Componente Dashboard principale
const Dashboard = () => {
  const { data } = useData();
  
  // Calcola le statistiche dai dati caricati
  const stats = React.useMemo(() => {
    if (data.uploadedFiles.length === 0) {
      return { totalAgents: 0, totalSMs: 0, totalRevenue: 0, totalInflow: 0 };
    }
    
    // Prendi il file più recente
    const latestFile = data.uploadedFiles[0];
    if (!latestFile.metadata) {
      return { totalAgents: 0, totalSMs: 0, totalRevenue: 0, totalInflow: 0 };
    }
    
    return {
      totalAgents: latestFile.metadata.totalAgents,
      totalSMs: latestFile.metadata.totalSMs,
      totalRevenue: latestFile.metadata.totalRevenue,
      totalInflow: latestFile.metadata.totalInflow,
      totalNewClients: latestFile.metadata.totalNewClients,
      totalFastweb: latestFile.metadata.totalFastweb
    };
  }, [data.uploadedFiles]);
  
  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h2>📊 Dashboard Generale</h2>
        {data.uploadedFiles.length > 0 && (
          <p className="current-period">
            Periodo corrente: <strong>{data.uploadedFiles[0].displayDate}</strong>
          </p>
        )}
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>File Caricati</h3>
          <div className="stat-number">{data.uploadedFiles.length}</div>
        </div>
        
        <div className="stat-card">
          <h3>Totale Agenti</h3>
          <div className="stat-number">{formatNumber(stats.totalAgents)}</div>
        </div>
        
        <div className="stat-card">
          <h3>SM Attivi</h3>
          <div className="stat-number">{formatNumber(stats.totalSMs)}</div>
        </div>
        
        <div className="stat-card">
          <h3>Fatturato Totale</h3>
          <div className="stat-number">{formatCurrency(stats.totalRevenue)}</div>
        </div>
        
        <div className="stat-card">
          <h3>Inflow Totale</h3>
          <div className="stat-number">{formatCurrency(stats.totalInflow)}</div>
        </div>
        
        <div className="stat-card">
          <h3>Nuovi Clienti</h3>
          <div className="stat-number">{formatNumber(stats.totalNewClients)}</div>
        </div>
        
        <div className="stat-card">
          <h3>Contratti Fastweb</h3>
          <div className="stat-number">{formatNumber(stats.totalFastweb)}</div>
        </div>
      </div>
      
      {data.uploadedFiles.length === 0 && (
        <div className="welcome-message">
          <h3>👋 Benvenuto nella Dashboard RUSH!</h3>
          <p>Per iniziare, carica il primo file Excel dalla sezione "Gestione File".</p>
        </div>
      )}
      
      {data.uploadedFiles.length > 0 && (
        <div className="quick-insights">
          <h3>📈 Insights Rapidi</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <h4>File Più Recente</h4>
              <p>Caricato: <strong>{data.uploadedFiles[0]?.displayDate}</strong></p>
            </div>
            <div className="insight-card">
              <h4>Media per Agente</h4>
              <p>Fatturato medio: <strong>{formatCurrency(stats.totalRevenue / (stats.totalAgents || 1))}</strong></p>
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

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'files':
        return <FileUpload />;
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
    <DataContext.Provider value={{ data, setData }}>
      <div className="app-layout">
        <Sidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection}
          currentUser={currentUser}
          onLogout={onLogout}
        />
        <main className="main-content">
          <div className="content-container">
            {renderContent()}
          </div>
        </main>
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