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
    this.token = localStorage.getItem('rush_token');
    this.baseURL = API_BASE_URL;
    
    // 🐛 DEBUG: Mostra quale URL sta usando
    console.log(`🔗 API URL configurata: ${this.baseURL}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  }

  /**
   * Effettua una richiesta HTTP con gestione completa degli errori
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}/${endpoint.replace(/^\//, '')}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      console.log(`🚀 API Request: ${config.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      // 🐛 DEBUG: Mostra la risposta
      console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
      
      const data = await response.json();

      if (!response.ok) {
        // Se token non valido, logout automatico
        if (response.status === 401 && this.token) {
          this.handleAuthError();
        }
        
        throw new ApiError(data.error || 'Errore della richiesta', response.status, data);
      }

      console.log(`✅ API Response: ${endpoint}`, data);
      return data;
      
    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Errori di rete o CORS
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(`🌐 Network Error: Impossibile raggiungere ${url}`);
        console.error('📋 Possibili cause:');
        console.error('   - Server non raggiungibile');
        console.error('   - Problemi CORS');
        console.error('   - Connessione internet assente');
        
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
  handleAuthError() {
    console.warn('🔒 Token non valido, logout automatico');
    this.logout();
    window.location.reload();
  }

  /**
   * Headers per autenticazione
   */
  getAuthHeaders() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  /**
   * Salva il token di autenticazione
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('rush_token', token);
    } else {
      localStorage.removeItem('rush_token');
    }
  }

  // ================================
  // AUTHENTICATION METHODS
  // ================================

  /**
   * Login utente
   */
  async login(username, password) {
    try {
      console.log(`🔐 Tentativo login per: ${username}`);
      
      const response = await this.makeRequest('login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (response.success && response.token) {
        this.setToken(response.token);
        localStorage.setItem('rush_user', JSON.stringify(response.user));
        localStorage.setItem('rush_expires', response.expires_at);
        
        console.log('✅ Login successful:', response.user);
        
        return {
          success: true,
          user: response.user,
          token: response.token
        };
      }
      
      throw new Error(response.error || 'Login fallito');
      
    } catch (error) {
      console.error('❌ Login failed:', error);
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
      if (this.token) {
        await this.makeRequest('logout', { method: 'POST' });
      }
    } catch (error) {
      console.warn('Errore durante logout:', error);
    } finally {
      this.setToken(null);
      localStorage.removeItem('rush_user');
      localStorage.removeItem('rush_expires');
    }
  }

  /**
   * Controlla se l'utente è autenticato
   */
  isAuthenticated() {
    if (!this.token) return false;
    
    const expires = localStorage.getItem('rush_expires');
    if (expires && new Date(expires) <= new Date()) {
      this.logout();
      return false;
    }
    
    return true;
  }

  /**
   * Ottieni utente corrente
   */
  getCurrentUser() {
    const user = localStorage.getItem('rush_user');
    return user ? JSON.parse(user) : null;
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
      console.log('📁 Files loaded from server:', response.files?.length || 0);
      return response.files || [];
    } catch (error) {
      console.error('❌ Error loading files:', error);
      throw error;
    }
  }

  /**
   * Carica dati completi di un file specifico
   */
  async getFileData(fileDate) {
    try {
      const response = await this.makeRequest(`file-data/${fileDate}`);
      console.log(`📊 File data loaded for ${fileDate}:`, response);
      return response;
    } catch (error) {
      console.error(`❌ Error loading file data for ${fileDate}:`, error);
      throw error;
    }
  }

  /**
   * Salva/aggiorna un file sul server
   */
  async saveFile(fileData) {
    try {
      console.log('💾 Saving file:', fileData.name, fileData.date);
      
      const response = await this.makeRequest('upload', {
        method: 'POST',
        body: JSON.stringify({ fileData }),
      });
      
      console.log('✅ File saved successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Error saving file:', error);
      throw error;
    }
  }

  /**
   * Elimina un file dal server
   */
  async deleteFile(fileDate) {
    try {
      console.log(`🗑️ Deleting file: ${fileDate}`);
      
      const response = await this.makeRequest(`uploads/${fileDate}`, {
        method: 'DELETE',
      });
      
      console.log('✅ File deleted successfully:', response);
      return response;
    } catch (error) {
      console.error(`❌ Error deleting file ${fileDate}:`, error);
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
      
      console.log('📤 Uploading file:', file.name);
      
      const response = await this.makeRequest('upload-file', {
        method: 'POST',
        body: formData,
        headers: {
          // Non impostare Content-Type per FormData - il browser lo fa automaticamente
          ...this.getAuthHeaders()
        }
      });
      
      console.log('✅ File uploaded successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Error uploading file:', error);
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
      console.log('📈 Dashboard stats loaded:', response);
      return response;
    } catch (error) {
      console.error('❌ Error loading dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Ottieni statistiche per un periodo specifico
   */
  async getStatsForPeriod(startDate, endDate) {
    try {
      const response = await this.makeRequest(`stats/period?start=${startDate}&end=${endDate}`);
      console.log(`📊 Period stats loaded (${startDate} - ${endDate}):`, response);
      return response;
    } catch (error) {
      console.error('❌ Error loading period stats:', error);
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
      console.log('🏅 SM ranking loaded:', response);
      return response;
    } catch (error) {
      console.error('❌ Error loading SM ranking:', error);
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
      console.log('👥 Agents details loaded:', response);
      return response;
    } catch (error) {
      console.error('❌ Error loading agents details:', error);
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
      console.log('📦 Products analysis loaded:', response);
      return response;
    } catch (error) {
      console.error('❌ Error loading products analysis:', error);
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
      console.log('🆕 New clients data loaded:', response);
      return response;
    } catch (error) {
      console.error('❌ Error loading new clients data:', error);
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
      console.log('⚡ Fastweb data loaded:', response);
      return response;
    } catch (error) {
      console.error('❌ Error loading Fastweb data:', error);
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
      console.log('👤 User profile loaded:', response);
      return response;
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
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
      console.log('✅ User profile updated:', response);
      return response;
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
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
      console.log('💚 API health check passed:', response);
      return response;
    } catch (error) {
      console.error('❤️‍🩹 API health check failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ottieni versione API e info sistema
   */
  async getSystemInfo() {
    try {
      const response = await this.makeRequest('system-info');
      console.log('ℹ️ System info loaded:', response);
      return response;
    } catch (error) {
      console.error('❌ Error loading system info:', error);
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
      console.log('🧹 System cleanup completed:', response);
      return response;
    } catch (error) {
      console.error('❌ Error during system cleanup:', error);
      throw error;
    }
  }

  /**
   * Download backup dati completo (client-side)
   */
  async exportData() {
    try {
      console.log('📥 Starting data export...');
      
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
          console.warn(`⚠️ Errore caricamento file ${file.file_date}:`, error);
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
      
      console.log('✅ Data export completed successfully');
      return { success: true, message: 'Export completato con successo' };
      
    } catch (error) {
      console.error('❌ Error during data export:', error);
      throw error;
    }
  }

  /**
   * Import dati da backup JSON
   */
  async importData(backupFile) {
    try {
      console.log('📤 Starting data import...');
      
      const formData = new FormData();
      formData.append('backup', backupFile);
      
      const response = await this.makeRequest('import', {
        method: 'POST',
        body: formData,
        headers: {
          ...this.getAuthHeaders()
        }
      });
      
      console.log('✅ Data import completed:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error during data import:', error);
      throw error;
    }
  }

  /**
   * Ottieni logs attività (solo admin)
   */
  async getActivityLogs(limit = 100, offset = 0) {
    try {
      const response = await this.makeRequest(`logs?limit=${limit}&offset=${offset}`);
      console.log('📋 Activity logs loaded:', response);
      return response;
    } catch (error) {
      console.error('❌ Error loading activity logs:', error);
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
      console.log('🔍 Search completed:', response);
      return response;
    } catch (error) {
      console.error('❌ Error during search:', error);
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
      console.log(`✅ Batch operation '${operation}' completed:`, response);
      return response;
    } catch (error) {
      console.error(`❌ Error during batch operation '${operation}':`, error);
      throw error;
    }
  }
}

// Crea istanza singleton
export const apiService = new ApiService();