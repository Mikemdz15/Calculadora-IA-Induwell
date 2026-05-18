"use client";

import React from 'react';
import { AlertTriangle, Database, Lock } from 'lucide-react';

interface WeeklyUpdateModalProps {
  currentWeek: string;
  onConfirm: () => void;
  isProcessing: boolean;
}

export default function WeeklyUpdateModal({ currentWeek, onConfirm, isProcessing }: WeeklyUpdateModalProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '3rem',
        maxWidth: '600px',
        width: '100%',
        boxShadow: 'var(--panel-shadow)',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--danger)' }}>
            <Lock size={48} />
          </div>
        </div>
        
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--foreground)' }}>
          Cierre de Semana Requerido
        </h2>
        
        <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem', lineHeight: 1.6 }}>
          El sistema ha detectado el inicio de una nueva semana calendario ({currentWeek}). 
          Por seguridad, el Dashboard se encuentra bloqueado hasta que se confirme la actualización de los datos de origen.
        </p>

        <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem', textAlign: 'left', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <AlertTriangle size={24} className="textWarning" style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--warning)' }}>Importante: Acciones a ejecutar</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', opacity: 0.9, fontSize: '0.9rem' }}>
              <li>Verifica que el archivo de Google Sheets tenga la información de la nueva semana.</li>
              <li>Al confirmar, se hará un <strong>respaldo histórico</strong> de todos los comentarios actuales.</li>
              <li>Después del respaldo, <strong>se borrarán todos los comentarios y estatus actuales</strong> para iniciar la semana en blanco.</li>
            </ul>
          </div>
        </div>

        <button 
          onClick={onConfirm}
          disabled={isProcessing}
          style={{
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            opacity: isProcessing ? 0.7 : 1,
            transition: 'opacity 0.2s'
          }}
        >
          {isProcessing ? (
            <>Procesando Respaldo...</>
          ) : (
            <>
              <Database size={20} />
              Confirmar Actualización y Respaldar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
