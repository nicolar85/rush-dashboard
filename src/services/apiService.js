/**
 * API Service per RUSH Dashboard
 * Gestisce tutte le chiamate al backend PHP
 */

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://rush.nicolaruotolo.it/api'  // 👈 IL TUO DOMINIO
  : 'http://localhost/rush-dashboard/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('rush_token');
    this.baseURL = API_BASE_URL;
  }

  /**
   * Effettua una richiesta HTTP
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
      
      // Errori di rete
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError('Errore di connessione. Controlla la connessione internet.', 0);
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
      const response = await this.makeRequest('login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (response.success && response.token) {
        this.setToken(response.token);
        localStorage.setItem('rush_user', JSON.stringify(response.user));
        localStorage.setItem('rush_expires', response.expires_at);
        
        return {
          success: true,
          user: response.user,
          token: response.token
        };
      }
      
      throw new Error(response.error || 'Login fallito');
      
    } catch (error) {
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
   * Carica tutti i file
   */
  async loadFiles() {
    const response = await this.makeRequest('uploads');
    return response.files || [];
  }

  /**
   * Carica dati completi di un file
   */
  async getFileData(fileDate) {
    const response = await this.makeRequest(`file-data/${fileDate}`);
    return response;
  }

  /**
   * Salva/aggiorna un file
   */
  async saveFile(fileData) {
    return await this.makeRequest('upload', {
      method: 'POST',
      body: JSON.stringify({ fileData }),
    });
  }

  /**
   * Elimina un file
   */
  async deleteFile(fileDate) {
    return await this.makeRequest(`uploads/${fileDate}`, {
      method: 'DELETE',
    });
  }

  /**
   * Rinomina un file
   */
  async renameFile(fileDate, newName) {
    return await this.makeRequest('uploads/rename', {
      method: 'POST',
      body: JSON.stringify({
        file_date: fileDate,
        new_name: newName,
      }),
    });
  }

  // ================================
  // DASHBOARD METHODS
  // ================================

  /**
   * Ottieni statistiche dashboard
   */
  async getDashboardStats() {
    return await this.makeRequest('stats');
  }

  /**
   * Ottieni profilo utente
   */
  async getUserProfile() {
    return await this.makeRequest('profile');
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Test connessione API
   */
  async healthCheck() {
    return await this.makeRequest('health');
  }

  /**
   * Cleanup sistema (solo admin)
   */
  async cleanup() {
    return await this.makeRequest('cleanup', {
      method: 'POST',
    });
  }

  /**
   * Download backup dati (client-side)
   */
  async exportData() {
    try {
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
          console.warn(`Errore caricamento file ${file.file_date}:`, error);
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rush-dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return { success: true, message: 'Export completato' };
      
    } catch (error) {
      throw new ApiError('Errore durante l\'export dei dati', 0, error);
    }
  }
}

/**
 * Classe per errori API personalizzati
 */
class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /**
   * Controlla se è un errore di autenticazione
   */
  isAuthError() {
    return this.status === 401;
  }

  /**
   * Controlla se è un errore di permessi
   */
  isPermissionError() {
    return this.status === 403;
  }

  /**
   * Controlla se è un errore di validazione
   */
  isValidationError() {
    return this.status === 400;
  }

  /**
   * Controlla se è un errore del server
   */
  isServerError() {
    return this.status >= 500;
  }

  /**
   * Controlla se è un errore di rete
   */
  isNetworkError() {
    return this.status === 0;
  }
}

// Esporta istanza singleton
export const apiService = new ApiService();
export { ApiError };

// Esporta anche la classe per testing
export default ApiService;