"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { SupplyChainRow } from '@/lib/supplyChainLogic';
import MultiSelect from './MultiSelect';
import DashboardOverview, { getPostReliefStatusLabel } from './DashboardOverview';
import SupplyChainMatrix from './SupplyChainMatrix';
import WeeklyUpdateModal from './WeeklyUpdateModal';
import AiDiagnosticPanel from './AiDiagnosticPanel';
import NegotiationsPanel from './NegotiationsPanel';
import { supabase } from '@/lib/supabase';
import { getISOWeekString } from '@/lib/dateUtils';
import { Download } from 'lucide-react';

interface DashboardContainerProps {
  data: SupplyChainRow[];
  companyId: string;
}

export default function DashboardContainer({ data, companyId }: DashboardContainerProps) {
  // 1. Exclude INDIRECTOS and empty categories globally for the dashboard
  const validData = useMemo(() => {
    return data.filter(d => {
      const cat = d.skuInfo.category.toUpperCase().trim();
      return cat !== 'INDIRECTOS' && cat !== '' && cat !== 'SIN CATEGORÍA';
    });
  }, [data]);

  // Extract unique options from validData
  const allCategories = useMemo(() => Array.from(new Set(validData.map(d => d.skuInfo.category).filter(c => c !== ''))).sort(), [validData]);
  const allBuyers = useMemo(() => Array.from(new Set(validData.map(d => d.skuInfo.buyer).filter(c => c !== ''))).sort(), [validData]);
  const allSuppliers = useMemo(() => Array.from(new Set(validData.map(d => d.skuInfo.supplier).filter(c => c !== ''))).sort(), [validData]);

  const stockoutOptions = ['Semana N', 'Semana N+1', 'Semana N+2', 'Semana N+3', 'Semana N+4', 'Semana N+5', 'Sin Ruptura'];
  const reliefOptions = ['Crítico (Paro Potencial)', 'Recuperado', 'Parcial (Aún bajo Min)', 'Insuficiente', 'Sin Riesgo'];

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedStockoutWeeks, setSelectedStockoutWeeks] = useState<string[]>(stockoutOptions);
  const [selectedReliefStatuses, setSelectedReliefStatuses] = useState<string[]>(reliefOptions);

  // System Config State
  const [isCheckingWeek, setIsCheckingWeek] = useState(true);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
  const [dbWeekId, setDbWeekId] = useState<string | null>(null);
  const actualWeekId = getISOWeekString();

  // Initialize with all selected
  useEffect(() => {
    setSelectedCategories(allCategories);
    setSelectedBuyers(allBuyers);
    setSelectedSuppliers(allSuppliers);
  }, [allCategories, allBuyers, allSuppliers]);

  // Check system config for week lock
  useEffect(() => {
    async function checkSystemWeek() {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'current_week')
          .eq('company_id', companyId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching system config:", error);
          setIsCheckingWeek(false);
          return;
        }

        if (data && data.value && data.value.week_id) {
          setDbWeekId(data.value.week_id);
          // Compare strings directly. e.g. "2024-W19" < "2024-W20"
          if (data.value.week_id < actualWeekId) {
            setNeedsUpdate(true);
          }
        } else {
          // If no config exists, create it
          await supabase.from('system_config').insert({
            key: 'current_week',
            company_id: companyId,
            value: { week_id: actualWeekId }
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingWeek(false);
      }
    }
    checkSystemWeek();
  }, [actualWeekId]);

  const handleConfirmUpdate = async () => {
    setIsProcessingUpdate(true);
    try {
      if (!dbWeekId) return;

      // 1. Fetch current reviews
      const { data: currentReviews, error: fetchError } = await supabase
        .from('sku_reviews')
        .select('*')
        .eq('company_id', companyId);
        
      if (fetchError) throw fetchError;

      if (currentReviews && currentReviews.length > 0) {
        // 2. Map for history insertion
        const historyRecords = currentReviews.map(r => ({
          week_id: dbWeekId, // Record them under the OLD week that just ended
          sku_id: r.sku_id,
          is_resolved: r.is_resolved,
          comment: r.comment,
          resolved_by_user_id: r.resolved_by_user_id,
          company_id: companyId
        }));

        // 3. Insert into history
        const { error: insertError } = await supabase
          .from('sku_reviews_history')
          .insert(historyRecords);
          
        if (insertError) throw insertError;

        // 4. Delete all current reviews (Borrón y cuenta nueva)
        const { error: deleteError } = await supabase
          .from('sku_reviews')
          .delete()
          .eq('company_id', companyId)
          .not('sku_id', 'is', null); // Delete all for this company

        if (deleteError) throw deleteError;
      }

      // 4.5 Backup AI Diagnosis
      const { data: currentDiag } = await supabase
        .from('weekly_diagnostics')
        .select('*')
        .eq('week_id', dbWeekId)
        .eq('company_id', companyId)
        .single();
        
      if (currentDiag) {
        await supabase.from('weekly_diagnostics_history').insert({
          week_id: dbWeekId,
          company_id: companyId,
          diagnosis_text: currentDiag.diagnosis_text
        });
        await supabase.from('weekly_diagnostics').delete()
          .eq('week_id', dbWeekId)
          .eq('company_id', companyId);
      }

      // 5. Update system config to actual week
      await supabase
        .from('system_config')
        .update({ value: { week_id: actualWeekId } })
        .eq('key', 'current_week')
        .eq('company_id', companyId);

      // 6. Release lock
      setNeedsUpdate(false);
      setDbWeekId(actualWeekId);

      // We should also force reload the window to clear local state if needed
      window.location.reload();
      
    } catch (error: any) {
      console.error("Error during weekly update:", error);
      alert(`Hubo un error al procesar el respaldo: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsProcessingUpdate(false);
    }
  };

  const handleDownloadHistory = async () => {
    // Simple implementation for downloading CSV
    const { data, error } = await supabase.from('sku_reviews_history')
      .select('*')
      .eq('company_id', companyId)
      .order('week_id', { ascending: false });
    if (error || !data) {
      alert("Error al descargar el histórico");
      return;
    }
    
    const headers = ["ID Semana", "SKU", "Comentario", "Resuelto", "Usuario", "Fecha Archivo"];
    const csvContent = [
      headers.join(","),
      ...data.map(row => `"${row.week_id}","${row.sku_id}","${(row.comment || '').replace(/"/g, '""')}","${row.is_resolved ? 'Sí' : 'No'}","${row.resolved_by_user_id}","${row.archived_at}"`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "historico_sop_comentarios.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Filter data globally
  const filteredData = useMemo(() => {
    return validData.filter(d => {
      // 1. Match categories, buyers, suppliers
      if (selectedCategories.length > 0 && !selectedCategories.includes(d.skuInfo.category)) return false;
      if (selectedBuyers.length > 0 && !selectedBuyers.includes(d.skuInfo.buyer)) return false;
      if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(d.skuInfo.supplier)) return false;

      // 2. Match Stockout Week
      const w = d.riskAssessment.stockoutWeekIdx;
      const weekStr = w === null ? 'Sin Ruptura' : `Semana N${w === 0 ? '' : '+' + w}`;
      if (!selectedStockoutWeeks.includes(weekStr)) return false;

      // 3. Match Post-Relief Status
      // If it's not a critical risk, we consider it "Sin Riesgo" for the global filter
      let status = 'Sin Riesgo';
      if (d.riskAssessment.isCriticalRisk) {
        status = getPostReliefStatusLabel(d.riskAssessment, d.skuInfo.minSafetyStock);
      }
      if (!selectedReliefStatuses.includes(status)) return false;

      return true;
    });
  }, [validData, selectedCategories, selectedBuyers, selectedSuppliers, selectedStockoutWeeks, selectedReliefStatuses]);

  return (
    <div>
      {needsUpdate && !isCheckingWeek && (
        <WeeklyUpdateModal 
          currentWeek={actualWeekId} 
          onConfirm={handleConfirmUpdate} 
          isProcessing={isProcessingUpdate} 
          companyId={companyId}
        />
      )}

      {/* Global Filters */}
      <div style={{ position: 'relative', zIndex: 100, background: 'var(--panel-bg)', backdropFilter: 'blur(12px)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--panel-border)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', margin: 0, opacity: 0.8 }}>Filtros Globales de S&OP</h3>
          <button 
            onClick={handleDownloadHistory}
            style={{
              background: 'transparent',
              color: 'var(--primary)',
              border: '1px solid var(--primary)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
            <Download size={16} />
            Descargar Históricos (CSV)
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <MultiSelect 
            title="Categoría"
            options={allCategories}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            placeholder="Todas las Categorías"
          />
          <MultiSelect 
            title="Comprador"
            options={allBuyers}
            selected={selectedBuyers}
            onChange={setSelectedBuyers}
            placeholder="Todos los Compradores"
          />
          <MultiSelect 
            title="Proveedor"
            options={allSuppliers}
            selected={selectedSuppliers}
            onChange={setSelectedSuppliers}
            placeholder="Todos los Proveedores"
          />
          <div style={{ width: '1px', background: 'var(--panel-border)', margin: '0 0.5rem' }}></div>
          <MultiSelect 
            title="Semana de Paro Planta"
            options={stockoutOptions}
            selected={selectedStockoutWeeks}
            onChange={setSelectedStockoutWeeks}
            placeholder="Semana de Paro"
          />
          <MultiSelect 
            title="Estatus Post-Alivio"
            options={reliefOptions}
            selected={selectedReliefStatuses}
            onChange={setSelectedReliefStatuses}
            placeholder="Estatus Alivio"
          />
        </div>
      </div>

      <div id="ai-diagnostic" style={{ marginBottom: '2rem' }}>
        <AiDiagnosticPanel currentWeekId={actualWeekId} data={filteredData} companyId={companyId} />
      </div>

      <div id="dashboard" style={{ marginBottom: '2rem' }}>
        {/* Pass filtered data to DashboardOverview */}
        <DashboardOverview data={filteredData} companyId={companyId} />
      </div>

      <div id="matriz" style={{ marginBottom: '2rem' }}>
        {/* Pass filtered data to SupplyChainMatrix */}
        <SupplyChainMatrix data={filteredData} />
      </div>

      <NegotiationsPanel data={validData} companyId={companyId} />
    </div>
  );
}
