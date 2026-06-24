"use client";

import React, { useState, useEffect, useMemo } from 'react';
import styles from './DashboardOverview.module.css';
import { AlertCircle, DollarSign, TrendingDown, PackageOpen } from 'lucide-react';
import { SupplyChainRow, calculateKPIs, GlobalRiskAssessment } from '@/lib/supplyChainLogic';
import { supabase } from '@/lib/supabase';
import { Check, Download, MessageSquare, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/authContext';
import SkuDetailModal from './SkuDetailModal';

interface DashboardOverviewProps {
  data: SupplyChainRow[];
  companyId: string;
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

export default function DashboardOverview({ data, companyId }: DashboardOverviewProps) {
  const { profile } = useAuth();
  const [selectedSku, setSelectedSku] = useState<SupplyChainRow | null>(null);
  // Supabase State
  const [reviews, setReviews] = useState<Record<string, { 
    is_resolved: boolean, comment: string, supervisor_check: boolean, planeador_check: boolean, director_vobo: boolean, revision_check?: boolean
  }>>({});

  // Sorting states
  const [criticalSort, setCriticalSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'stockout',
    direction: 'asc',
  });
  const [capitalSort, setCapitalSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'overStockVal',
    direction: 'desc',
  });

  const [isCriticalCollapsed, setIsCriticalCollapsed] = useState(false);
  const [isCapitalCollapsed, setIsCapitalCollapsed] = useState(false);

  const handleSortCritical = (key: string) => {
    setCriticalSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSortCapital = (key: string) => {
    setCapitalSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderSortIcon = (table: 'critical' | 'capital', key: string) => {
    const sort = table === 'critical' ? criticalSort : capitalSort;
    if (sort.key !== key) return <span style={{ opacity: 0.3, marginLeft: '0.25rem' }}>↕</span>;
    return sort.direction === 'asc' 
      ? <span style={{ marginLeft: '0.25rem', color: 'var(--primary)', fontSize: '0.75rem' }}>▲</span> 
      : <span style={{ marginLeft: '0.25rem', color: 'var(--primary)', fontSize: '0.75rem' }}>▼</span>;
  };

  const getSortedCriticalData = () => {
    const criticalData = data.filter(row => row.riskAssessment.isCriticalRisk);
    
    return criticalData.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      
      const revA = reviews[a.skuInfo.sku] || { is_resolved: false, supervisor_check: false, planeador_check: false, director_vobo: false };
      const revB = reviews[b.skuInfo.sku] || { is_resolved: false, supervisor_check: false, planeador_check: false, director_vobo: false };

      switch (criticalSort.key) {
        case 'resolved':
          valA = (revA.supervisor_check ? 1 : 0) + (revA.planeador_check ? 1 : 0) + (revA.director_vobo ? 1 : 0);
          valB = (revB.supervisor_check ? 1 : 0) + (revB.planeador_check ? 1 : 0) + (revB.director_vobo ? 1 : 0);
          break;
        case 'sku':
          valA = a.skuInfo.sku;
          valB = b.skuInfo.sku;
          break;
        case 'category':
          valA = a.skuInfo.category;
          valB = b.skuInfo.category;
          break;
        case 'supplier':
          valA = a.skuInfo.supplier;
          valB = b.skuInfo.supplier;
          break;
        case 'leadTime':
          valA = a.skuInfo.leadTimeWeeks;
          valB = b.skuInfo.leadTimeWeeks;
          break;
        case 'initialInventory':
          valA = a.projections[0]?.initialInventory ?? 0;
          valB = b.projections[0]?.initialInventory ?? 0;
          break;
        case 'minSafetyStock':
          valA = a.skuInfo.minSafetyStock;
          valB = b.skuInfo.minSafetyStock;
          break;
        case 'minDeficit':
          valA = a.riskAssessment.minDeficitWeekIdx ?? (criticalSort.direction === 'asc' ? 999 : -1);
          valB = b.riskAssessment.minDeficitWeekIdx ?? (criticalSort.direction === 'asc' ? 999 : -1);
          break;
        case 'stockout':
          valA = a.riskAssessment.stockoutWeekIdx ?? (criticalSort.direction === 'asc' ? 999 : -1);
          valB = b.riskAssessment.stockoutWeekIdx ?? (criticalSort.direction === 'asc' ? 999 : -1);
          break;
        case 'relief':
          valA = a.riskAssessment.reliefQty ?? 0;
          valB = b.riskAssessment.reliefQty ?? 0;
          break;
        case 'postRelief':
          valA = getPostReliefStatusLabel(a.riskAssessment, a.skuInfo.minSafetyStock);
          valB = getPostReliefStatusLabel(b.riskAssessment, b.skuInfo.minSafetyStock);
          break;
        case 'action':
          valA = a.riskAssessment.actionPlan;
          valB = b.riskAssessment.actionPlan;
          break;
        default:
          valA = a.riskAssessment.stockoutWeekIdx ?? 999;
          valB = b.riskAssessment.stockoutWeekIdx ?? 999;
      }
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return criticalSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      return criticalSort.direction === 'asc' ? valA - valB : valB - valA;
    });
  };

  const getSortedCapitalData = () => {
    const overStockData = data.filter(row => row.projections[0].isCapitalInefficiency);
    
    return overStockData.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      
      const revA = reviews[a.skuInfo.sku] || { is_resolved: false, supervisor_check: false, planeador_check: false, director_vobo: false };
      const revB = reviews[b.skuInfo.sku] || { is_resolved: false, supervisor_check: false, planeador_check: false, director_vobo: false };

      const currentInvA = a.projections[0].inventoryWithReceipts;
      const maxStockA = a.skuInfo.maxOptimalStock;
      const overStockQtyA = Math.max(0, currentInvA - maxStockA);
      const overStockValA = overStockQtyA * a.skuInfo.unitPrice;
      const overStockPctA = maxStockA > 0 ? (overStockQtyA / maxStockA) * 100 : 0;

      const currentInvB = b.projections[0].inventoryWithReceipts;
      const maxStockB = b.skuInfo.maxOptimalStock;
      const overStockQtyB = Math.max(0, currentInvB - maxStockB);
      const overStockValB = overStockQtyB * b.skuInfo.unitPrice;
      const overStockPctB = maxStockB > 0 ? (overStockQtyB / maxStockB) * 100 : 0;

      switch (capitalSort.key) {
        case 'resolved':
          valA = (revA.supervisor_check ? 1 : 0) + (revA.planeador_check ? 1 : 0) + (revA.director_vobo ? 1 : 0);
          valB = (revB.supervisor_check ? 1 : 0) + (revB.planeador_check ? 1 : 0) + (revB.director_vobo ? 1 : 0);
          break;
        case 'sku':
          valA = a.skuInfo.sku;
          valB = b.skuInfo.sku;
          break;
        case 'category':
          valA = a.skuInfo.category;
          valB = b.skuInfo.category;
          break;
        case 'supplier':
          valA = a.skuInfo.supplier;
          valB = b.skuInfo.supplier;
          break;
        case 'unitPrice':
          valA = a.skuInfo.unitPrice;
          valB = b.skuInfo.unitPrice;
          break;
        case 'moq':
          valA = a.skuInfo.moq;
          valB = b.skuInfo.moq;
          break;
        case 'maxStock':
          valA = maxStockA;
          valB = maxStockB;
          break;
        case 'currentInv':
          valA = currentInvA;
          valB = currentInvB;
          break;
        case 'overStockQty':
          valA = overStockQtyA;
          valB = overStockQtyB;
          break;
        case 'overStockPct':
          valA = overStockPctA;
          valB = overStockPctB;
          break;
        case 'overStockVal':
          valA = overStockValA;
          valB = overStockValB;
          break;
        default:
          valA = overStockValA;
          valB = overStockValB;
      }
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return capitalSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      return capitalSort.direction === 'asc' ? valA - valB : valB - valA;
    });
  };

  const fetchReviews = async () => {
      const { data, error } = await supabase.from('sku_reviews')
        .select('sku_id, is_resolved, comment, supervisor_check, planeador_check, director_vobo, revision_check')
        .eq('company_id', companyId);
    if (data && !error) {
      const reviewMap: Record<string, any> = {};
      data.forEach(r => {
        reviewMap[r.sku_id] = { 
          is_resolved: r.is_resolved, 
          comment: r.comment,
          supervisor_check: r.supervisor_check,
          planeador_check: r.planeador_check,
          director_vobo: r.director_vobo,
          revision_check: r.revision_check
        };
      });
      setReviews(reviewMap);
    }
  };

  useEffect(() => {
    fetchReviews();

    const handleOpenNotification = (e: any) => {
      if (e.detail && e.detail.type === 'sku_review') {
        const skuData = data.find(d => d.skuInfo.sku === e.detail.id);
        if (skuData) {
          setSelectedSku(skuData);
        }
      }
    };

    window.addEventListener('open-notification', handleOpenNotification);
    return () => window.removeEventListener('open-notification', handleOpenNotification);
  }, [data]);

  const handleUpdateReview = async (sku: string, field: 'is_resolved' | 'comment' | 'supervisor_check' | 'planeador_check' | 'director_vobo' | 'revision_check', value: any) => {
    if (!profile) return;
    
    // Check permissions
    if (field === 'supervisor_check' && profile.role !== 'supervisor_planeador' && profile.role !== 'director') return;
    if (field === 'planeador_check' && profile.role !== 'supervisor_planeador' && profile.role !== 'director') return;
    if (field === 'director_vobo' && profile.role !== 'director') return;
    if (field === 'revision_check' && profile.role !== 'director') return;

    setReviews(prev => ({
      ...prev,
      [sku]: {
        ...(prev[sku] || { is_resolved: false, comment: '', supervisor_check: false, planeador_check: false, director_vobo: false, revision_check: false }),
        [field]: value
      }
    }));

    const current = reviews[sku] || { is_resolved: false, comment: '', supervisor_check: false, planeador_check: false, director_vobo: false, revision_check: false };
    const payload = {
      sku_id: sku,
      is_resolved: field === 'is_resolved' ? value : current.is_resolved,
      comment: field === 'comment' ? value : current.comment,
      supervisor_check: field === 'supervisor_check' ? value : current.supervisor_check,
      planeador_check: field === 'planeador_check' ? value : current.planeador_check,
      director_vobo: field === 'director_vobo' ? value : current.director_vobo,
      revision_check: field === 'revision_check' ? value : current.revision_check,
      resolved_by_user_id: profile.id,
      company_id: companyId,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('sku_reviews').upsert(payload, { onConflict: 'sku_id,company_id' });

    if (!error) {
      // If setting either supervisor or planeador to true, and the other is already true
      if (
        (field === 'supervisor_check' && value === true && current.planeador_check === true) ||
        (field === 'planeador_check' && value === true && current.supervisor_check === true)
      ) {
        await supabase.from('notifications').insert({
          target_role: 'director',
          message: `El SKU Crítico ${sku} tiene VoBo de Supervisor y Planeador y espera tu autorización final.`,
          reference_id: sku,
          reference_type: 'sku_review',
          company_id: companyId
        });
      }
    }
  };

  const kpis = calculateKPIs(data);

  // Dynamic calculations for Director VoBo approved items
  const approvedRiskSkusCount = useMemo(() => {
    return data.filter(row => {
      if (!row.riskAssessment.isCriticalRisk) return false;
      const sku = row.skuInfo.sku;
      return reviews[sku]?.director_vobo === true;
    }).length;
  }, [data, reviews]);

  const approvedBomberazosCount = useMemo(() => {
    return data.filter(row => {
      if (!(row.projections[0].toBuyBomberazo > 0)) return false;
      const sku = row.skuInfo.sku;
      return reviews[sku]?.director_vobo === true;
    }).length;
  }, [data, reviews]);

  const riskCompliancePct = kpis.skusAtRisk > 0 ? (approvedRiskSkusCount / kpis.skusAtRisk) * 100 : 0;
  const bomberazosCompliancePct = kpis.bomberazosCount > 0 ? (approvedBomberazosCount / kpis.bomberazosCount) * 100 : 0;

  const exportToExcel = () => {
    const criticalData = data
      .filter(row => row.riskAssessment.isCriticalRisk)
      .sort((a, b) => (a.riskAssessment.stockoutWeekIdx ?? 99) - (b.riskAssessment.stockoutWeekIdx ?? 99) || (b.riskAssessment.minDeficitQty || 0) - (a.riskAssessment.minDeficitQty || 0));

    if (criticalData.length === 0) return;

    const exportRows = criticalData.map(row => {
      const ra = row.riskAssessment;
      const review = reviews[row.skuInfo.sku] || { is_resolved: false, comment: '', supervisor_check: false, planeador_check: false, director_vobo: false, revision_check: false };
      
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
        'Supervisor check': review.supervisor_check ? 'Sí' : 'No',
        'Planeador check': review.planeador_check ? 'Sí' : 'No',
        'VoBo Director': review.director_vobo ? 'Sí' : 'No',
        'Revisión Director': review.revision_check ? 'Sí' : 'No',
        'SKU': row.skuInfo.sku,
        'Categoría': row.skuInfo.category,
        'Proveedor': row.skuInfo.supplier,
        'Lead Time (sem)': row.skuInfo.leadTimeWeeks,
        'Inventario Actual': row.projections[0]?.initialInventory !== undefined ? Math.round(row.projections[0].initialInventory) : 0,
        'Stock de Seguridad Mínimo': row.skuInfo.minSafetyStock !== undefined ? Math.round(row.skuInfo.minSafetyStock) : 0,
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

  const exportOverStockToExcel = () => {
    const overStockData = data
      .filter(row => row.projections[0].isCapitalInefficiency)
      .sort((a, b) => {
        const valA = (a.projections[0].inventoryWithReceipts - a.skuInfo.maxOptimalStock) * a.skuInfo.unitPrice;
        const valB = (b.projections[0].inventoryWithReceipts - b.skuInfo.maxOptimalStock) * b.skuInfo.unitPrice;
        return valB - valA;
      });

    if (overStockData.length === 0) return;

    const exportRows = overStockData.map(row => {
      const review = reviews[row.skuInfo.sku] || { supervisor_check: false, planeador_check: false, director_vobo: false, revision_check: false, comment: '' };
      const currentInv = row.projections[0].inventoryWithReceipts;
      const maxStock = row.skuInfo.maxOptimalStock;
      const overStockQty = currentInv - maxStock;
      const overStockVal = overStockQty * row.skuInfo.unitPrice;

      const overStockPct = maxStock > 0 ? (overStockQty / maxStock) * 100 : 0;

      return {
        'Supervisor check': review.supervisor_check ? 'Sí' : 'No',
        'Planeador check': review.planeador_check ? 'Sí' : 'No',
        'VoBo Director': review.director_vobo ? 'Sí' : 'No',
        'Revisión Director': review.revision_check ? 'Sí' : 'No',
        'SKU': row.skuInfo.sku,
        'Categoría': row.skuInfo.category,
        'Proveedor': row.skuInfo.supplier,
        'Precio Unitario Compra': row.skuInfo.unitPrice,
        'MOQ': Math.round(row.skuInfo.moq),
        'Cantidad máxima permitida de stock': Math.round(maxStock),
        'Cantidad actual de inventario': Math.round(currentInv),
        'Cantidad de sobre stock': Math.round(overStockQty),
        '% Excedente': `${overStockPct.toFixed(2)}%`,
        'Valor de sobre stock': Math.round(overStockVal),
        'Estatus': 'Sobre Stock',
        'Detalle / Comentarios': review.comment
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Capital Atrapado");
    
    XLSX.writeFile(workbook, "Capital_Atrapado_SobreStock.xlsx");
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
          {/* Comentario dinámico de revisión de dirección */}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--panel-border)', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--foreground)', opacity: 0.8 }}>Revisión por Dirección:</span>
              <span className={styles.successText} style={{ fontWeight: 'bold' }}>
                {approvedRiskSkusCount} de {kpis.skusAtRisk}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem' }}>
              <span>Cumplimiento y atención</span>
              <span>{riskCompliancePct.toFixed(1)}%</span>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ 
                  width: `${riskCompliancePct}%`, 
                  background: 'var(--success, #10b981)' 
                }} 
              />
            </div>
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
          {/* Comentario dinámico de revisión de dirección */}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--panel-border)', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--foreground)', opacity: 0.8 }}>Revisión por Dirección:</span>
              <span className={styles.successText} style={{ fontWeight: 'bold' }}>
                {approvedBomberazosCount} de {kpis.bomberazosCount}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem' }}>
              <span>Cumplimiento y atención</span>
              <span>{bomberazosCompliancePct.toFixed(1)}%</span>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ 
                  width: `${bomberazosCompliancePct}%`, 
                  background: 'var(--success, #10b981)' 
                }} 
              />
            </div>
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
            <h3 
              onClick={() => setIsCriticalCollapsed(!isCriticalCollapsed)}
              style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}
              title={isCriticalCollapsed ? "Expandir tabla" : "Comprimir tabla"}
            >
              <AlertCircle size={18} className={styles.dangerText} />
              Materiales Críticos (Riesgo Futuro y Alivio) <span style={{fontSize: '0.9rem', opacity: 0.7, fontWeight: 'normal'}}>({data.filter(row => row.riskAssessment.isCriticalRisk).length} SKUs)</span>
              {isCriticalCollapsed ? <ChevronDown size={16} style={{ opacity: 0.6 }} /> : <ChevronUp size={16} style={{ opacity: 0.6 }} />}
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
          
          {!isCriticalCollapsed && (
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px' }}>
              <table className={styles.table} style={{ position: 'relative' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--background)', zIndex: 1, boxShadow: '0 1px 0 var(--panel-border)' }}>
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCritical('resolved')}>Validaciones {renderSortIcon('critical', 'resolved')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCritical('sku')}>SKU {renderSortIcon('critical', 'sku')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCritical('category')}>Categoría {renderSortIcon('critical', 'category')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCritical('supplier')}>Proveedor {renderSortIcon('critical', 'supplier')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCritical('leadTime')}>Lead Time {renderSortIcon('critical', 'leadTime')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCritical('initialInventory')}>Inventario Actual {renderSortIcon('critical', 'initialInventory')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCritical('minSafetyStock')}>Stock Seg. Mínimo {renderSortIcon('critical', 'minSafetyStock')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCritical('minDeficit')}>Ruptura (Mínimo) {renderSortIcon('critical', 'minDeficit')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCritical('stockout')}>Ruptura (Paro Planta) {renderSortIcon('critical', 'stockout')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCritical('relief')}>Alivio Proyectado {renderSortIcon('critical', 'relief')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCritical('postRelief')}>Estatus Post-Alivio {renderSortIcon('critical', 'postRelief')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCritical('action')}>Acción Sugerida (Rol S&OP) {renderSortIcon('critical', 'action')}</th>
                  <th>Detalles / Comentarios</th>
                </tr>
              </thead>
              <tbody>
                {getSortedCriticalData()
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
                      <td onClick={(e) => e.stopPropagation()} style={{ minWidth: '165px' }}>
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
                          <button 
                            title="Revisión Director"
                            disabled={profile?.role !== 'director'}
                            onClick={() => handleUpdateReview(row.skuInfo.sku, 'revision_check', !review.revision_check)}
                            style={{
                              width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--panel-border)',
                              background: review.revision_check ? 'var(--danger)' : 'transparent',
                              color: review.revision_check ? 'white' : 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: profile?.role === 'director' ? 'pointer' : 'not-allowed',
                              opacity: profile?.role === 'director' ? 1 : 0.6
                            }}
                          >
                            <span style={{ fontSize: '10px', fontWeight: 'bold', opacity: review.revision_check ? 1 : 0.7 }}>R</span>
                          </button>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{row.skuInfo.sku}</td>
                      <td>{row.skuInfo.category}</td>
                      <td>{row.skuInfo.supplier}</td>
                      <td>
                        <span className="badge danger">{row.skuInfo.leadTimeWeeks} sem</span>
                      </td>
                      <td>
                        {row.projections[0]?.initialInventory !== undefined
                          ? Math.round(row.projections[0].initialInventory).toLocaleString('en-US')
                          : '0'}
                      </td>
                      <td>
                        {row.skuInfo.minSafetyStock !== undefined
                          ? Math.round(row.skuInfo.minSafetyStock).toLocaleString('en-US')
                          : '0'}
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
                  <td colSpan={13} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                    No hay materiales en riesgo crítico inminente para esta selección
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          )}
        </div>
      </div>

      {/* Capital Atrapado (Sobre-stock) */}
      <div style={{ marginTop: '2rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 
              onClick={() => setIsCapitalCollapsed(!isCapitalCollapsed)}
              style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}
              title={isCapitalCollapsed ? "Expandir tabla" : "Comprimir tabla"}
            >
              <DollarSign size={18} className={styles.warningText} />
              Capital Atrapado (Sobre-stock) <span style={{fontSize: '0.9rem', opacity: 0.7, fontWeight: 'normal'}}>({data.filter(row => row.projections[0].isCapitalInefficiency).length} SKUs)</span>
              {isCapitalCollapsed ? <ChevronDown size={16} style={{ opacity: 0.6 }} /> : <ChevronUp size={16} style={{ opacity: 0.6 }} />}
            </h3>
            <button 
              onClick={exportOverStockToExcel}
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
          
          {!isCapitalCollapsed && (
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px' }}>
              <table className={styles.table} style={{ position: 'relative' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--background)', zIndex: 1, boxShadow: '0 1px 0 var(--panel-border)' }}>
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCapital('resolved')}>Validaciones {renderSortIcon('capital', 'resolved')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCapital('sku')}>SKU {renderSortIcon('capital', 'sku')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCapital('category')}>Categoría {renderSortIcon('capital', 'category')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCapital('supplier')}>Proveedor {renderSortIcon('capital', 'supplier')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCapital('unitPrice')}>Precio Unitario Compra {renderSortIcon('capital', 'unitPrice')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCapital('moq')}>MOQ {renderSortIcon('capital', 'moq')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCapital('maxStock')}>Cantidad máxima permitida de stock {renderSortIcon('capital', 'maxStock')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCapital('currentInv')}>Cantidad actual de inventario {renderSortIcon('capital', 'currentInv')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCapital('overStockQty')}>Cantidad de sobre stock {renderSortIcon('capital', 'overStockQty')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCapital('overStockPct')}>% Excedente {renderSortIcon('capital', 'overStockPct')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortCapital('overStockVal')}>Valor de sobre stock {renderSortIcon('capital', 'overStockVal')}</th>
                  <th>Estatus</th>
                  <th>Detalle / Comentarios</th>
                </tr>
              </thead>
              <tbody>
                {getSortedCapitalData()
                  .map(row => {
                    const review = reviews[row.skuInfo.sku] || { is_resolved: false, comment: '', supervisor_check: false, planeador_check: false, director_vobo: false };
                    
                    const currentInv = row.projections[0].inventoryWithReceipts;
                    const maxStock = row.skuInfo.maxOptimalStock;
                    const overStockQty = Math.max(0, currentInv - maxStock);
                    const overStockVal = overStockQty * row.skuInfo.unitPrice;

                    return (
                      <tr key={`overstock-${row.skuInfo.sku}`} style={{ opacity: review.director_vobo ? 0.7 : 1, transition: 'opacity 0.3s', cursor: 'pointer' }} onClick={() => setSelectedSku(row)}>
                        <td onClick={(e) => e.stopPropagation()} style={{ minWidth: '165px' }}>
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
                            <button 
                              title="Revisión Director"
                              disabled={profile?.role !== 'director'}
                              onClick={() => handleUpdateReview(row.skuInfo.sku, 'revision_check', !review.revision_check)}
                              style={{
                                width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--panel-border)',
                                background: review.revision_check ? 'var(--danger)' : 'transparent',
                                color: review.revision_check ? 'white' : 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: profile?.role === 'director' ? 'pointer' : 'not-allowed',
                                opacity: profile?.role === 'director' ? 1 : 0.6
                              }}
                            >
                              <span style={{ fontSize: '10px', fontWeight: 'bold', opacity: review.revision_check ? 1 : 0.7 }}>R</span>
                            </button>
                          </div>
                        </td>
                        <td style={{ fontWeight: 500 }}>{row.skuInfo.sku}</td>
                        <td>{row.skuInfo.category}</td>
                        <td>{row.skuInfo.supplier}</td>
                        <td>${row.skuInfo.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>{Math.round(row.skuInfo.moq).toLocaleString('en-US')}</td>
                        <td>{Math.round(maxStock).toLocaleString('en-US')}</td>
                        <td style={{ color: 'var(--warning)', fontWeight: 500 }}>{Math.round(currentInv).toLocaleString('en-US')}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{Math.round(overStockQty).toLocaleString('en-US')}</td>
                        <td style={{ color: 'var(--warning)', fontWeight: 500 }}>{maxStock > 0 ? ((overStockQty / maxStock) * 100).toFixed(2) : '0.00'}%</td>
                        <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>${Math.round(overStockVal).toLocaleString('en-US')}</td>
                        <td>
                          <span className="badge danger">Sobre Stock</span>
                        </td>
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
                {data.filter(row => row.projections[0].isCapitalInefficiency).length === 0 && (
                  <tr>
                    <td colSpan={13} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                      No hay capital atrapado o sobre-stock registrado para esta selección
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {selectedSku && (
        <SkuDetailModal skuData={selectedSku} onClose={() => { setSelectedSku(null); fetchReviews(); }} companyId={companyId} />
      )}
    </div>
  );
}
