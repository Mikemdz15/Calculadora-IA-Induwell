"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';
import { AlertCircle } from 'lucide-react';

export default function AuthWrapper({ children, sidebar, headerTitle }: { children: React.ReactNode, sidebar: React.ReactNode, headerTitle: string }) {
  const { user, profile, loading, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    }
    setIsLoginLoading(false);
  };

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>;
  }

  if (!user || !profile) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Calculadora IA - Acceso</h2>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Correo Electrónico</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'white' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Contraseña</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'white' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoginLoading}
              style={{
                background: 'var(--primary, #3b82f6)', color: 'white', border: 'none', padding: '0.75rem',
                borderRadius: '4px', fontWeight: 600, marginTop: '0.5rem', cursor: isLoginLoading ? 'not-allowed' : 'pointer',
                opacity: isLoginLoading ? 0.7 : 1
              }}
            >
              {isLoginLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
          {user && !profile && (
            <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--warning)', fontSize: '0.85rem' }}>
              Usuario autenticado pero sin perfil asignado. Contacta al administrador.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {sidebar}
      <div className="mainWrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ 
            height: '60px', borderBottom: '1px solid var(--panel-border)', background: 'var(--panel-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', zIndex: 10
        }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{headerTitle}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{profile.full_name || user.email}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--foreground)', opacity: 0.7, textTransform: 'capitalize' }}>
                {profile.role?.replace('_', ' ')}
              </div>
            </div>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem'
            }}>
              {profile.full_name ? profile.full_name.substring(0,2).toUpperCase() : 'U'}
            </div>
            <button 
              onClick={signOut}
              style={{ background: 'transparent', border: '1px solid var(--panel-border)', color: 'var(--foreground)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Salir
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {children}
        </main>
      </div>
    </>
  );
}
