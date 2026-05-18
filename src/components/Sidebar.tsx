"use client";
import { useState } from 'react';
import styles from '@/app/layout.module.css';
import { LayoutDashboard, Table, AlertTriangle, Settings, Box, PackageOpen, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useAuth } from '@/lib/authContext';

interface SidebarProps {
  buyerStats: Record<string, { total: number; atRisk: number }>;
}

export default function Sidebar({ buyerStats }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { profile } = useAuth();

  return (
    <aside 
      className={styles.sidebar} 
      style={{ 
        width: isExpanded ? '300px' : '80px', 
        minWidth: isExpanded ? '300px' : '80px',
        flexShrink: 0,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
        overflowY: 'auto', 
        overflowX: 'hidden' 
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isExpanded ? 'space-between' : 'center', marginBottom: '2rem' }}>
        {isExpanded && (
          <div className={styles.logo} style={{ marginBottom: 0 }}>
            <Box size={24} />
            <span>S&OP Control</span>
          </div>
        )}
        {!isExpanded && <Box size={24} color="var(--primary)" />}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid var(--panel-border)', 
            color: 'var(--foreground)', 
            cursor: 'pointer', 
            display: 'flex', 
            padding: '6px',
            borderRadius: '6px'
          }}
          title={isExpanded ? "Colapsar menú" : "Expandir menú"}
        >
          {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      
      <nav className={styles.nav}>
        <a href="#dashboard" className={`${styles.navItem} ${styles.active}`} style={{ justifyContent: isExpanded ? 'flex-start' : 'center', padding: isExpanded ? '0.75rem 1rem' : '0.75rem 0' }}>
          <LayoutDashboard size={20} style={{ flexShrink: 0 }} />
          {isExpanded && <span style={{ whiteSpace: 'nowrap' }}>Dashboard Ejecutivo</span>}
        </a>
        <a href="#matriz" className={styles.navItem} style={{ justifyContent: isExpanded ? 'flex-start' : 'center', padding: isExpanded ? '0.75rem 1rem' : '0.75rem 0' }}>
          <Table size={20} style={{ flexShrink: 0 }} />
          {isExpanded && <span style={{ whiteSpace: 'nowrap' }}>Matriz de Abasto</span>}
        </a>
        <a href="#dashboard" className={styles.navItem} style={{ justifyContent: isExpanded ? 'flex-start' : 'center', padding: isExpanded ? '0.75rem 1rem' : '0.75rem 0' }}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          {isExpanded && <span style={{ whiteSpace: 'nowrap' }}>Alertas y Riesgos</span>}
        </a>
        <a href="/#negociaciones" className={styles.navItem} style={{ justifyContent: isExpanded ? 'flex-start' : 'center', padding: isExpanded ? '0.75rem 1rem' : '0.75rem 0' }}>
          <PackageOpen size={20} style={{ flexShrink: 0 }} />
          {isExpanded && <span style={{ whiteSpace: 'nowrap' }}>Partidas en Negociación</span>}
        </a>
        {(profile?.role === 'director' || profile?.role === 'supervisor_planeador') && (
          <a href="/admin" className={styles.navItem} style={{ justifyContent: isExpanded ? 'flex-start' : 'center', padding: isExpanded ? '0.75rem 1rem' : '0.75rem 0' }}>
            <Users size={20} style={{ flexShrink: 0 }} />
            {isExpanded && <span style={{ whiteSpace: 'nowrap' }}>Gestión de Usuarios</span>}
          </a>
        )}
      </nav>

      {isExpanded ? (
        <div style={{ padding: '1.5rem', marginTop: '1rem', borderTop: '1px solid var(--panel-border)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', opacity: 0.7, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PackageOpen size={16} />
            <span style={{ whiteSpace: 'nowrap' }}>Riesgo por Comprador</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(buyerStats).map(([buyer, stats]) => {
              const riskPct = (stats.atRisk / stats.total) * 100;
              let color = 'var(--success)';
              if (riskPct > 0) color = 'var(--warning)';
              if (riskPct > 15) color = 'var(--danger)';

              return (
                <div key={buyer}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{buyer}</span>
                    <span style={{ opacity: 0.8, whiteSpace: 'nowrap' }}>{stats.atRisk} ({riskPct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--panel-border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${100 - riskPct}%`, backgroundColor: color, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--panel-border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <PackageOpen size={20} style={{ opacity: 0.5 }} title="Riesgo por Comprador" />
        </div>
      )}
      
      <div className={styles.nav} style={{ flexGrow: 0, marginTop: 'auto' }}>
        <a href="#" className={styles.navItem} style={{ justifyContent: isExpanded ? 'flex-start' : 'center', padding: isExpanded ? '0.75rem 1rem' : '0.75rem 0' }}>
          <Settings size={20} style={{ flexShrink: 0 }} />
          {isExpanded && <span style={{ whiteSpace: 'nowrap' }}>Configuración</span>}
        </a>
      </div>
    </aside>
  );
}
