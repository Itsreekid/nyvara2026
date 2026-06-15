'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, Shield, User } from 'lucide-react';
import {
  getEmployeesAction,
  addEmployeeAction,
  removeEmployeeAction,
} from '../actions';
import adminStyles from '../admin.module.css';
import styles from './employees.module.css';

interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'employee';
  created_at: string;
}

const EMPTY_FORM = { username: '', full_name: '', password: '', role: 'employee' as 'admin' | 'employee' };

const safeFormatDate = (d: string | null | undefined): string => {
  if (!d) return 'Date invalide';
  const date = new Date(d.replace(' ', 'T'));
  if (isNaN(date.getTime())) return 'Date invalide';
  return date.toLocaleDateString('fr-FR');
};

export default function EmployeesPage() {
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const result = await getEmployeesAction();
    if (result.data) setUsers(result.data as AdminUser[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const clearMessages = () => { setError(null); setSuccess(null); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    clearMessages();

    const fd = new FormData();
    fd.append('username',  form.username);
    fd.append('full_name', form.full_name);
    fd.append('password',  form.password);
    fd.append('role',      form.role);

    const result = await addEmployeeAction(fd);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Utilisateur créé avec succès !');
      setForm(EMPTY_FORM);
      await loadUsers();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Supprimer l'utilisateur "${username}" ?`)) return;
    clearMessages();
    const result = await removeEmployeeAction(id);
    if (result.error) setError(result.error);
    else {
      setSuccess(`"${username}" supprimé.`);
      await loadUsers();
    }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;

  return (
    <div>
      <div className={adminStyles.pageHeader}>
        <h1 className={adminStyles.pageTitle}>Gestion des Employés</h1>
      </div>

      {/* ── Users list ── */}
      <div className={adminStyles.tableContainer}>
        <div className={adminStyles.tableScrollWrapper}>
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th>Nom complet</th>
                <th>Identifiant</th>
                <th>Rôle</th>
                <th>Créé le</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>Chargement...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>Aucun utilisateur.</td></tr>
              ) : users.map(user => (
                <tr key={user.id}>
                  <td className={styles.nameCell}>
                    <div className={styles.userAvatar}>
                      {user.role === 'admin' ? <Shield size={14} /> : <User size={14} />}
                    </div>
                    <span>{user.full_name}</span>
                  </td>
                  <td><code className={styles.username}>@{user.username}</code></td>
                  <td>
                    <span className={`${styles.roleBadge} ${user.role === 'admin' ? styles.roleAdmin : styles.roleEmployee}`}>
                      {user.role === 'admin' ? 'Admin' : 'Employé'}
                    </span>
                  </td>
                  <td>{safeFormatDate(user.created_at)}</td>
                  <td>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(user.id, user.username)}
                      title="Supprimer"
                      /* Prevent deleting last admin */
                      disabled={user.role === 'admin' && adminCount <= 1}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add user form ── */}
      <div className={styles.addCard}>
        <div className={styles.addCardHeader}>
          <UserPlus size={20} />
          <h2 className={styles.addCardTitle}>Ajouter un utilisateur</h2>
        </div>

        {error   && <div className={styles.errorMsg}>{error}</div>}
        {success && <div className={styles.successMsg}>{success}</div>}

        <form onSubmit={handleAdd} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>Nom complet</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ex: Salma Ben Ali"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Identifiant</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ex: salma"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Mot de passe</label>
              <input
                type="password"
                className={styles.input}
                placeholder="Mot de passe sécurisé"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Rôle</label>
              <select
                className={styles.roleSelect}
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'employee' }))}
              >
                <option value="employee">Employé (Commandes uniquement)</option>
                <option value="admin">Admin (Accès complet)</option>
              </select>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={adding}>
            {adding ? 'Création...' : 'Créer l\'utilisateur'}
          </button>
        </form>
      </div>
    </div>
  );
}
