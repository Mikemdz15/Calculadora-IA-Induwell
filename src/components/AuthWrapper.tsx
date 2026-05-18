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
      <div style={{ 
        display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', 
        background: 'radial-gradient(circle at center, var(--panel-bg) 0%, var(--background) 100%)',
        padding: '2rem'
      }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', maxWidth: '900px', width: '100%',
          background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--panel-border)',
          borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Left Side: Branding & Info */}
          <div style={{
            flex: '1 1 400px', padding: '3rem', 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1))',
            display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(to right, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                S&OP Control Hub
              </h1>
            </div>
            
            <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '1rem', lineHeight: 1.2 }}>
              Inteligencia Artificial para Abastecimiento Estratégico
            </h2>
            
            <p style={{ color: 'var(--foreground)', opacity: 0.8, lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Plataforma integral diseñada para centralizar el proceso de S&OP (Sales & Operations Planning).
              Calcula proyecciones de demanda, identifica alertas tempranas de desabasto o sobreinventario, y potencia la toma de decisiones con diagnósticos automatizados.
            </p>
            
            <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '1rem', opacity: 0.7, fontSize: '0.85rem' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>• Matriz de Riesgos y Alertas Predictivas</p>
              <p style={{ margin: '0 0 0.5rem 0' }}>• Módulo de Negociaciones Colaborativas</p>
              <p style={{ margin: 0 }}>• Autorizaciones Multinivel (Comprador, Planeador, Director)</p>
            </div>
          </div>

          {/* Right Side: Login Form */}
          <div style={{ flex: '1 1 350px', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--panel-bg)' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Bienvenido</h3>
            <p style={{ opacity: 0.6, fontSize: '0.9rem', marginBottom: '2rem' }}>Ingresa tus credenciales para acceder a la plataforma.</p>
            
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, opacity: 0.8 }}>Correo Electrónico</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  style={{ width: '100%', padding: '0.875rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: 'white', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, opacity: 0.8 }}>Contraseña</label>
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.875rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: 'white', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoginLoading}
                style={{
                  background: 'linear-gradient(135deg, var(--primary), #6366f1)', color: 'white', border: 'none', padding: '0.875rem',
                  borderRadius: '8px', fontWeight: 600, marginTop: '0.5rem', cursor: isLoginLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoginLoading ? 0.7 : 1, transition: 'opacity 0.2s, transform 0.1s',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
              >
                {isLoginLoading ? 'Ingresando...' : 'Iniciar Sesión'}
              </button>
            </form>
            {user && !profile && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--warning)', fontSize: '0.85rem', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                Usuario autenticado pero sin perfil asignado. Contacta al administrador.
              </div>
            )}
          </div>
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
