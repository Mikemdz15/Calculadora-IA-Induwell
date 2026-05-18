"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { UserPlus, UserCog, UserX, AlertCircle, CheckCircle2, KeyRound, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  role: string;
  full_name: string;
}

export default function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('comprador');
  const [formState, setFormState] = useState<{loading: boolean, error: string | null, success: string | null}>({
    loading: false, error: null, success: null
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.role === 'director' || profile?.role === 'supervisor_planeador') {
      fetchUsers();
    }
  }, [profile]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState({ loading: true, error: null, success: null });
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role })
      });
      const data = await res.json();
      
      if (data.error) {
        setFormState({ loading: false, error: data.error, success: null });
      } else {
        setFormState({ loading: false, error: null, success: 'Usuario creado exitosamente.' });
        setEmail('');
        setPassword('');
        setFullName('');
        fetchUsers();
      }
    } catch (e: any) {
      setFormState({ loading: false, error: e.message, success: null });
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    const newPassword = prompt(`Ingresa la nueva contraseña temporal para ${email}:`);
    if (!newPassword) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword })
      });
      const data = await res.json();
      if (data.error) {
        alert('Error al reestablecer contraseña: ' + data.error);
      } else {
        alert('Contraseña actualizada exitosamente.');
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (profile?.role !== 'director') {
      alert('Acceso denegado: Solo el Director puede eliminar usuarios.');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario ${email}? Esta acción no se puede deshacer.`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.error) {
        alert('Error al eliminar usuario: ' + data.error);
      } else {
        alert('Usuario eliminado exitosamente.');
        fetchUsers();
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  if (profile?.role !== 'director' && profile?.role !== 'supervisor_planeador') {
    return <div style={{ padding: '2rem' }}>Acceso denegado. Solo administradores pueden ver esta sección.</div>;
  }

  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      {/* Create User Form (Only for Director) */}
      {profile?.role === 'director' && (
      <div className="card" style={{ flex: '1 1 400px', height: 'fit-content' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={20} className="text-primary" />
          Crear Nuevo Usuario
        </h3>
        
        {formState.error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '4px', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <AlertCircle size={16} /> {formState.error}
          </div>
        )}
        
        {formState.success && (
          <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: '4px', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <CheckCircle2 size={16} /> {formState.success}
          </div>
        )}

        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Nombre Completo</label>
            <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'white' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Correo Electrónico</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'white' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Contraseña Temporal</label>
            <input required type="text" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'white' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Perfil (Rol)</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'white' }}>
              <option value="comprador">Comprador (Perfil 1)</option>
              <option value="supervisor_planeador">Supervisor / Planeador (Perfil 2)</option>
              <option value="director">Director / Administrador (Perfil 3)</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            disabled={formState.loading}
            style={{
              background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem',
              borderRadius: '4px', fontWeight: 600, marginTop: '0.5rem', cursor: formState.loading ? 'not-allowed' : 'pointer',
              opacity: formState.loading ? 0.7 : 1
            }}
          >
            {formState.loading ? 'Creando...' : 'Crear Usuario'}
          </button>
        </form>
      </div>
      )}

      {/* Users List */}
      <div className="card" style={{ flex: '2 1 500px', height: 'fit-content' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCog size={20} className="text-primary" />
          Directorio de Usuarios
        </h3>

        {loading ? (
          <div>Cargando usuarios...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--panel-border)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Nombre</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Correo</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Rol</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Fecha de Creación</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>{u.full_name || '-'}</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--foreground)', opacity: 0.8 }}>{u.email}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ 
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem',
                      background: u.role === 'director' ? 'rgba(239, 68, 68, 0.1)' : u.role === 'supervisor_planeador' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                      color: u.role === 'director' ? 'var(--danger)' : u.role === 'supervisor_planeador' ? 'var(--warning)' : 'var(--primary)',
                      border: `1px solid ${u.role === 'director' ? 'var(--danger)' : u.role === 'supervisor_planeador' ? 'var(--warning)' : 'var(--primary)'}`
                    }}>
                      {u.role?.replace('_', ' ').toUpperCase() || 'Sin Rol'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', opacity: 0.7 }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleResetPassword(u.id, u.email)}
                      title="Reestablecer Contraseña"
                      style={{ background: 'transparent', border: '1px solid var(--panel-border)', padding: '0.4rem', borderRadius: '4px', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <KeyRound size={14} />
                    </button>
                    {profile?.role === 'director' && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        title="Eliminar Usuario"
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.4rem', borderRadius: '4px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', opacity: 0.5 }}>No se encontraron usuarios.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
