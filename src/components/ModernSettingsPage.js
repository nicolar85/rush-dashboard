import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import './ModernSettingsPage.css';
import { Shield, KeyRound, Edit, UserPlus, X, RefreshCw, Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationDialog from './ConfirmationDialog';

const UserModal = ({ user, mode, onClose, onSave }) => {
    const [userData, setUserData] = useState({
        username: user?.username || '',
        full_name: user?.full_name || '',
        role: user?.role || 'viewer',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (mode === 'create' || mode === 'password') {
            if (userData.password !== userData.confirmPassword || !userData.password) {
                toast.error('Le password non coincidono o sono vuote.');
                return;
            }
        }
        if (mode === 'create') {
            onSave(userData);
        } else if (mode === 'role') {
            onSave(user.id, { role: userData.role });
        } else if (mode === 'password') {
            onSave(user.id, { password: userData.password });
        }
    };

    const titles = {
        create: 'Crea Nuovo Utente',
        password: `Modifica Password per ${user?.username}`,
        role: `Modifica Ruolo per ${user?.username}`
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={onClose}><X size={24} /></button>
                <h2>{titles[mode]}</h2>

                {mode === 'create' && (
                    <>
                        <div className="form-group">
                            <label>Username</label>
                            <input type="text" name="username" value={userData.username} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Nome Completo</label>
                            <input type="text" name="full_name" value={userData.full_name} onChange={handleChange} />
                        </div>
                    </>
                )}

                {(mode === 'create' || mode === 'password') && (
                    <>
                        <div className="form-group">
                            <label>Nuova Password</label>
                            <input type="password" name="password" value={userData.password} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Conferma Nuova Password</label>
                            <input type="password" name="confirmPassword" value={userData.confirmPassword} onChange={handleChange} />
                        </div>
                    </>
                )}

                {(mode === 'create' || mode === 'role') && (
                    <div className="form-group">
                        <label>Ruolo</label>
                        <select name="role" value={userData.role} onChange={handleChange}>
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                )}

                <div className="modal-actions">
                    <button onClick={onClose} className="btn btn-secondary">Annulla</button>
                    <button onClick={handleSave} className="btn btn-primary">{mode === 'create' ? 'Crea Utente' : 'Salva'}</button>
                </div>
            </div>
        </div>
    );
};


const ModernSettingsPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalState, setModalState] = useState({ isOpen: false, mode: 'create', user: null });
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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

    const openModal = (mode, user = null) => {
        setModalState({ isOpen: true, mode, user });
    };

    const closeModal = () => {
        setModalState({ isOpen: false, mode: 'create', user: null });
    };

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

    const handleUpdateRole = async (userId, { role }) => {
        toast.loading('Aggiornamento ruolo...', { id: 'role-update' });
        try {
            await apiService.updateUserRole(userId, role);
            toast.success('Ruolo aggiornato con successo!', { id: 'role-update' });
            fetchUsers();
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
        } catch (error)
        {
            toast.error(`Errore: ${error.message}`, { id: 'password-update' });
        }
    };

    const handleCreateUser = async (userData) => {
        toast.loading('Creazione utente...', { id: 'create-user' });
        try {
            await apiService.createUser(userData);
            toast.success('Utente creato con successo!', { id: 'create-user' });
            fetchUsers();
            closeModal();
        } catch (error) {
            toast.error(`Errore: ${error.message}`, { id: 'create-user' });
        }
    };

    const handleDeleteUser = (user) => {
        openDialog(
            'Conferma Eliminazione',
            `Sei sicuro di voler eliminare l'utente ${user.username}? Questa azione è irreversibile.`,
            async () => {
                toast.loading(`Eliminazione di ${user.username}...`, { id: 'delete-user' });
                try {
                    await apiService.deleteUser(user.id);
                    toast.success(`Utente ${user.username} eliminato.`, { id: 'delete-user' });
                    fetchUsers();
                } catch (error) {
                    toast.error(`Errore: ${error.message}`, { id: 'delete-user' });
                }
            }
        );
    };

    return (
        <div className="modern-settings-container">
            <div className="page-header">
                <div className="header-content">
                    <div className="header-text">
                        <h1 className="page-title"><Shield size={32} /> Gestione Utenti</h1>
                        <p className="page-subtitle">Modifica ruoli e password degli utenti del sistema</p>
                    </div>
                    <div className="header-actions">
                        <button className={`refresh-btn ${loading ? 'refreshing' : ''}`} onClick={fetchUsers} disabled={loading}>
                            <RefreshCw size={20} />
                            {loading ? 'Aggiorna...' : 'Aggiorna'}
                        </button>
                        <button className="btn btn-primary" onClick={() => openModal('create')}>
                            <UserPlus size={18} /> Crea Utente
                        </button>
                    </div>
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
                                        <td data-label="Username">{user.username}</td>
                                        <td data-label="Nome Completo">{user.full_name}</td>
                                        <td data-label="Ruolo">
                                            <span className={`role-badge ${user.role}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td data-label="Data Creazione">{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td data-label="Azioni" className="actions-cell">
                                            <button className="action-btn" title="Modifica Ruolo" onClick={() => openModal('role', user)}>
                                                <Edit size={18} />
                                            </button>
                                            <button className="action-btn" title="Modifica Password" onClick={() => openModal('password', user)}>
                                                <KeyRound size={18} />
                                            </button>
                                            <button className="action-btn delete" title="Elimina Utente" onClick={() => handleDeleteUser(user)}>
                                                <Trash size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {modalState.isOpen && (
                <UserModal
                    user={modalState.user}
                    mode={modalState.mode}
                    onClose={closeModal}
                    onSave={
                        modalState.mode === 'create' ? handleCreateUser :
                        modalState.mode === 'role' ? handleUpdateRole :
                        handleUpdatePassword
                    }
                />
            )}

            <ConfirmationDialog
                open={dialog.isOpen}
                onClose={handleCloseDialog}
                onConfirm={dialog.onConfirm}
                title={dialog.title}
                message={dialog.message}
            />
        </div>
    );
};

export default ModernSettingsPage;
