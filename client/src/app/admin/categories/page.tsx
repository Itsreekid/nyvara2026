'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types';
import adminStyles from '../admin.module.css';
import styles from './categories.module.css';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [newName, setNewName]       = useState('');
  const [adding, setAdding]         = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [editName, setEditName]     = useState('');

  const fetchCategories = () => {
    supabase.from('categories').select('*').order('name')
      .then(({ data }) => {
        if (data) setCategories(data as Category[]);
        setLoading(false);
      });
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    const { error } = await supabase.from('categories').insert([{ name: newName.trim() }] as never);
    setAdding(false);
    if (!error) { setNewName(''); fetchCategories(); }
    else alert('Erreur: ' + error.message);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from('categories').update({ name: editName.trim() } as never).eq('id', id);
    if (!error) { setEditId(null); setEditName(''); fetchCategories(); }
    else alert('Erreur: ' + error.message);
  };

  const handleDelete = async (id: string, name: string | null) => {
    if (!confirm(`Supprimer la catégorie "${name}" ? Les produits liés ne seront pas supprimés.`)) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchCategories();
  };

  if (loading) return <div className={adminStyles.contentArea}>Chargement...</div>;

  return (
    <div>
      <div className={adminStyles.pageHeader}>
        <h1 className={adminStyles.pageTitle}>Catégories</h1>
      </div>

      {/* Add category form */}
      <div className={styles.addCard}>
        <h2 className={styles.cardTitle}>Ajouter une catégorie</h2>
        <form onSubmit={handleAdd} className={styles.addForm}>
          <input
            type="text"
            className={styles.input}
            placeholder="Nom de la catégorie..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            required
          />
          <button type="submit" className={styles.addBtn} disabled={adding}>
            {adding ? 'Ajout...' : '+ Ajouter'}
          </button>
        </form>
      </div>

      {/* Category list */}
      <div className={styles.listCard}>
        <h2 className={styles.cardTitle}>{categories.length} Catégorie{categories.length !== 1 ? 's' : ''}</h2>
        <div className={styles.list}>
          {categories.length === 0 && (
            <div className={styles.empty}>Aucune catégorie pour le moment.</div>
          )}
          {categories.map(cat => (
            <div key={cat.id} className={styles.catRow}>
              {editId === cat.id ? (
                <div className={styles.editRow}>
                  <input
                    className={styles.input}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(cat.id); if (e.key === 'Escape') setEditId(null); }}
                    autoFocus
                  />
                  <button className={styles.saveBtn} onClick={() => handleRename(cat.id)}>✓ Enregistrer</button>
                  <button className={styles.cancelBtn} onClick={() => setEditId(null)}>✕</button>
                </div>
              ) : (
                <>
                  <span className={styles.catName}>{cat.name}</span>
                  <div className={styles.catActions}>
                    <button className={styles.editBtn} onClick={() => { setEditId(cat.id); setEditName(cat.name ?? ''); }}>
                      ✏️ Renommer
                    </button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(cat.id, cat.name)}>
                      🗑
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
