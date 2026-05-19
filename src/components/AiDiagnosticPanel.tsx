"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SupplyChainRow } from '@/lib/supplyChainLogic';
import ReactMarkdown from 'react-markdown';
import { BrainCircuit, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './DashboardOverview.module.css';

interface AiDiagnosticPanelProps {
  currentWeekId: string;
  data: SupplyChainRow[];
  companyId: string;
}

export default function AiDiagnosticPanel({ currentWeekId, data, companyId }: AiDiagnosticPanelProps) {
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [userRole, setUserRole] = useState<'Admin' | 'Usuario'>('Admin');
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch existing diagnosis for this week
  useEffect(() => {
    async function fetchDiagnosis() {
      setIsFetching(true);
      try {
        const { data: diagData, error } = await supabase
          .from('weekly_diagnostics')
          .select('diagnosis_text')
          .eq('week_id', currentWeekId)
          .eq('company_id', companyId)
          .maybeSingle();

        if (diagData && diagData.diagnosis_text) {
          setDiagnosis(diagData.diagnosis_text);
        }
      } catch (err) {
        console.error("Error fetching diagnosis", err);
      } finally {
        setIsFetching(false);
      }
    }
    fetchDiagnosis();
  }, [currentWeekId]);

  const generateDiagnosis = async () => {
    if (userRole !== 'Admin') {
      alert("Acceso denegado: Solo el perfil Director / Admin puede generar nuevos diagnósticos.");
      return;
    }
    
    setIsLoading(true);
    try {
      // 1. Fetch current human comments
      const { data: reviews } = await supabase
        .from('sku_reviews')
        .select('*')
        .eq('company_id', companyId);
      
      // 2. Filter data to only send relevant SKUs to AI (Critical risks or Overstock) to save tokens
      const relevantSkus = data.filter(d => {
        // Is critical or has some risk
        if (d.riskAssessment.isCriticalRisk) return true;
        // Has overstock
        if (d.projections && d.projections[0] && d.skuInfo.maxOptimalStock > 0 && d.projections[0].inventoryWithReceipts > d.skuInfo.maxOptimalStock) return true;
        
        // Or has a manual comment
        const hasComment = reviews?.find(r => r.sku_id === d.skuInfo.sku);
        if (hasComment && (hasComment.comment || hasComment.is_resolved)) return true;
        
        return false;
      }).map(d => ({
        sku: d.skuInfo.sku,
        description: d.skuInfo.description,
        buyer: d.skuInfo.buyer,
        leadTimeWeeks: d.skuInfo.leadTimeWeeks,
        min: d.skuInfo.minSafetyStock,
        max: d.skuInfo.maxOptimalStock,
        stockoutWeek: d.riskAssessment.stockoutWeekIdx !== null ? `Semana N+${d.riskAssessment.stockoutWeekIdx}` : 'Sin Ruptura',
        stockoutWeekIdx: d.riskAssessment.stockoutWeekIdx, // Numeric index for logical comparison
        isCritical: d.riskAssessment.isCriticalRisk
      }));

      // 3. Call API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekId: currentWeekId,
          criticalSkus: relevantSkus,
          skuReviews: reviews || []
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error de la API');
      }

      const generatedText = result.diagnosis;
      
      // 4. Save to Supabase
      await supabase.from('weekly_diagnostics').upsert({
        week_id: currentWeekId,
        company_id: companyId,
        diagnosis_text: generatedText
      }, { onConflict: 'week_id,company_id' });

      setDiagnosis(generatedText);

    } catch (error: any) {
      console.error(error);
      alert(`Hubo un error al generar el diagnóstico: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) return null;

  return (
    <div style={{
      background: 'var(--panel-bg)',
      border: '1px solid rgba(168, 85, 247, 0.3)', // Subtle purple border for AI
      borderRadius: 'var(--radius-md)',
      padding: '1.5rem',
      marginBottom: '2rem',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)', margin: 0, cursor: 'pointer' }}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <BrainCircuit color="#a855f7" /> 
            Diagnóstico Inteligente S&OP
            {isExpanded ? <ChevronUp size={20} color="var(--foreground)" style={{ opacity: 0.6 }} /> : <ChevronDown size={20} color="var(--foreground)" style={{ opacity: 0.6 }} />}
          </h3>
          <select 
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as 'Admin' | 'Usuario')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--foreground)',
              border: '1px solid var(--panel-border)',
              padding: '0.3rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              outline: 'none',
              opacity: 0.8
            }}
          >
            <option value="Admin">Simular Perfil: Director / Admin</option>
            <option value="Usuario">Simular Perfil: Usuario (Comprador)</option>
          </select>
        </div>
        
        {!diagnosis && userRole === 'Admin' && (
          <button 
            onClick={generateDiagnosis}
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, #a855f7, #6366f1)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? <Loader2 className="spinner" size={16} /> : <Sparkles size={16} />}
            {isLoading ? 'Analizando...' : 'Generar Diagnóstico'}
          </button>
        )}
      </div>

      {isExpanded && (
        <>
          {diagnosis ? (
            <div style={{ 
              background: 'rgba(0,0,0,0.2)', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-md)',
              lineHeight: '1.6',
              fontSize: '0.95rem'
            }}>
              {/* Usamos Markdown rendering simple - we will style it globally or via inline if needed */}
              <div className="markdown-body" style={{ color: 'var(--foreground)' }}>
                <ReactMarkdown>{diagnosis}</ReactMarkdown>
              </div>
              
              <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                {userRole === 'Admin' && (
                   <button 
                      onClick={generateDiagnosis}
                      disabled={isLoading}
                      style={{
                        background: 'transparent',
                        color: '#a855f7',
                        border: '1px solid #a855f7',
                        padding: '0.4rem 0.8rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {isLoading ? 'Actualizando...' : 'Regenerar (Actualizar con nuevos comentarios)'}
                    </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ opacity: 0.7, fontStyle: 'italic', padding: '1rem 0' }}>
              No hay un diagnóstico generado para esta semana. Haz clic en "Generar Diagnóstico" para que el Motor de Inteligencia analice la matriz operativa actual.
            </div>
          )}
        </>
      )}
    </div>
  );
}
