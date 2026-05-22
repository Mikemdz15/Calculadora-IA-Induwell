"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { PackageOpen, Check, Download, Plus, Save, X, Trash2, MessageSquare, ShieldCheck, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedRecordForComments, setSelectedRecordForComments] = useState<NegotiationRecord | null>(null);

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingRecordFields, setEditingRecordFields] = useState<Partial<NegotiationRecord>>({});

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'submission_date',
    direction: 'desc',
  });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <span style={{ opacity: 0.3, marginLeft: '0.25rem' }}>↕</span>;
    return sortConfig.direction === 'asc' 
      ? <span style={{ marginLeft: '0.25rem', color: 'var(--primary)', fontSize: '0.75rem' }}>▲</span> 
      : <span style={{ marginLeft: '0.25rem', color: 'var(--primary)', fontSize: '0.75rem' }}>▼</span>;
  };

  const sortedRecords = useMemo(() => {
    const list = [...records];
    if (!sortConfig.key) return list;

    return list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortConfig.key) {
        case 'validations':
          valA = (a.supervisor_check ? 1 : 0) + (a.planeador_check ? 1 : 0) + (a.director_check ? 1 : 0);
          valB = (b.supervisor_check ? 1 : 0) + (b.planeador_check ? 1 : 0) + (b.director_check ? 1 : 0);
          break;
        case 'status':
          valA = a.director_check ? 1 : 0;
          valB = b.director_check ? 1 : 0;
          break;
        case 'buyer':
          valA = a.buyer || '';
          valB = b.buyer || '';
          break;
        case 'sku':
          valA = a.sku || '';
          valB = b.sku || '';
          break;
        case 'description':
          valA = a.description || '';
          valB = b.description || '';
          break;
        case 'supplier':
          valA = a.supplier || '';
          valB = b.supplier || '';
          break;
        case 'inventory_qty':
          valA = a.inventory_qty ?? 0;
          valB = b.inventory_qty ?? 0;
          break;
        case 'weekly_avg_consumption':
          valA = a.weekly_avg_consumption ?? 0;
          valB = b.weekly_avg_consumption ?? 0;
          break;
        case 'scope':
          valA = calculateScope(a.inventory_qty, a.weekly_avg_consumption);
          valB = calculateScope(b.inventory_qty, b.weekly_avg_consumption);
          break;
        case 'previous_price':
          valA = a.previous_price ?? 0;
          valB = b.previous_price ?? 0;
          break;
        case 'new_price':
          valA = a.new_price ?? 0;
          valB = b.new_price ?? 0;
          break;
        case 'currency':
          valA = a.currency || 'MXN';
          valB = b.currency || 'MXN';
          break;
        case 'exchange_rate':
          valA = a.exchange_rate ?? 1;
          valB = b.exchange_rate ?? 1;
          break;
        case 'nationalPrice':
          valA = (a.new_price || 0) * (a.exchange_rate || 1);
          valB = (b.new_price || 0) * (b.exchange_rate || 1);
          break;
        case 'increase':
          valA = calculateIncrease(a.previous_price, a.new_price);
          valB = calculateIncrease(b.previous_price, b.new_price);
          break;
        case 'submission_date':
          valA = a.submission_date || '';
          valB = b.submission_date || '';
          break;
        case 'daysWithoutVobo':
          valA = a.director_check ? -1 : calculateDays(a.submission_date);
          valB = b.director_check ? -1 : calculateDays(b.submission_date);
          break;
        default:
          break;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortConfig.direction === 'asc' 
          ? (valA > valB ? 1 : valA < valB ? -1 : 0) 
          : (valB > valA ? 1 : valB < valA ? -1 : 0);
      }
    });
  }, [records, sortConfig]);

  const handleStartEdit = (record: NegotiationRecord) => {
    setEditingRecordId(record.id);
    setEditingRecordFields({ ...record });
  };

  const handleEditSkuChange = (sku: string) => {
    const skuInfo = data.find(d => d.skuInfo.sku === sku);
    setEditingRecordFields(prev => ({
      ...prev,
      sku,
      description: skuInfo ? skuInfo.skuInfo.description : prev.description,
      supplier: skuInfo ? skuInfo.skuInfo.supplier : prev.supplier,
      inventory_qty: skuInfo && skuInfo.projections[0] ? skuInfo.projections[0].inventoryWithReceipts : prev.inventory_qty,
      weekly_avg_consumption: skuInfo && skuInfo.projections.length > 0 
        ? Math.round(skuInfo.projections.reduce((sum, p) => sum + p.requiredMaterial, 0) / skuInfo.projections.length)
        : prev.weekly_avg_consumption,
    }));
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('partidas_negociacion')
        .update({
          buyer: editingRecordFields.buyer,
          sku: editingRecordFields.sku,
          description: editingRecordFields.description,
          supplier: editingRecordFields.supplier,
          inventory_qty: editingRecordFields.inventory_qty,
          weekly_avg_consumption: editingRecordFields.weekly_avg_consumption,
          previous_price: editingRecordFields.previous_price,
          new_price: editingRecordFields.new_price,
          currency: editingRecordFields.currency,
          exchange_rate: editingRecordFields.exchange_rate,
          submission_date: editingRecordFields.submission_date
        })
        .eq('id', id);

      if (error) throw error;

      setEditingRecordId(null);
      fetchRecords();
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la partida de negociación.");
    }
  };

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

  useEffect(() => {
    const handleOpenNotification = (e: any) => {
      if (e.detail && e.detail.type === 'negociacion') {
        const record = records.find(r => r.id === e.detail.id);
        if (record) {
          setSelectedRecordForComments(record);
        }
      }
    };

    window.addEventListener('open-notification', handleOpenNotification);
    return () => window.removeEventListener('open-notification', handleOpenNotification);
  }, [records]);

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
        <h2 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, cursor: 'pointer', userSelect: 'none' }}
          title={isCollapsed ? "Expandir panel" : "Comprimir panel"}
        >
          <PackageOpen size={24} color="var(--primary)" />
          Partidas en Negociación ({records.length})
          {isCollapsed ? <ChevronDown size={18} style={{ opacity: 0.6 }} /> : <ChevronUp size={18} style={{ opacity: 0.6 }} />}
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

      {!isCollapsed && (
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
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('validations')}>Validaciones {renderSortIcon('validations')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('status')}>Estatus {renderSortIcon('status')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('buyer')}>Comprador {renderSortIcon('buyer')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('sku')}>SKU {renderSortIcon('sku')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('description')}>Descripción {renderSortIcon('description')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('supplier')}>Proveedor {renderSortIcon('supplier')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('inventory_qty')}>Inv. {renderSortIcon('inventory_qty')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('weekly_avg_consumption')}>Consumo {renderSortIcon('weekly_avg_consumption')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('scope')}>Alcance<br/>(Sem) {renderSortIcon('scope')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('previous_price')}>Precio<br/>Ant. {renderSortIcon('previous_price')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('new_price')}>Precio<br/>Nvo. {renderSortIcon('new_price')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('currency')}>Moneda {renderSortIcon('currency')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('exchange_rate')}>T.C. {renderSortIcon('exchange_rate')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('nationalPrice')}>Precio Nvo.<br/>M.N. {renderSortIcon('nationalPrice')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('increase')}>Incr.<br/>(%) {renderSortIcon('increase')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('submission_date')}>Fecha a<br/>Contraloría {renderSortIcon('submission_date')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('daysWithoutVobo')}>Días sin<br/>VoBo {renderSortIcon('daysWithoutVobo')}</th>
              <th>Comentarios</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={19} style={{ textAlign: 'center', padding: '2rem' }}>Cargando partidas...</td></tr>
            ) : sortedRecords.length === 0 ? (
              <tr><td colSpan={19} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No hay negociaciones registradas para este mes.</td></tr>
            ) : sortedRecords.map(r => {
              const isChecked = r.director_check;
              const statusLabel = isChecked ? 'Cerrado' : 'Abierto';
              const days = calculateDays(r.submission_date);
              const isEditing = editingRecordId === r.id;
              
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
                  <td>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editingRecordFields.buyer || ''} 
                        onChange={e => setEditingRecordFields(prev => ({ ...prev, buyer: e.target.value }))} 
                        style={tableInputStyle} 
                      />
                    ) : r.buyer}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {isEditing ? (
                      <input 
                        type="text" 
                        list="unique-skus" 
                        value={editingRecordFields.sku || ''} 
                        onChange={e => handleEditSkuChange(e.target.value)} 
                        style={tableInputStyle} 
                      />
                    ) : r.sku}
                  </td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={isEditing ? editingRecordFields.description : r.description}>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editingRecordFields.description || ''} 
                        onChange={e => setEditingRecordFields(prev => ({ ...prev, description: e.target.value }))} 
                        style={tableInputStyle} 
                      />
                    ) : r.description}
                  </td>
                  <td>
                    {isEditing ? (
                      <input 
                        type="text" 
                        list="unique-suppliers" 
                        value={editingRecordFields.supplier || ''} 
                        onChange={e => setEditingRecordFields(prev => ({ ...prev, supplier: e.target.value }))} 
                        style={tableInputStyle} 
                      />
                    ) : r.supplier}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={editingRecordFields.inventory_qty ?? ''} 
                        onChange={e => setEditingRecordFields(prev => ({ ...prev, inventory_qty: Number(e.target.value) }))} 
                        style={tableInputStyle} 
                      />
                    ) : r.inventory_qty?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={editingRecordFields.weekly_avg_consumption ?? ''} 
                        onChange={e => setEditingRecordFields(prev => ({ ...prev, weekly_avg_consumption: Number(e.target.value) }))} 
                        style={tableInputStyle} 
                      />
                    ) : r.weekly_avg_consumption?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: (isEditing ? calculateScope(editingRecordFields.inventory_qty || 0, editingRecordFields.weekly_avg_consumption || 0) : calculateScope(r.inventory_qty, r.weekly_avg_consumption)) < 2 ? 'var(--danger)' : 'inherit' }}>
                    {isEditing 
                      ? calculateScope(editingRecordFields.inventory_qty || 0, editingRecordFields.weekly_avg_consumption || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                      : calculateScope(r.inventory_qty, r.weekly_avg_consumption).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isEditing ? (
                      <input 
                        type="number" 
                        step="0.01" 
                        value={editingRecordFields.previous_price ?? ''} 
                        onChange={e => setEditingRecordFields(prev => ({ ...prev, previous_price: Number(e.target.value) }))} 
                        style={tableInputStyle} 
                      />
                    ) : `$${r.previous_price?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                  </td>
                  <td style={{ textAlign: 'right', color: (isEditing ? (editingRecordFields.new_price || 0) > (editingRecordFields.previous_price || 0) : r.new_price > r.previous_price) ? 'var(--danger)' : 'var(--success)' }}>
                    {isEditing ? (
                      <input 
                        type="number" 
                        step="0.01" 
                        value={editingRecordFields.new_price ?? ''} 
                        onChange={e => setEditingRecordFields(prev => ({ ...prev, new_price: Number(e.target.value) }))} 
                        style={tableInputStyle} 
                      />
                    ) : `$${r.new_price?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isEditing ? (
                      <select 
                        value={editingRecordFields.currency || 'MXN'} 
                        onChange={e => setEditingRecordFields(prev => ({ ...prev, currency: e.target.value as 'MXN' | 'USD', exchange_rate: e.target.value === 'MXN' ? 1 : prev.exchange_rate }))} 
                        style={tableInputStyle}
                      >
                        <option value="MXN">MXN</option>
                        <option value="USD">USD</option>
                      </select>
                    ) : (r.currency || 'MXN')}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isEditing ? (
                      <input 
                        type="number" 
                        step="0.01" 
                        disabled={editingRecordFields.currency === 'MXN'} 
                        value={editingRecordFields.currency === 'MXN' ? '' : (editingRecordFields.exchange_rate ?? '')} 
                        onChange={e => setEditingRecordFields(prev => ({ ...prev, exchange_rate: Number(e.target.value) }))} 
                        style={tableInputStyle} 
                      />
                    ) : (r.currency === 'USD' ? (r.exchange_rate || 1).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-')}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {isEditing 
                      ? `$${((editingRecordFields.new_price || 0) * (editingRecordFields.exchange_rate || 1)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                      : `$${(r.new_price * (r.exchange_rate || 1)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    <span style={{ color: (isEditing ? (editingRecordFields.new_price || 0) > (editingRecordFields.previous_price || 0) : r.new_price > r.previous_price) ? 'var(--danger)' : 'var(--success)' }}>
                      {isEditing 
                        ? `${calculateIncrease(editingRecordFields.previous_price || 0, editingRecordFields.new_price || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%`
                        : `${calculateIncrease(r.previous_price, r.new_price).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%`}
                    </span>
                  </td>
                  <td>
                    {isEditing ? (
                      <input 
                        type="date" 
                        value={editingRecordFields.submission_date || ''} 
                        onChange={e => setEditingRecordFields(prev => ({ ...prev, submission_date: e.target.value }))} 
                        style={tableInputStyle} 
                      />
                    ) : r.submission_date}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: !isChecked && (isEditing ? calculateDays(editingRecordFields.submission_date || '') : days) > 3 ? 'var(--danger)' : 'inherit' }}>
                    {isChecked ? '-' : (isEditing ? calculateDays(editingRecordFields.submission_date || '') : days)}
                  </td>
                  <td>
                    <button 
                      onClick={() => setSelectedRecordForComments(r)}
                      disabled={isEditing}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)',
                        padding: '0.4rem 0.6rem', borderRadius: '4px', color: 'var(--foreground)',
                        cursor: isEditing ? 'not-allowed' : 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap',
                        opacity: isEditing ? 0.5 : 1
                      }}
                    >
                      <MessageSquare size={14} />
                      Bitácora
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {profile?.role === 'director' && (
                      isEditing ? (
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleSaveEdit(r.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--success)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                            title="Guardar cambios"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => setEditingRecordId(null)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', padding: '0.2rem', opacity: 0.8, display: 'flex', alignItems: 'center' }}
                            title="Cancelar"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleStartEdit(r)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                            title="Editar partida"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(r.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', opacity: 0.8 }}
                            title="Eliminar partida permanentemente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

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

const tableInputStyle = {
  background: 'rgba(0,0,0,0.5)',
  color: 'white',
  border: '1px solid var(--panel-border)',
  padding: '0.2rem 0.3rem',
  width: '100%',
  borderRadius: '4px',
  fontSize: '0.8rem',
  outline: 'none',
  boxSizing: 'border-box' as const
};

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
