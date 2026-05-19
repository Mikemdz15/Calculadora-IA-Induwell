"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { PackageOpen, Check, Download, Plus, Save, X, Trash2, MessageSquare, ShieldCheck } from 'lucide-react';
import styles from './DashboardOverview.module.css';
import { SupplyChainRow } from '@/lib/supplyChainLogic';
import { useAuth } from '@/lib/authContext';
import NegotiationCommentsModal from './NegotiationCommentsModal';

export interface NegotiationRecord {
  id: string;
  month_id: string;
  director_check: boolean;
  supervisor_check: boolean;
  planeador_check: boolean;
  buyer: string;
  sku: string;
  description: string;
  supplier: string;
  inventory_qty: number;
  weekly_avg_consumption: number;
  previous_price: number;
  new_price: number;
  currency: 'MXN' | 'USD';
  exchange_rate: number;
  submission_date: string;
  comments: string;
}

interface NegotiationsPanelProps {
  data?: SupplyChainRow[];
  companyId: string;
}

export default function NegotiationsPanel({ data = [], companyId }: NegotiationsPanelProps) {
  const { profile } = useAuth();
  const [records, setRecords] = useState<NegotiationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isAdding, setIsAdding] = useState(false);
  const [selectedRecordForComments, setSelectedRecordForComments] = useState<NegotiationRecord | null>(null);

  const [newRecord, setNewRecord] = useState<Partial<NegotiationRecord>>({
    buyer: profile?.full_name || 'Comprador',
    sku: '',
    description: '',
    supplier: '',
    inventory_qty: 0,
    weekly_avg_consumption: 0,
    previous_price: 0,
    new_price: 0,
    currency: 'MXN',
    exchange_rate: 1,
    submission_date: new Date().toISOString().split('T')[0],
    comments: ''
  });

  const uniqueSkus = useMemo(() => {
    return Array.from(new Set(data.map(d => d.skuInfo.sku))).sort();
  }, [data]);

  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(data.map(d => d.skuInfo.supplier))).sort();
  }, [data]);

  const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedSku = e.target.value;
    
    // Find full object to auto-fill
    const skuInfo = data.find(d => d.skuInfo.sku === selectedSku);
    
    setNewRecord(prev => ({
      ...prev,
      sku: selectedSku,
      description: skuInfo ? skuInfo.skuInfo.description : prev.description,
      supplier: skuInfo ? skuInfo.skuInfo.supplier : prev.supplier,
      inventory_qty: skuInfo && skuInfo.projections[0] ? skuInfo.projections[0].inventoryWithReceipts : prev.inventory_qty,
      weekly_avg_consumption: skuInfo && skuInfo.projections.length > 0 
        ? Math.round(skuInfo.projections.reduce((sum, p) => sum + p.requiredMaterial, 0) / skuInfo.projections.length)
        : prev.weekly_avg_consumption,
      buyer: profile?.full_name || prev.buyer
    }));
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedMonth]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('partidas_negociacion')
        .select('*')
        .eq('month_id', selectedMonth)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Error fetching negotiations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDays = (subDate: string) => {
    if (!subDate) return 0;
    const diff = new Date().getTime() - new Date(subDate).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 3600 * 24)));
  };

  const calculateScope = (inv: number, cons: number) => {
    if (!cons || cons === 0) return 0;
    return parseFloat((inv / cons).toFixed(1));
  };

  const calculateIncrease = (prev: number, curr: number) => {
    if (!prev || prev === 0) return 0;
    return parseFloat((((curr - prev) / prev) * 100).toFixed(2));
  };

  const handleSaveNew = async () => {
    if (!newRecord.sku || !newRecord.description) {
      alert("SKU y Descripción son obligatorios.");
      return;
    }

    try {
      const { error, data: insertedData } = await supabase.from('partidas_negociacion').insert([{
        ...newRecord,
        month_id: selectedMonth,
        director_check: false,
        supervisor_check: false,
        planeador_check: false,
        company_id: companyId
      }]).select().single();

      if (error) throw error;
      
      // If there's an initial comment, save it to history
      if (newRecord.comments?.trim() && insertedData && profile) {
        await supabase.from('comments_history').insert({
          reference_id: insertedData.id,
          reference_type: 'negociacion',
          user_id: profile.id,
          user_name: profile.full_name,
          comment: newRecord.comments.trim(),
          company_id: companyId
        });
      }

      setIsAdding(false);
      setNewRecord({
        buyer: profile?.full_name || 'Comprador',
        sku: '',
        description: '',
        supplier: '',
        inventory_qty: 0,
        weekly_avg_consumption: 0,
        previous_price: 0,
        new_price: 0,
        currency: 'MXN',
        exchange_rate: 1,
        submission_date: new Date().toISOString().split('T')[0],
        comments: ''
      });
      fetchRecords();
    } catch (err) {
      console.error(err);
      alert("Error al guardar la partida.");
    }
  };

  const handleDelete = async (id: string) => {
    if (profile?.role !== 'director') {
      alert("Acceso denegado: Solo el perfil de Director puede eliminar registros.");
      return;
    }

    if (!window.confirm("¿Estás seguro de que deseas eliminar esta partida permanentemente?")) {
      return;
    }

    try {
      setRecords(records.filter(r => r.id !== id));
      const { error } = await supabase
        .from('partidas_negociacion')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error(err);
      fetchRecords();
      alert("Error al eliminar la partida.");
    }
  };

  const toggleCheck = async (id: string, field: 'supervisor_check' | 'planeador_check' | 'director_check', currentValue: boolean) => {
    if (!profile) return;
    
    if (field === 'supervisor_check' && profile.role !== 'supervisor_planeador' && profile.role !== 'director') return;
    if (field === 'planeador_check' && profile.role !== 'supervisor_planeador' && profile.role !== 'director') return;
    if (field === 'director_check' && profile.role !== 'director') return;

    try {
      setRecords(records.map(r => r.id === id ? { ...r, [field]: !currentValue } : r));
      const { error } = await supabase
        .from('partidas_negociacion')
        .update({ [field]: !currentValue })
        .eq('id', id);

      if (!error) {
        const currentRecord = records.find(r => r.id === id);
        if (currentRecord) {
          if (
            (field === 'supervisor_check' && !currentValue === true && currentRecord.planeador_check === true) ||
            (field === 'planeador_check' && !currentValue === true && currentRecord.supervisor_check === true)
          ) {
            await supabase.from('notifications').insert({
              target_role: 'director',
              message: `La partida de negociación ${currentRecord.sku} tiene VoBo de Supervisor y Planeador y espera tu autorización final.`,
              reference_id: id,
              reference_type: 'negociacion',
              company_id: companyId
            });
          }
        }
      } else {
        throw error;
      }
    } catch (err) {
      console.error(err);
      fetchRecords();
      alert("Error al actualizar estado.");
    }
  };

  const exportToExcel = () => {
    const headers = [
      "VoBo Dir.", "Sup.", "Plan.", "Comprador", "Producto", "Descripción", "Proveedor", 
      "Inventario", "Consumo Semanal", "Alcance (Semanas)", "Precio Anterior", 
      "Precio Nuevo", "Moneda", "T.C.", "Precio Nuevo M.N.", "Incremento %", "Fecha Entrega a Contraloría", 
      "Días sin VoBo", "Estatus"
    ];

    const rows = records.map(r => {
      const scope = calculateScope(r.inventory_qty, r.weekly_avg_consumption);
      const inc = calculateIncrease(r.previous_price, r.new_price);
      const days = calculateDays(r.submission_date);
      const status = r.director_check ? 'Cerrado' : 'Abierto';
      const nationalPrice = r.new_price * (r.exchange_rate || 1);
      
      return [
        r.director_check ? 'OK' : 'Pendiente',
        r.supervisor_check ? 'OK' : 'Pendiente',
        r.planeador_check ? 'OK' : 'Pendiente',
        r.buyer,
        r.sku,
        `"${r.description}"`,
        `"${r.supplier}"`,
        r.inventory_qty,
        r.weekly_avg_consumption,
        scope,
        r.previous_price,
        r.new_price,
        r.currency || 'MXN',
        r.exchange_rate || 1,
        nationalPrice.toFixed(2),
        `${inc}%`,
        r.submission_date,
        days,
        status
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Negociaciones_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthOptions = [];
  const d = new Date();
  for (let i = 0; i < 6; i++) {
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthOptions.push(mStr);
    d.setMonth(d.getMonth() - 1);
  }

  return (
    <div id="negociaciones" style={{ marginBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <PackageOpen size={24} color="var(--primary)" />
          Partidas en Negociación ({records.length})
        </h2>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              background: 'var(--panel-bg)',
              color: 'var(--foreground)',
              border: '1px solid var(--panel-border)',
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem'
            }}
          >
            {monthOptions.map(m => (
              <option key={m} value={m}>Mes Histórico: {m}</option>
            ))}
          </select>

          <button 
            onClick={exportToExcel}
            style={{
              background: 'transparent',
              color: 'var(--primary)',
              border: '1px solid var(--primary)',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Download size={16} /> Exportar CSV
          </button>
          
          <button 
            onClick={() => setIsAdding(!isAdding)}
            style={{
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600
            }}
          >
            {isAdding ? <X size={16} /> : <Plus size={16} />} 
            {isAdding ? 'Cancelar' : 'Nueva Partida'}
          </button>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        {isAdding && (
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px dashed var(--panel-border)' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Registrar Nueva Negociación</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <input type="text" placeholder="Comprador" value={newRecord.buyer || ''} onChange={e => setNewRecord({...newRecord, buyer: e.target.value})} style={inputStyle} disabled />
              
              <div>
                <input list="sku-options" type="text" placeholder="SKU (Buscar...)" value={newRecord.sku || ''} onChange={handleSkuChange} style={inputStyle} />
                <datalist id="sku-options">
                  {uniqueSkus.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <input type="text" placeholder="Descripción" value={newRecord.description || ''} onChange={e => setNewRecord({...newRecord, description: e.target.value})} style={inputStyle} />
              
              <div>
                <input list="supplier-options" type="text" placeholder="Proveedor (Buscar...)" value={newRecord.supplier || ''} onChange={e => setNewRecord({...newRecord, supplier: e.target.value})} style={inputStyle} />
                <datalist id="supplier-options">
                  {uniqueSuppliers.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.7rem', opacity: 0.7 }}>Inventario Actual</label>
                <input type="number" value={newRecord.inventory_qty || 0} onChange={e => setNewRecord({...newRecord, inventory_qty: Number(e.target.value)})} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.7rem', opacity: 0.7 }}>Consumo Semanal</label>
                <input type="number" value={newRecord.weekly_avg_consumption || 0} onChange={e => setNewRecord({...newRecord, weekly_avg_consumption: Number(e.target.value)})} style={inputStyle} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.7rem', opacity: 0.7 }}>Precio Anterior</label>
                <input type="number" step="0.01" value={newRecord.previous_price || 0} onChange={e => setNewRecord({...newRecord, previous_price: Number(e.target.value)})} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.7rem', opacity: 0.7 }}>Nuevo Precio</label>
                <input type="number" step="0.01" value={newRecord.new_price || 0} onChange={e => setNewRecord({...newRecord, new_price: Number(e.target.value)})} style={inputStyle} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.7rem', opacity: 0.7 }}>Moneda</label>
                <select 
                  value={newRecord.currency || 'MXN'} 
                  onChange={e => {
                    const c = e.target.value as 'MXN' | 'USD';
                    setNewRecord({...newRecord, currency: c, exchange_rate: c === 'MXN' ? 1 : newRecord.exchange_rate});
                  }} 
                  style={inputStyle}
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.7rem', opacity: 0.7 }}>Tipo de Cambio (T.C.)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={newRecord.exchange_rate || 1} 
                  onChange={e => setNewRecord({...newRecord, exchange_rate: Number(e.target.value)})} 
                  style={{...inputStyle, opacity: newRecord.currency === 'MXN' ? 0.5 : 1}} 
                  disabled={newRecord.currency === 'MXN'}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.7rem', opacity: 0.7 }}>Fecha Entrega a Contraloría</label>
                <input type="date" value={newRecord.submission_date || ''} onChange={e => setNewRecord({...newRecord, submission_date: e.target.value})} style={inputStyle} />
              </div>
              <input type="text" placeholder="Comentario Inicial" value={newRecord.comments || ''} onChange={e => setNewRecord({...newRecord, comments: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1'}} />
            </div>
            <button onClick={handleSaveNew} style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>Guardar Partida</button>
          </div>
        )}

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Validaciones</th>
              <th>Estatus</th>
              <th>Comprador</th>
              <th>SKU</th>
              <th>Descripción</th>
              <th>Proveedor</th>
              <th>Inv.</th>
              <th>Consumo</th>
              <th>Alcance<br/>(Sem)</th>
              <th>Precio<br/>Ant.</th>
              <th>Precio<br/>Nvo.</th>
              <th>Moneda</th>
              <th>T.C.</th>
              <th>Precio Nvo.<br/>M.N.</th>
              <th>Incr.<br/>(%)</th>
              <th>Fecha a<br/>Contraloría</th>
              <th>Días sin<br/>VoBo</th>
              <th>Comentarios</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={19} style={{ textAlign: 'center', padding: '2rem' }}>Cargando partidas...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={19} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No hay negociaciones registradas para este mes.</td></tr>
            ) : records.map(r => {
              const isChecked = r.director_check;
              const statusLabel = isChecked ? 'Cerrado' : 'Abierto';
              const days = calculateDays(r.submission_date);
              
              return (
                <tr key={r.id} style={{ opacity: isChecked ? 0.7 : 1 }}>
                  <td style={{ minWidth: '100px' }}>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button 
                        title="Check Supervisor"
                        disabled={profile?.role !== 'supervisor_planeador' && profile?.role !== 'director'}
                        onClick={() => toggleCheck(r.id, 'supervisor_check', r.supervisor_check)}
                        style={{
                          width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--panel-border)',
                          background: r.supervisor_check ? 'var(--warning)' : 'transparent', color: r.supervisor_check ? 'white' : 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: (profile?.role === 'supervisor_planeador' || profile?.role === 'director') ? 'pointer' : 'not-allowed',
                          opacity: (profile?.role === 'supervisor_planeador' || profile?.role === 'director') ? 1 : 0.6
                        }}
                      >
                        {r.supervisor_check ? <Check size={14} /> : <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 'bold' }}>S</span>}
                      </button>
                      <button 
                        title="Check Planeador"
                        disabled={profile?.role !== 'supervisor_planeador' && profile?.role !== 'director'}
                        onClick={() => toggleCheck(r.id, 'planeador_check', r.planeador_check)}
                        style={{
                          width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--panel-border)',
                          background: r.planeador_check ? 'var(--warning)' : 'transparent', color: r.planeador_check ? 'white' : 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: (profile?.role === 'supervisor_planeador' || profile?.role === 'director') ? 'pointer' : 'not-allowed',
                          opacity: (profile?.role === 'supervisor_planeador' || profile?.role === 'director') ? 1 : 0.6
                        }}
                      >
                        {r.planeador_check ? <Check size={14} /> : <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 'bold' }}>P</span>}
                      </button>
                      <button 
                        title="VoBo Director"
                        disabled={profile?.role !== 'director'}
                        onClick={() => toggleCheck(r.id, 'director_check', r.director_check)}
                        style={{
                          width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--panel-border)',
                          background: r.director_check ? 'var(--success)' : 'transparent', color: r.director_check ? 'white' : 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: profile?.role === 'director' ? 'pointer' : 'not-allowed',
                          opacity: profile?.role === 'director' ? 1 : 0.6
                        }}
                      >
                        {r.director_check ? <ShieldCheck size={14} /> : <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 'bold' }}>D</span>}
                      </button>
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      background: isChecked ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                      color: isChecked ? 'var(--success)' : 'var(--warning)'
                    }}>
                      {statusLabel}
                    </span>
                  </td>
                  <td>{r.buyer}</td>
                  <td style={{ fontWeight: 600 }}>{r.sku}</td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.description}>{r.description}</td>
                  <td>{r.supplier}</td>
                  <td style={{ textAlign: 'right' }}>{r.inventory_qty?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style={{ textAlign: 'right' }}>{r.weekly_avg_consumption?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: calculateScope(r.inventory_qty, r.weekly_avg_consumption) < 2 ? 'var(--danger)' : 'inherit' }}>
                    {calculateScope(r.inventory_qty, r.weekly_avg_consumption).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td style={{ textAlign: 'right' }}>${r.previous_price?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style={{ textAlign: 'right', color: r.new_price > r.previous_price ? 'var(--danger)' : 'var(--success)' }}>${r.new_price?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style={{ textAlign: 'center' }}>{r.currency || 'MXN'}</td>
                  <td style={{ textAlign: 'center' }}>{r.currency === 'USD' ? (r.exchange_rate || 1).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ${(r.new_price * (r.exchange_rate || 1)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    <span style={{ color: r.new_price > r.previous_price ? 'var(--danger)' : 'var(--success)' }}>
                      {calculateIncrease(r.previous_price, r.new_price).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
                    </span>
                  </td>
                  <td>{r.submission_date}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: !isChecked && days > 3 ? 'var(--danger)' : 'inherit' }}>
                    {isChecked ? '-' : days}
                  </td>
                  <td>
                    <button 
                      onClick={() => setSelectedRecordForComments(r)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)',
                        padding: '0.4rem 0.6rem', borderRadius: '4px', color: 'var(--foreground)',
                        cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap'
                      }}
                    >
                      <MessageSquare size={14} />
                      Bitácora
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {profile?.role === 'director' && (
                      <button 
                        onClick={() => handleDelete(r.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.8
                        }}
                        title="Eliminar partida permanentemente"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedRecordForComments && (
        <NegotiationCommentsModal 
          record={selectedRecordForComments} 
          onClose={() => setSelectedRecordForComments(null)} 
          companyId={companyId}
        />
      )}
    </div>
  );
}

const inputStyle = {
  background: 'var(--background)',
  color: 'var(--foreground)',
  border: '1px solid var(--panel-border)',
  padding: '0.5rem',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box' as const
};
