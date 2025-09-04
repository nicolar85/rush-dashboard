import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import './ModernSettingsPage.css';
import { Shield, KeyRound, Edit, Trash, UserPlus, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationDialog from './ConfirmationDialog'; // Assumendo che esista un ConfirmationDialog

const UserModal = ({ user, onClose, onSave, isPasswordModal }) => {
    const [role, setRole] = useState(user?.role);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSave = async () => {
        if (isPasswordModal) {
            if (password !== confirmPassword || !password) {
                toast.error('Le password non coincidono o sono vuote.');
                return;
            }
            onSave(user.id, { password });
        } else {
            onSave(user.id, { role });
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={onClose}><X size={24} /></button>
                <h2>{isPasswordModal ? `Modifica Password per ${user.username}` : `Modifica Ruolo per ${user.username}`}</h2>

                {isPasswordModal ? (
                    <>
                        <div className="form-group">
                            <label>Nuova Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Conferma Nuova Password</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                    </>
                ) : (
                    <div className="form-group">
                        <label>Ruolo</label>
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="admin">Admin</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    </div>
                )}

                <div className="modal-actions">
                    <button onClick={onClose} className="btn btn-secondary">Annulla</button>
                    <button onClick={handleSave} className="btn btn-primary">Salva</button>
                </div>
            </div>
        </div>
    );
};


const ModernSettingsPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
      try {
        setLoading(true);
        const fetchedUsers = await apiService.getUsers();
        setUsers(fetchedUsers);
        setError(null);
      } catch (err) {
        setError('Impossibile caricare gli utenti.');
        toast.error('Impossibile caricare gli utenti.');
        console.error(err);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openModal = (user, type) => {
      setSelectedUser(user);
      if (type === 'password') {
          setPasswordModalOpen(true);
      } else {
          setRoleModalOpen(true);
      }
  };

  const closeModal = () => {
      setSelectedUser(null);
      setPasswordModalOpen(false);
      setRoleModalOpen(false);
  };

  const handleUpdateRole = async (userId, { role }) => {
    toast.loading('Aggiornamento ruolo...', { id: 'role-update' });
    try {
        await apiService.updateUserRole(userId, role);
        toast.success('Ruolo aggiornato con successo!', { id: 'role-update' });
        fetchUsers(); // Refresh user list
        closeModal();
    } catch (error) {
        toast.error(`Errore: ${error.message}`, { id: 'role-update' });
    }
  };

  const handleUpdatePassword = async (userId, { password }) => {
    toast.loading('Aggiornamento password...', { id: 'password-update' });
    try {
        await apiService.adminUpdateUserPassword(userId, password);
        toast.success('Password aggiornata con successo!', { id: 'password-update' });
        closeModal();
    } catch (error) {
        toast.error(`Errore: ${error.message}`, { id: 'password-update' });
    }
  };

  return (
    <div className="modern-settings-container">
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title"><Shield size={32} /> Gestione Utenti</h1>
            <p className="page-subtitle">Modifica ruoli e password degli utenti del sistema</p>
          </div>
          <button className={`refresh-btn ${loading ? 'refreshing' : ''}`} onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={20} />
            {loading ? 'Aggiornamento...' : 'Aggiorna'}
          </button>
        </div>
      </div>

      <div className="settings-content">
        <div className="user-list-container">
            {loading && <p>Caricamento utenti...</p>}
            {error && <p className="error-message">{error}</p>}
            {!loading && !error && (
                <table className="user-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Nome Completo</th>
                            <th>Ruolo</th>
                            <th>Data Creazione</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.username}</td>
                                <td>{user.full_name}</td>
                                <td>
                                    <span className={`role-badge ${user.role}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                <td className="actions-cell">
                                    <button className="action-btn" title="Modifica Ruolo" onClick={() => openModal(user, 'role')}>
                                        <Edit size={18} />
                                    </button>
                                    <button className="action-btn" title="Modifica Password" onClick={() => openModal(user, 'password')}>
                                        <KeyRound size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>

      {isRoleModalOpen && selectedUser && (
          <UserModal user={selectedUser} onClose={closeModal} onSave={handleUpdateRole} />
      )}
      {isPasswordModalOpen && selectedUser && (
          <UserModal user={selectedUser} onClose={closeModal} onSave={handleUpdatePassword} isPasswordModal />
      )}

    </div>
  );
};

export default ModernSettingsPage;
