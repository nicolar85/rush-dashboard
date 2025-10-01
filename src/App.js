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
import ModernSMRanking from './components/ModernSMRanking'; // Importa la nuova pagina classifica SM
import ModernProductsAnalysis from './components/ModernProductsAnalysis'; // Importa la nuova pagina prodotti
import ModernNewClientsPage from './components/ModernNewClientsPage'; // Importa la nuova pagina clienti
import ModernFastwebPage from './components/ModernFastwebPage'; // Importa la nuova pagina Fastweb
import ModernHistoricalAnalysis from './components/ModernHistoricalAnalysis'; // Importa la pagina Analisi Storica
import ModernSettingsPage from './components/ModernSettingsPage'; // Importa la pagina Impostazioni
import TestPage from './components/TestPage'; // Importa il componente TestPage
import ModernDashboard from './components/ModernDashboard'; // Importa la nuova dashboard
import ModernSidebar from './components/ModernSidebar';
import ModernTopbar from './components/ModernTopbar';
import './App.css';
import './components/ModernDashboard.css'; // 💅 Importa i nuovi stili per la Dashboard
import './components/ModernLogin.css'; // ✨ Importa i nuovi stili per il Login
import './ModernAppLayout.css';


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
  // 🔧 PATCH PER App.js - Sostituire la funzione loadFiles esistente

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
    const processedFiles = files.map((file) => {
      try {
        // ✅ FIX: Usa agents_data invece di file_data
        let fileData = null;
        
        // Prima prova con file_data (nuovo formato)
        if (file.file_data && file.file_data !== 'null') {
          fileData = typeof file.file_data === 'string' 
            ? JSON.parse(file.file_data) 
            : file.file_data;
        }
        // Se non disponibile, ricostruisci dai campi separati (formato legacy)
        else if (file.agents_data && file.agents_data !== 'null') {
          const agents = typeof file.agents_data === 'string' 
            ? JSON.parse(file.agents_data) 
            : file.agents_data;
          
          const smRanking = file.sm_ranking && file.sm_ranking !== 'null'
            ? (typeof file.sm_ranking === 'string' ? JSON.parse(file.sm_ranking) : file.sm_ranking)
            : [];
          
          const existingMetadata = file.metadata && file.metadata !== 'null'
            ? (typeof file.metadata === 'string' ? JSON.parse(file.metadata) : file.metadata)
            : {};

          // Ricostruisci file_data dal formato legacy
          fileData = {
            agents: agents,
            smRanking: smRanking,
            metadata: {
              ...existingMetadata,
              totalAgents: file.total_agents || agents.length || 0,
              totalSMs: file.total_sms || 0,
              totalRevenue: parseFloat(file.total_revenue || 0),
              totalRush: parseFloat(file.total_inflow || file.total_rush || 0),
              totalNewClients: file.total_new_clients || 0,
              totalFastweb: file.total_fastweb || 0,
            }
          };
          
          console.log(`🔨 Ricostruito file_data per ${file.file_date} da campi legacy`);
        }

        // Se ancora non abbiamo dati, usa valori di fallback
        if (!fileData) {
          console.warn(`⚠️ Dati non disponibili per ${file.file_date} - uso fallback`);
          fileData = {
            agents: [],
            smRanking: [],
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

        const metadataSource = fileData?.metadata ?? {};
        const normalizedMetadata = {
          ...metadataSource,
          totalAgents: metadataSource.totalAgents ?? 0,
          totalSMs: metadataSource.totalSMs ?? 0,
          totalRevenue: metadataSource.totalRevenue ?? 0,
          totalRush: metadataSource.totalRush ?? 0,
          totalNewClients: metadataSource.totalNewClients ?? 0,
          totalFastweb: metadataSource.totalFastweb ?? 0
        };

        return {
          id: file.id,
          name: file.file_name,
          date: file.file_date,
          displayDate: file.display_date,
          uploadDate: file.upload_date,
          size: file.file_size,
          data: fileData, // ✅ Ora fileData è sempre popolato
          metadata: normalizedMetadata
        };
      } catch (error) {
        console.warn(`❌ Errore processamento file ${file.file_date}:`, error);
        return {
          id: file.id,
          name: file.file_name,
          date: file.file_date,
          displayDate: file.display_date,
          uploadDate: file.upload_date,
          size: file.file_size,
          data: {
            agents: [],
            smRanking: [],
            metadata: { totalAgents: 0, totalSMs: 0, totalRevenue: 0, totalRush: 0, totalNewClients: 0, totalFastweb: 0 }
          },
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
    });
    
    // Ordina i file per data
    const sortedFiles = sortFilesByDate(processedFiles);
    
    // Crea il processedData per compatibilità
    const processedData = {};
    sortedFiles.forEach(file => {
      if (file.data) {
        processedData[file.date] = file.data;
      }
    });
    
    // Seleziona automaticamente il file più recente se non c'è selezione
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
    console.log(`📊 File con dati: ${Object.keys(processedData).length}`);
    
    if (sortedFiles.length > 0 && newSelectedFileDate) {
      console.log(`📋 File selezionato: ${sortedFiles.find(f => f.date === newSelectedFileDate)?.displayDate || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('❌ Errore nel caricamento globale dei file:', error);
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

// ✨ Componente Login Moderno
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
    <div className="modern-login-container">
      <div className="modern-login-card">
        <div className="modern-login-header">
          <h1>🏆 RUSH</h1>
          <p>Gara di Produzione Agenti</p>
        </div>
        
        <form onSubmit={handleSubmit} className="modern-login-form">
          <div className="modern-form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              placeholder="es. mario.rossi"
              required
            />
          </div>
          
          <div className="modern-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className={`modern-login-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>
        
      </div>
    </div>
  );
};


// Componente File Upload - SEMPLIFICATO (non più responsabile del caricamento globale)
const FileUpload = ({ openDialog, currentUser }) => {
  const { data, loadFiles, globalLoading } = useData();
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(currentUser?.role === 'admin');
  }, [currentUser]);

  // ⚠️ IMPORTANTE: Ora loadFiles è gestito globalmente, non qui

  // *** AGGIORNATO: handleFileUpload per parser dinamico ***
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!isAdmin) {
      // Interfaccia dovrebbe già bloccare il caricamento, manteniamo il controllo come ulteriore salvaguardia
      toast.error('⛔ Solo gli amministratori possono caricare file.', { id: 'upload', duration: 4000 });
      event.target.value = '';
      return;
    }

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
      if (error?.statusCode === 403 || error?.response?.status === 403) {
        // Fallback eccezionale: l'interfaccia dovrebbe già impedire l'azione ai non admin
        toast.error('⛔ Accesso negato. Se hai bisogno di permessi contatta un amministratore.', { id: 'upload', duration: 5000 });
      } else {
        toast.error(`❌ Errore: ${error.message || 'Caricamento fallito'}`, { id: 'upload' });
      }
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (fileDate, fileName) => {
    if (!isAdmin) {
      toast.error('⛔ Solo gli amministratori possono eliminare file.', { id: 'delete', duration: 4000 });
      return;
    }

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
      {isAdmin ? (
        <>
          <h3>📁 Carica File Mensile</h3>
          <div className="upload-area">
            <input
              type="file"
              id="file-upload"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={!isAdmin || uploading}
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
        </>
      ) : (
        <div className="viewer-message">
          <p>Solo gli amministratori possono caricare o eliminare file da questa sezione.</p>
          <p>Contatta un amministratore per richiedere assistenza o l&apos;aggiornamento dei dati.</p>
        </div>
      )}
      
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
                  {isAdmin && (
                    <button
                      className="delete-file-btn"
                      onClick={() => handleDeleteFile(file.date, file.name)}
                      title="Elimina file"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


// Componente principale con routing - AGGIORNATO per usare DataProvider
const MainApp = ({ currentUser, onLogout, isAuthenticated }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    if (isDarkMode) {
      document.documentElement.style.setProperty('color-scheme', 'dark');
    } else {
      document.documentElement.style.setProperty('color-scheme', 'light');
    }
  }, [isDarkMode]);

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
        return <ModernDashboard />;
      case 'files':
        return <FileUpload openDialog={openDialog} currentUser={currentUser} />;
      case 'sm-ranking':
        return <ModernSMRanking />;
      case 'agents':
        return <ModernAgentsPage />;
      case 'products':
        return <ModernProductsAnalysis />;
      case 'new-clients':
        return <ModernNewClientsPage />;
      case 'fastweb':
        return <ModernFastwebPage />;
      case 'historical-analysis':
        return <ModernHistoricalAnalysis setActiveSection={setActiveSection} />;
      case 'settings':
        return <ModernSettingsPage />;
      case 'test':
        return <TestPage />;
      default:
        return <ModernDashboard />;
    }
  };

  return (
    <DataProvider isAuthenticated={isAuthenticated}>
      <div className={`modern-app-container ${isDarkMode ? 'dark' : ''}`}>
        <ModernSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          currentUser={currentUser}
          onLogout={onLogout}
          isMobile={isMobile}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />

        <div className="main-app-area">
          <ModernTopbar
            activeSection={activeSection}
            isMobile={isMobile}
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            currentUser={currentUser}
            isDarkMode={isDarkMode}
          />

          <main className={`modern-main-content ${isDarkMode ? 'dark' : ''}`}>
            {renderContent()}
          </main>
        </div>

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
        let user = null;

        if (apiService.isAuthenticated()) {
          user = apiService.getCurrentUser();

          if (!user) {
            const session = await apiService.restoreSession();
            if (session.success) {
              user = session.user;
            }
          }
        } else {
          const session = await apiService.restoreSession();
          if (session.success) {
            user = session.user;
          }
        }

        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);

          // Test connessione API
          try {
            await apiService.healthCheck();
            console.log('✅ Connessione API verificata');
          } catch (error) {
            console.warn('⚠️ Problema connessione API:', error);
            toast.error('Connessione al server instabile');
          }
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
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