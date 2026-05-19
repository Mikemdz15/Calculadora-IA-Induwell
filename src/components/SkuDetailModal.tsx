"use client";

import React, { useState, useEffect } from 'react';
import { X, Send, Clock, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';
import { SupplyChainRow } from '@/lib/supplyChainLogic';
import { getPostReliefStatusLabel } from './DashboardOverview';

interface CommentHistory {
  id: string;
  user_name: string;
  comment: string;
  created_at: string;
}

interface SkuDetailModalProps {
  skuData: SupplyChainRow;
  onClose: () => void;
}

export default function SkuDetailModal({ skuData, onClose }: SkuDetailModalProps) {
  const { profile } = useAuth();
  const [comments, setComments] = useState<CommentHistory[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const ra = skuData.riskAssessment;

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comments_history')
      .select('*')
      .eq('reference_id', skuData.skuInfo.sku)
      .eq('reference_type', 'sku_review')
      .order('created_at', { ascending: false });
    
    if (data && !error) {
      setComments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [skuData.skuInfo.sku]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !profile) return;

    const newCommentStr = newComment.trim();
    const { error } = await supabase.from('comments_history').insert({
      reference_id: skuData.skuInfo.sku,
      reference_type: 'sku_review',
      user_id: profile.id,
      user_name: profile.full_name,
      comment: newCommentStr
    });

    if (!error) {
      // Notify other participants in the thread
      const otherCommenters = Array.from(new Set(comments.map(c => c.user_name)))
        .filter(name => name !== profile.full_name);
      
      for (const commenterName of otherCommenters) {
        await supabase.from('notifications').insert({
          target_buyer_name: commenterName,
          message: `${profile.full_name} comentó en el SKU ${skuData.skuInfo.sku}: "${newCommentStr.substring(0, 30)}..."`,
          reference_id: skuData.skuInfo.sku,
          reference_type: 'sku_review'
        });
      }

      setNewComment('');
      fetchComments();
    } else {
      console.error(error);
      alert('Error agregando comentario');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '1rem'
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: '900px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        padding: 0, overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem', borderBottom: '1px solid var(--panel-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--panel-bg)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={24} className="text-danger" />
              Detalle Crítico: {skuData.skuInfo.sku}
            </h2>
            <div style={{ color: 'var(--foreground)', opacity: 0.7, fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {skuData.skuInfo.description}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Left Panel: Information */}
          <div style={{ flex: '1 1 50%', borderRight: '1px solid var(--panel-border)', padding: '1.5rem', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Información de la Partida</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Proveedor</div>
                <div style={{ fontWeight: 500 }}>{skuData.skuInfo.supplier}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Lead Time</div>
                <div style={{ fontWeight: 500 }} className="text-danger">{skuData.skuInfo.leadTimeWeeks} semanas</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Inventario Actual</div>
                <div style={{ fontWeight: 500 }}>{skuData.projections[0]?.initialInventory?.toLocaleString() || 0} u.</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Consumo Promedio</div>
                <div style={{ fontWeight: 500 }}>
                  {(skuData.projections.length > 0 
                    ? Math.round(skuData.projections.reduce((sum, p) => sum + p.requiredMaterial, 0) / skuData.projections.length) 
                    : 0).toLocaleString()} u./sem
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Estado de Riesgo</h3>
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Semana de Ruptura (Paro Planta): </span>
                <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>
                  {ra.stockoutWeekIdx !== null ? `Semana N+${ra.stockoutWeekIdx}` : 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Déficit Proyectado: </span>
                <span style={{ fontWeight: 'bold' }}>{ra.stockoutQty?.toLocaleString() || 0} unidades</span>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Plan de Alivio</h3>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '6px' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Alivio Esperado: </span>
                {ra.reliefWeekIdx !== null ? (
                  <span className="text-success" style={{ fontWeight: 500 }}>
                    +{ra.reliefQty?.toLocaleString()} u. en N+{ra.reliefWeekIdx}
                  </span>
                ) : (
                  <span style={{ opacity: 0.5 }}>Sin Órdenes en Tránsito</span>
                )}
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Estatus Post-Alivio: </span>
                <span style={{ fontWeight: 500 }}>{getPostReliefStatusLabel(ra, skuData.skuInfo.minSafetyStock)}</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Comments History */}
          <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} /> Historial de Comentarios
            </h3>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
              {loading ? (
                <div style={{ opacity: 0.5 }}>Cargando comentarios...</div>
              ) : comments.length === 0 ? (
                <div style={{ opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>No hay comentarios aún para este SKU.</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ background: 'var(--panel-bg)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={14} /> {c.user_name}
                      </span>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {c.comment}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleAddComment} style={{ marginTop: '1rem', position: 'relative' }}>
              <textarea 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Escribe un nuevo comentario..."
                required
                style={{ 
                  width: '100%', padding: '0.75rem', paddingRight: '3rem', 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', 
                  borderRadius: '6px', color: 'white', resize: 'none', height: '80px',
                  fontFamily: 'inherit'
                }}
              />
              <button 
                type="submit"
                disabled={!newComment.trim()}
                style={{
                  position: 'absolute', right: '0.5rem', bottom: '1rem',
                  background: 'var(--primary)', color: 'white', border: 'none',
                  width: '32px', height: '32px', borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                  opacity: newComment.trim() ? 1 : 0.5
                }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
