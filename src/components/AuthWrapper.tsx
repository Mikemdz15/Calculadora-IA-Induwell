"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Building2, Sun, Moon, Bell, Check } from 'lucide-react';
import { setCompanyCookie } from '@/app/actions';
import { CompanyConfig } from '@/config/companies';

export default function AuthWrapper({ children, sidebar, headerTitle, selectedCompany, companies = [] }: { children: React.ReactNode, sidebar: React.ReactNode, headerTitle: string, selectedCompany?: CompanyConfig | null, companies?: CompanyConfig[] }) {
  const { user, profile, loading, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyGid, setNewCompanyGid] = useState('');
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  React.useEffect(() => {
    if (user && profile) {
      fetchNotifications();
      // Optional: Set up real-time subscription
      const channel = supabase.channel('notifications_channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
          fetchNotifications();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      }
    }
  }, [user, profile]);

  const fetchNotifications = async () => {
    if (!profile || !selectedCompany) return;
    
    // We fetch notifications where user_id = auth.uid() OR role matches OR target_buyer_name matches
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (data && !error) {
      setNotifications(data);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  React.useEffect(() => {
    // Check local storage or system preference on mount
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
  };

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

  // If user is authenticated but hasn't selected a company yet
  if (!selectedCompany) {
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
                <Building2 size={24} color="white" />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(to right, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                S&OP Control Hub
              </h1>
            </div>
            
            <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '1rem', lineHeight: 1.2 }}>
              Selección de Entorno de Trabajo
            </h2>
            
            <p style={{ color: 'var(--foreground)', opacity: 0.8, lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Has iniciado sesión exitosamente. Ahora, selecciona la empresa o sociedad con la que deseas trabajar en esta sesión.
            </p>
            
            <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '1rem', opacity: 0.7, fontSize: '0.85rem' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>• Los datos están aislados por sociedad de forma segura.</p>
              <p style={{ margin: '0 0 0.5rem 0' }}>• El origen de datos se vincula a su propia hoja maestra.</p>
              <p style={{ margin: 0 }}>• Puedes cambiar de empresa en cualquier momento desde el panel.</p>
            </div>
          </div>

          {/* Right Side: Company Selection */}
          <div style={{ flex: '1 1 350px', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--panel-bg)' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Empresas Disponibles</h3>
            <p style={{ opacity: 0.6, fontSize: '0.9rem', marginBottom: '2rem' }}>Haz clic en una sociedad para ingresar.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {companies.map(company => (
                <div 
                  key={company.id}
                  onClick={() => setCompanyCookie(company.id)}
                  style={{
                    background: 'rgba(0,0,0,0.1)', border: '1px solid var(--panel-border)',
                    borderRadius: '12px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
                    cursor: 'pointer', transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--panel-border)';
                    e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{ background: 'var(--primary)', padding: '0.75rem', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{company.name}</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>Ingresar al panel de control</p>
                  </div>
                </div>
              ))}
            </div>

            {profile?.role === 'director' && (
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1px dashed var(--panel-border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                {!showCreateCompany ? (
                  <button
                    onClick={() => setShowCreateCompany(true)}
                    style={{ width: '100%', background: 'transparent', color: 'var(--primary)', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  >
                    + Añadir Nueva Empresa
                  </button>
                ) : (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setIsCreatingCompany(true);
                    const { error } = await supabase.from('companies').insert({
                      id: newCompanyId.trim().toLowerCase().replace(/\s+/g, '_'),
                      name: newCompanyName.trim(),
                      gid: newCompanyGid.trim()
                    });
                    if (!error) {
                      setShowCreateCompany(false);
                      setNewCompanyId('');
                      setNewCompanyName('');
                      setNewCompanyGid('');
                      window.location.reload(); // Recargar para ver la nueva empresa
                    } else {
                      alert('Error creando empresa: ' + error.message);
                    }
                    setIsCreatingCompany(false);
                  }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>Nueva Empresa</h4>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.25rem' }}>Nombre Visible</label>
                      <input required value={newCompanyName} onChange={e => { setNewCompanyName(e.target.value); setNewCompanyId(e.target.value); }} placeholder="Ej: Empresa Beta" style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '6px', color: 'white' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.25rem' }}>GID (Google Sheets)</label>
                      <input required value={newCompanyGid} onChange={e => setNewCompanyGid(e.target.value)} placeholder="Ej: 123456789" style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '6px', color: 'white' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" disabled={isCreatingCompany} style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}>{isCreatingCompany ? 'Guardando...' : 'Guardar'}</button>
                      <button type="button" onClick={() => setShowCreateCompany(false)} style={{ background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--panel-border)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                    </div>
                  </form>
                )}
              </div>
            )}
            
            <button 
              onClick={signOut}
              style={{ marginTop: '2rem', background: 'transparent', border: 'none', color: 'var(--foreground)', opacity: 0.6, cursor: 'pointer', textDecoration: 'underline', alignSelf: 'center', fontSize: '0.85rem' }}
            >
              Cerrar Sesión Segura
            </button>
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
            
            <div style={{ width: '1px', height: '24px', background: 'var(--panel-border)', margin: '0 0.5rem' }}></div>
            
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.4rem', position: 'relative' }}
              >
                <Bell size={20} />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span style={{ 
                    position: 'absolute', top: 0, right: 0, background: 'var(--danger)', color: 'white', 
                    fontSize: '0.6rem', fontWeight: 'bold', width: '16px', height: '16px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' 
                  }}>
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '300px',
                  background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 50, maxHeight: '400px', display: 'flex', flexDirection: 'column'
                }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--panel-border)', fontWeight: 600, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Notificaciones
                    <button onClick={() => setShowNotifications(false)} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', opacity: 0.5, cursor: 'pointer' }}>×</button>
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem 1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>
                        No tienes notificaciones
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} 
                          onClick={() => !n.is_read && markAsRead(n.id)}
                          style={{ 
                            padding: '0.75rem 1rem', borderBottom: '1px solid var(--panel-border)', 
                            background: n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                            cursor: n.is_read ? 'default' : 'pointer', transition: 'background 0.2s',
                            display: 'flex', gap: '0.75rem'
                          }}
                        >
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.is_read ? 'transparent' : 'var(--primary)', marginTop: '6px', flexShrink: 0 }}></div>
                          <div>
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', lineHeight: 1.3 }}>{n.message}</p>
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(n.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={toggleTheme}
              title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
              style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.4rem' }}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            <button 
              onClick={() => setCompanyCookie(null)}
              style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              Cambiar Empresa
            </button>
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
