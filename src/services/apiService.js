/**
 * API Service per RUSH Dashboard
 * Gestisce tutte le chiamate al backend PHP/MySQL
 */

// ✅ SOLUZIONE: Usa sempre l'API di produzione per evitare problemi localhost
const API_BASE_URL = 'https://rush.nicolaruotolo.it/api';

// 🔄 ALTERNATIVA: Se vuoi distinguere sviluppo/produzione
// const API_BASE_URL = process.env.NODE_ENV === 'production'
//   ? 'https://rush.nicolaruotolo.it/api'        // Produzione
//   : 'https://rush.nicolaruotolo.it/api';       // Anche in sviluppo usa produzione

const isProduction = process.env.NODE_ENV === 'production';
const logDebug = (...args) => {
  if (!isProduction) {
    console.log(...args);
  }
};
const logError = (...args) => {
  if (!isProduction) {
    console.error(...args);
  }
};
const logWarn = (...args) => {
  if (!isProduction) {
    console.warn(...args);
  }
};

class ApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

class ApiService {
  constructor() {
    this.token = null;
    this.currentUser = null;
    this.expiresAt = null;
    this.sessionActive = false;
    this.baseURL = API_BASE_URL;

    // 🐛 DEBUG: Mostra quale URL sta usando
    logDebug(`🔗 API URL configurata: ${this.baseURL}`);
    logDebug(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  }

  /**
   * Effettua una richiesta HTTP con gestione completa degli errori
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}/${endpoint.replace(/^\//, '')}`;

    const {
      skipAuthErrorHandling = false,
      headers: customHeaders = {},
      ...fetchOptions
    } = options;

    const isFormData = fetchOptions.body instanceof FormData;

    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...this.getAuthHeaders(),
      ...customHeaders,
    };

    const config = {
      ...fetchOptions,
      headers,
      credentials: fetchOptions.credentials || 'include',
    };

    try {
      logDebug(`🚀 API Request: ${config.method || 'GET'} ${url}`);

      const response = await fetch(url, config);
      
      // 🐛 DEBUG: Mostra la risposta
      logDebug(`📡 Response Status: ${response.status} ${response.statusText}`);
      
      const data = await response.json();

      if (!response.ok) {
        // Se token non valido, logout automatico
        if (response.status === 401) {
          if (skipAuthErrorHandling) {
            this.clearSession();
          } else {
            this.handleAuthError();
          }
        }

        throw new ApiError(data.error || 'Errore della richiesta', response.status, data);
      }

      logDebug(`✅ API Response: ${endpoint}`, data);
      return data;
      
    } catch (error) {
      logError(`❌ API Error: ${endpoint}`, error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Errori di rete o CORS
      if (error instanceof TypeError && error.message.includes('fetch')) {
        logError(`🌐 Network Error: Impossibile raggiungere ${url}`);
        logError('📋 Possibili cause:');
        logError('   - Server non raggiungibile');
        logError('   - Problemi CORS');
        logError('   - Connessione internet assente');
        
        throw new ApiError(
          'Errore di connessione. Controlla la connessione internet.', 
          0
        );
      }
      
      throw new ApiError('Errore di comunicazione con il server', 0, error);
    }
  }

  /**
   * Gestisce errori di autenticazione
   */
  handleAuthError({ shouldReload = true } = {}) {
    logWarn('🔒 Token non valido, logout automatico');
    this.clearSession();
    if (shouldReload) {
      window.location.reload();
    }
  }

  /**
   * Headers per autenticazione
   */
  getAuthHeaders() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  clearSession() {
    this.token = null;
    this.currentUser = null;
    this.expiresAt = null;
    this.sessionActive = false;
  }

  /**
   * Salva il token di autenticazione
   */
  setToken(token) {
    this.token = token || null;
  }

  // ================================
  // AUTHENTICATION METHODS
  // ================================

  /**
   * Login utente
   */
  async login(username, password) {
    try {
      logDebug(`🔐 Tentativo login per: ${username}`);
      
      const response = await this.makeRequest('login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (!response.success) {
        throw new Error(response.error || 'Login fallito');
      }

      this.setToken(response.token || null);
      this.currentUser = response.user || null;
      this.expiresAt = response.expires_at || null;
      this.sessionActive = true;

      logDebug('✅ Login successful:', response.user);

      return {
        success: true,
        user: this.currentUser,
        token: this.token
      };

    } catch (error) {
      logError('❌ Login failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Logout utente
   */
  async logout() {
    try {
      await this.makeRequest('logout', { method: 'POST', skipAuthErrorHandling: true });
    } catch (error) {
      logWarn('Errore durante logout:', error);
    } finally {
      this.clearSession();
    }
  }

  /**
   * Controlla se l'utente è autenticato
   */
  isAuthenticated() {
    if (this.token) {
      if (this.expiresAt && new Date(this.expiresAt) <= new Date()) {
        this.clearSession();
        return false;
      }
      return true;
    }

    if (this.sessionActive) {
      if (this.expiresAt && new Date(this.expiresAt) <= new Date()) {
        this.clearSession();
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Ottieni utente corrente
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Prova a ripristinare una sessione attiva utilizzando cookie/token
   */
  async restoreSession() {
    try {
      const response = await this.makeRequest('profile', { skipAuthErrorHandling: true });

      if (!response) {
        this.clearSession();
        return { success: false };
      }

      const user = response.user || response.profile || response.data || null;

      if (!user) {
        this.clearSession();
        return { success: false };
      }

      this.currentUser = user;
      this.sessionActive = true;

      if (response.token) {
        this.setToken(response.token);
      }

      if (response.expires_at) {
        this.expiresAt = response.expires_at;
      }

      return { success: true, user };

    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        this.clearSession();
        return { success: false };
      }

      throw error;
    }
  }

  /**
   * Cambia password
   */
  async changePassword(currentPassword, newPassword) {
    return await this.makeRequest('change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      }),
    });
  }

  // ================================
  // FILE MANAGEMENT METHODS
  // ================================

  /**
   * Carica tutti i file dal server
   */
  async loadFiles() {
    try {
      const response = await this.makeRequest('uploads');
      logDebug('📁 Files loaded from server:', response.files?.length || 0);
      return response.files || [];
    } catch (error) {
      logError('❌ Error loading files:', error);
      throw error;
    }
  }

  /**
   * Carica dati completi di un file specifico
   */
  async getFileData(fileDate) {
    try {
      const response = await this.makeRequest(`file-data/${fileDate}`);
      logDebug(`📊 File data loaded for ${fileDate}:`, response);
      return response;
    } catch (error) {
      logError(`❌ Error loading file data for ${fileDate}:`, error);
      throw error;
    }
  }

  /**
   * Salva/aggiorna un file sul server
   */
  async saveFile(fileData) {
    try {
      logDebug('💾 Saving file:', fileData.name, fileData.date);
      
      const response = await this.makeRequest('upload', {
        method: 'POST',
        body: JSON.stringify({ fileData }),
      });
      
      logDebug('✅ File saved successfully:', response);
      return response;
    } catch (error) {
      logError('❌ Error saving file:', error);
      throw error;
    }
  }

  /**
   * Elimina un file dal server
   */
  async deleteFile(fileDate) {
    try {
      logDebug(`🗑️ Deleting file: ${fileDate}`);
      
      const response = await this.makeRequest(`uploads/${fileDate}`, {
        method: 'DELETE',
      });
      
      logDebug('✅ File deleted successfully:', response);
      return response;
    } catch (error) {
      logError(`❌ Error deleting file ${fileDate}:`, error);
      throw error;
    }
  }

  /**
   * Carica un file Excel con FormData (per upload con file binario)
   */
  async uploadFile(file, parsedData) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('data', JSON.stringify(parsedData));
      
      logDebug('📤 Uploading file:', file.name);
      
      const response = await this.makeRequest('upload-file', {
        method: 'POST',
        body: formData,
        headers: {
          // Non impostare Content-Type per FormData - il browser lo fa automaticamente
          ...this.getAuthHeaders()
        }
      });
      
      logDebug('✅ File uploaded successfully:', response);
      return response;
    } catch (error) {
      logError('❌ Error uploading file:', error);
      throw error;
    }
  }

  // ================================
  // DASHBOARD METHODS
  // ================================

  /**
   * Ottieni statistiche dashboard generali
   */
  async getDashboardStats() {
    try {
      const response = await this.makeRequest('dashboard/stats');
      logDebug('📈 Dashboard stats loaded:', response);
      return response;
    } catch (error) {
      logError('❌ Error loading dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Ottieni statistiche per un periodo specifico
   */
  async getStatsForPeriod(startDate, endDate) {
    try {
      const response = await this.makeRequest(`stats/period?start=${startDate}&end=${endDate}`);
      logDebug(`📊 Period stats loaded (${startDate} - ${endDate}):`, response);
      return response;
    } catch (error) {
      logError('❌ Error loading period stats:', error);
      throw error;
    }
  }

  /**
   * Ottieni ranking SM
   */
  async getSMRanking(fileDate = null) {
    try {
      const endpoint = fileDate ? `sm-ranking/${fileDate}` : 'sm-ranking';
      const response = await this.makeRequest(endpoint);
      logDebug('🏅 SM ranking loaded:', response);
      return response;
    } catch (error) {
      logError('❌ Error loading SM ranking:', error);
      throw error;
    }
  }

  /**
   * Ottieni dettagli agenti
   */
  async getAgentsDetails(fileDate = null) {
    try {
      const endpoint = fileDate ? `agents/${fileDate}` : 'agents';
      const response = await this.makeRequest(endpoint);
      logDebug('👥 Agents details loaded:', response);
      return response;
    } catch (error) {
      logError('❌ Error loading agents details:', error);
      throw error;
    }
  }

  /**
   * Ottieni analisi prodotti
   */
  async getProductsAnalysis(fileDate = null) {
    try {
      const endpoint = fileDate ? `products/${fileDate}` : 'products';
      const response = await this.makeRequest(endpoint);
      logDebug('📦 Products analysis loaded:', response);
      return response;
    } catch (error) {
      logError('❌ Error loading products analysis:', error);
      throw error;
    }
  }

  /**
   * Ottieni dati nuovi clienti
   */
  async getNewClientsData(fileDate = null) {
    try {
      const endpoint = fileDate ? `new-clients/${fileDate}` : 'new-clients';
      const response = await this.makeRequest(endpoint);
      logDebug('🆕 New clients data loaded:', response);
      return response;
    } catch (error) {
      logError('❌ Error loading new clients data:', error);
      throw error;
    }
  }

  /**
   * Ottieni dati Fastweb Energia
   */
  async getFastwebData(fileDate = null) {
    try {
      const endpoint = fileDate ? `fastweb/${fileDate}` : 'fastweb';
      const response = await this.makeRequest(endpoint);
      logDebug('⚡ Fastweb data loaded:', response);
      return response;
    } catch (error) {
      logError('❌ Error loading Fastweb data:', error);
      throw error;
    }
  }

  // ================================
  // USER PROFILE METHODS
  // ================================

  /**
   * Ottieni profilo utente
   */
  async getUserProfile() {
    try {
      const response = await this.makeRequest('profile');
      logDebug('👤 User profile loaded:', response);
      return response;
    } catch (error) {
      logError('❌ Error loading user profile:', error);
      throw error;
    }
  }

  /**
   * Aggiorna profilo utente
   */
  async updateUserProfile(profileData) {
    try {
      const response = await this.makeRequest('profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      logDebug('✅ User profile updated:', response);
      return response;
    } catch (error) {
      logError('❌ Error updating user profile:', error);
      throw error;
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Test connessione API (health check)
   */
  async healthCheck() {
    try {
      const response = await this.makeRequest('health');
      logDebug('💚 API health check passed:', response);
      return response;
    } catch (error) {
      logError('❤️‍🩹 API health check failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ottieni versione API e info sistema
   */
  async getSystemInfo() {
    try {
      const response = await this.makeRequest('system-info');
      logDebug('ℹ️ System info loaded:', response);
      return response;
    } catch (error) {
      logError('❌ Error loading system info:', error);
      throw error;
    }
  }

  /**
   * Cleanup sistema (solo admin)
   */
  async cleanup() {
    try {
      const response = await this.makeRequest('cleanup', {
        method: 'POST',
      });
      logDebug('🧹 System cleanup completed:', response);
      return response;
    } catch (error) {
      logError('❌ Error during system cleanup:', error);
      throw error;
    }
  }

  /**
   * Download backup dati completo (client-side)
   */
  async exportData() {
    try {
      logDebug('📥 Starting data export...');
      
      const files = await this.loadFiles();
      const fullData = {};
      
      // Carica dati completi per ogni file
      for (const file of files) {
        try {
          const fileData = await this.getFileData(file.file_date);
          fullData[file.file_date] = {
            fileInfo: {
              name: file.file_name,
              displayDate: file.display_date,
              uploadDate: file.upload_date,
              size: file.file_size
            },
            ...fileData
          };
        } catch (error) {
          logWarn(`⚠️ Errore caricamento file ${file.file_date}:`, error);
        }
      }
      
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        files: fullData,
        metadata: {
          totalFiles: files.length,
          exportedBy: this.getCurrentUser()?.username
        }
      };
      
      // Crea e scarica file JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rush-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      logDebug('✅ Data export completed successfully');
      return { success: true, message: 'Export completato con successo' };
      
    } catch (error) {
      logError('❌ Error during data export:', error);
      throw error;
    }
  }

  /**
   * Import dati da backup JSON
   */
  async importData(backupFile) {
    try {
      logDebug('📤 Starting data import...');
      
      const formData = new FormData();
      formData.append('backup', backupFile);
      
      const response = await this.makeRequest('import', {
        method: 'POST',
        body: formData,
        headers: {
          ...this.getAuthHeaders()
        }
      });
      
      logDebug('✅ Data import completed:', response);
      return response;
      
    } catch (error) {
      logError('❌ Error during data import:', error);
      throw error;
    }
  }

  /**
   * Ottieni logs attività (solo admin)
   */
  async getActivityLogs(limit = 100, offset = 0) {
    try {
      const response = await this.makeRequest(`logs?limit=${limit}&offset=${offset}`);
      logDebug('📋 Activity logs loaded:', response);
      return response;
    } catch (error) {
      logError('❌ Error loading activity logs:', error);
      throw error;
    }
  }

  /**
   * Cerca nei dati
   */
  async search(query, filters = {}) {
    try {
      const response = await this.makeRequest('search', {
        method: 'POST',
        body: JSON.stringify({ query, filters }),
      });
      logDebug('🔍 Search completed:', response);
      return response;
    } catch (error) {
      logError('❌ Error during search:', error);
      throw error;
    }
  }

  // ================================
  // ADMIN METHODS
  // ================================

  /**
   * Ottieni tutti gli utenti (solo admin)
   */
  async getUsers() {
    const response = await this.makeRequest('users');
    // Il backend ora restituisce correttamente un oggetto con una chiave 'users'.
    if (response && Array.isArray(response.users)) {
      return response.users;
    }
    // Fallback per risposte non valide o vuote.
    return [];
  }

  /**
   * Aggiorna il ruolo di un utente (solo admin)
   */
  async updateUserRole(userId, role) {
    return await this.makeRequest(`users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  /**
   * Aggiorna la password di un utente (solo admin)
   */
  async adminUpdateUserPassword(userId, newPassword) {
    return await this.makeRequest(`users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ new_password: newPassword }),
    });
  }

  /**
   * Crea un nuovo utente (solo admin)
   */
  async createUser(userData) {
    return await this.makeRequest('users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Elimina un utente (solo admin)
   */
  async deleteUser(userId) {
    return await this.makeRequest(`users/${userId}`, {
      method: 'DELETE',
    });
  }


  // ================================
  // BATCH OPERATIONS
  // ================================

  /**
   * Operazioni batch su più file
   */
  async batchOperation(operation, fileIds, options = {}) {
    try {
      const response = await this.makeRequest('batch', {
        method: 'POST',
        body: JSON.stringify({
          operation,
          fileIds,
          options
        }),
      });
      logDebug(`✅ Batch operation '${operation}' completed:`, response);
      return response;
    } catch (error) {
      logError(`❌ Error during batch operation '${operation}':`, error);
      throw error;
    }
  }
}

// Crea istanza singleton
export const apiService = new ApiService();
