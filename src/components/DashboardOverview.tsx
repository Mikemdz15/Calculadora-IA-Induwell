"use client";

import React, { useState, useEffect } from 'react';
import styles from './DashboardOverview.module.css';
import { AlertCircle, DollarSign, TrendingDown, PackageOpen } from 'lucide-react';
import { SupplyChainRow, calculateKPIs, GlobalRiskAssessment } from '@/lib/supplyChainLogic';
import { supabase } from '@/lib/supabase';
import { Check, Download, MessageSquare, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/authContext';
import SkuDetailModal from './SkuDetailModal';

interface DashboardOverviewProps {
  data: SupplyChainRow[];
}

export function getPostReliefStatusLabel(ra: GlobalRiskAssessment, minSafetyStock: number): string {
  if (ra.reliefWeekIdx === null || ra.reliefQty === null || ra.reliefInventoryProjected === null) {
    return 'Crítico (Paro Potencial)';
  }
  if (ra.reliefInventoryProjected >= minSafetyStock) {
    return 'Recuperado';
  }
  if (ra.reliefInventoryProjected > 0) {
    return 'Parcial (Aún bajo Min)';
  }
  return 'Insuficiente';
}

export default function DashboardOverview({ data }: DashboardOverviewProps) {
  const { profile } = useAuth();
  const [selectedSku, setSelectedSku] = useState<SupplyChainRow | null>(null);
  // Supabase State
  const [reviews, setReviews] = useState<Record<string, { 
    is_resolved: boolean, comment: string, supervisor_check: boolean, planeador_check: boolean, director_vobo: boolean 
  }>>({});

  const fetchReviews = async () => {
    const { data, error } = await supabase.from('sku_reviews').select('sku_id, is_resolved, comment, supervisor_check, planeador_check, director_vobo');
    if (data && !error) {
      const reviewMap: Record<string, any> = {};
      data.forEach(r => {
        reviewMap[r.sku_id] = { 
          is_resolved: r.is_resolved, 
          comment: r.comment,
          supervisor_check: r.supervisor_check,
          planeador_check: r.planeador_check,
          director_vobo: r.director_vobo
        };
      });
      setReviews(reviewMap);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleUpdateReview = async (sku: string, field: 'is_resolved' | 'comment' | 'supervisor_check' | 'planeador_check' | 'director_vobo', value: any) => {
    if (!profile) return;
    
    // Check permissions
    if (field === 'supervisor_check' && profile.role !== 'supervisor_planeador' && profile.role !== 'director') return;
    if (field === 'planeador_check' && profile.role !== 'supervisor_planeador' && profile.role !== 'director') return;
    if (field === 'director_vobo' && profile.role !== 'director') return;

    setReviews(prev => ({
      ...prev,
      [sku]: {
        ...(prev[sku] || { is_resolved: false, comment: '', supervisor_check: false, planeador_check: false, director_vobo: false }),
        [field]: value
      }
    }));

    const current = reviews[sku] || { is_resolved: false, comment: '', supervisor_check: false, planeador_check: false, director_vobo: false };
    const payload = {
      sku_id: sku,
      is_resolved: field === 'is_resolved' ? value : current.is_resolved,
      comment: field === 'comment' ? value : current.comment,
      supervisor_check: field === 'supervisor_check' ? value : current.supervisor_check,
      planeador_check: field === 'planeador_check' ? value : current.planeador_check,
      director_vobo: field === 'director_vobo' ? value : current.director_vobo,
      resolved_by_user_id: profile.id,
      updated_at: new Date().toISOString()
    };

    await supabase.from('sku_reviews').upsert(payload, { onConflict: 'sku_id' });
  };

  const kpis = calculateKPIs(data);

  const exportToExcel = () => {
    const criticalData = data
      .filter(row => row.riskAssessment.isCriticalRisk)
      .sort((a, b) => (a.riskAssessment.stockoutWeekIdx ?? 99) - (b.riskAssessment.stockoutWeekIdx ?? 99) || (b.riskAssessment.minDeficitQty || 0) - (a.riskAssessment.minDeficitQty || 0));

    if (criticalData.length === 0) return;

    const exportRows = criticalData.map(row => {
      const ra = row.riskAssessment;
      const review = reviews[row.skuInfo.sku] || { is_resolved: false, comment: '' };
      
      const minDefW = ra.minDeficitWeekIdx;
      const minDefLabel = minDefW !== null 
        ? `N+${minDefW} (${row.projections[minDefW].weekNumber}) | -${ra.minDeficitQty}` 
        : '-';
        
      const stockoutW = ra.stockoutWeekIdx;
      const stockoutLabel = stockoutW !== null 
        ? `N+${stockoutW} (${row.projections[stockoutW].weekNumber}) | -${ra.stockoutQty}` 
        : '-';
      
      let reliefText = 'Sin Órdenes en Tránsito';
      if (ra.reliefWeekIdx !== null && ra.reliefQty !== null && ra.reliefInventoryProjected !== null) {
        const reliefWeekLabel = ra.reliefWeekIdx === 0 ? `N (${row.projections[0].weekNumber})` : `N+${ra.reliefWeekIdx} (${row.projections[ra.reliefWeekIdx].weekNumber})`;
        reliefText = `+${ra.reliefQty} en Semana ${reliefWeekLabel}`;
      }

      const statusStr = getPostReliefStatusLabel(ra, row.skuInfo.minSafetyStock);

      return {
        'Resuelto': review.is_resolved ? 'Sí' : 'No',
        'SKU': row.skuInfo.sku,
        'Categoría': row.skuInfo.category,
        'Proveedor': row.skuInfo.supplier,
        'Lead Time (sem)': row.skuInfo.leadTimeWeeks,
        'Ruptura (Mínimo)': minDefLabel,
        'Ruptura (Paro Planta)': stockoutLabel,
        'Alivio Proyectado': reliefText,
        'Estatus Post-Alivio': statusStr,
        'Acción Sugerida': ra.actionPlan,
        'Comentarios': review.comment
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Materiales Críticos");
    
    XLSX.writeFile(workbook, "Materiales_Criticos.xlsx");
  };

  return (
    <div>
      {/* Top Level KPIs */}
      <div className={styles.grid}>
        <div className={`card ${styles.kpiCard}`}>
          <div className={styles.kpiHeader}>
            <span>Riesgo de Desabasto</span>
            <AlertCircle size={20} className={kpis.riskPercentage > 10 ? styles.dangerText : styles.warningText} />
          </div>
          <div className={styles.kpiValue}>
            {kpis.riskPercentage.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
          </div>
          <div className={styles.kpiSubtext}>
            {kpis.skusAtRisk} de {kpis.totalSkus} SKUs en riesgo inminente
          </div>
        </div>

        <div className={`card ${styles.kpiCard}`}>
          <div className={styles.kpiHeader}>
            <span>"Bomberazos" (Semana N)</span>
            <TrendingDown size={20} className={kpis.bomberazosCount > 0 ? styles.dangerText : styles.successText} />
          </div>
          <div className={styles.kpiValue}>
            {kpis.bomberazosCount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
          <div className={styles.kpiSubtext}>
            Urgencias detectadas para cobertura inmediata
          </div>
        </div>

        <div className={`card ${styles.kpiCard}`}>
          <div className={styles.kpiHeader}>
            <span>Capital Atrapado (Sobre-stock)</span>
            <DollarSign size={20} className={styles.warningText} />
          </div>
          <div className={styles.kpiValue}>
            ${kpis.capitalTrapped.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
          <div className={styles.kpiSubtext}>
            Capital inmovilizado por superar máximo óptimo
          </div>
        </div>
      </div>

      {/* Critical Materials */}
      <div style={{ marginTop: '2rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} className={styles.dangerText} />
              Materiales Críticos (Riesgo Futuro y Alivio) <span style={{fontSize: '0.9rem', opacity: 0.7, fontWeight: 'normal'}}>({data.filter(row => row.riskAssessment.isCriticalRisk).length} SKUs)</span>
            </h3>
            <button 
              onClick={exportToExcel}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--primary, #3b82f6)', color: 'white',
                border: 'none', padding: '0.5rem 1rem', borderRadius: '4px',
                cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500,
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
            >
              <Download size={16} />
              Exportar a Excel
            </button>
          </div>
          
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px' }}>
            <table className={styles.table} style={{ position: 'relative' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--background)', zIndex: 1, boxShadow: '0 1px 0 var(--panel-border)' }}>
                <tr>
                  <th>Validaciones</th>
                  <th>SKU</th>
                  <th>Categoría</th>
                  <th>Proveedor</th>
                  <th>Lead Time</th>
                  <th>Ruptura (Mínimo)</th>
                  <th>Ruptura (Paro Planta)</th>
                  <th>Alivio Proyectado</th>
                  <th>Estatus Post-Alivio</th>
                  <th>Acción Sugerida (Rol S&OP)</th>
                  <th>Detalles / Comentarios</th>
                </tr>
              </thead>
              <tbody>
                {data
                  .filter(row => row.riskAssessment.isCriticalRisk)
                  .sort((a, b) => (a.riskAssessment.stockoutWeekIdx ?? 99) - (b.riskAssessment.stockoutWeekIdx ?? 99) || (b.riskAssessment.minDeficitQty || 0) - (a.riskAssessment.minDeficitQty || 0))
                  .map(row => {
                  const ra = row.riskAssessment;
                  const review = reviews[row.skuInfo.sku] || { is_resolved: false, comment: '', supervisor_check: false, planeador_check: false, director_vobo: false };
                  
                  const minDefW = ra.minDeficitWeekIdx;
                  const minDefLabel = minDefW !== null 
                    ? `N+${minDefW} (${row.projections[minDefW].weekNumber}) | -${ra.minDeficitQty?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                    : '-';
                    
                  const stockoutW = ra.stockoutWeekIdx;
                  const stockoutLabel = stockoutW !== null 
                    ? `N+${stockoutW} (${row.projections[stockoutW].weekNumber}) | -${ra.stockoutQty?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                    : <span style={{opacity: 0.5}}>-</span>;
                  
                  // Relief formatting
                  let reliefText = <span style={{ opacity: 0.5 }}>Sin Órdenes en Tránsito</span>;
                  const statusStr = getPostReliefStatusLabel(ra, row.skuInfo.minSafetyStock);
                  let postReliefStatus = <span className={styles.dangerText}>{statusStr}</span>;
                  
                  if (ra.reliefWeekIdx !== null && ra.reliefQty !== null && ra.reliefInventoryProjected !== null) {
                    const reliefWeekLabel = ra.reliefWeekIdx === 0 ? `N (${row.projections[0].weekNumber})` : `N+${ra.reliefWeekIdx} (${row.projections[ra.reliefWeekIdx].weekNumber})`;
                    reliefText = (
                      <span className={styles.successText} style={{ fontWeight: 500 }}>
                        +{ra.reliefQty.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} en Semana {reliefWeekLabel}
                      </span>
                    );
                    
                    if (statusStr === 'Recuperado') {
                      postReliefStatus = <span className={styles.successText}>{statusStr}</span>;
                    } else if (statusStr === 'Parcial (Aún bajo Min)') {
                      postReliefStatus = <span className={styles.warningText}>{statusStr}</span>;
                    } else {
                      postReliefStatus = <span className={styles.dangerText}>{statusStr}</span>;
                    }
                  }

                  return (
                    <tr key={row.skuInfo.sku} style={{ opacity: review.director_vobo ? 0.7 : 1, transition: 'opacity 0.3s', cursor: 'pointer' }} onClick={() => setSelectedSku(row)}>
                      <td onClick={(e) => e.stopPropagation()} style={{ minWidth: '140px' }}>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button 
                            title="Check Supervisor"
                            disabled={profile?.role !== 'supervisor_planeador' && profile?.role !== 'director'}
                            onClick={() => handleUpdateReview(row.skuInfo.sku, 'supervisor_check', !review.supervisor_check)}
                            style={{
                              width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--panel-border)',
                              background: review.supervisor_check ? 'var(--warning)' : 'transparent',
                              color: review.supervisor_check ? 'white' : 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: (profile?.role === 'supervisor_planeador' || profile?.role === 'director') ? 'pointer' : 'not-allowed',
                              opacity: (profile?.role === 'supervisor_planeador' || profile?.role === 'director') ? 1 : 0.6
                            }}
                          >
                            {review.supervisor_check ? <Check size={14} /> : <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 'bold' }}>S</span>}
                          </button>
                          <button 
                            title="Check Planeador"
                            disabled={profile?.role !== 'supervisor_planeador' && profile?.role !== 'director'}
                            onClick={() => handleUpdateReview(row.skuInfo.sku, 'planeador_check', !review.planeador_check)}
                            style={{
                              width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--panel-border)',
                              background: review.planeador_check ? 'var(--warning)' : 'transparent',
                              color: review.planeador_check ? 'white' : 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: (profile?.role === 'supervisor_planeador' || profile?.role === 'director') ? 'pointer' : 'not-allowed',
                              opacity: (profile?.role === 'supervisor_planeador' || profile?.role === 'director') ? 1 : 0.6
                            }}
                          >
                            {review.planeador_check ? <Check size={14} /> : <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 'bold' }}>P</span>}
                          </button>
                          <button 
                            title="VoBo Director"
                            disabled={profile?.role !== 'director'}
                            onClick={() => handleUpdateReview(row.skuInfo.sku, 'director_vobo', !review.director_vobo)}
                            style={{
                              width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--panel-border)',
                              background: review.director_vobo ? 'var(--success)' : 'transparent',
                              color: review.director_vobo ? 'white' : 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: profile?.role === 'director' ? 'pointer' : 'not-allowed',
                              opacity: profile?.role === 'director' ? 1 : 0.6
                            }}
                          >
                            {review.director_vobo ? <ShieldCheck size={14} /> : <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 'bold' }}>D</span>}
                          </button>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{row.skuInfo.sku}</td>
                      <td>{row.skuInfo.category}</td>
                      <td>{row.skuInfo.supplier}</td>
                      <td>
                        <span className="badge danger">{row.skuInfo.leadTimeWeeks} sem</span>
                      </td>
                      <td style={{ color: 'var(--warning)', fontWeight: 500 }}>{minDefLabel}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{stockoutLabel}</td>
                      <td>{reliefText}</td>
                      <td>{postReliefStatus}</td>
                      <td style={{ fontWeight: 600, color: 'var(--foreground)' }}>{ra.actionPlan}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setSelectedSku(row)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)',
                            padding: '0.5rem 0.75rem', borderRadius: '4px', color: 'var(--foreground)',
                            cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap'
                          }}
                        >
                          <MessageSquare size={14} />
                          Ver Detalles / Comentar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {data.filter(row => row.riskAssessment.isCriticalRisk).length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                    No hay materiales en riesgo crítico inminente para esta selección
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
      {selectedSku && (
        <SkuDetailModal skuData={selectedSku} onClose={() => { setSelectedSku(null); fetchReviews(); }} />
      )}
    </div>
  );
}
