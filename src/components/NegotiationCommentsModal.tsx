"use client";

import React, { useState, useEffect } from 'react';
import { X, Send, Clock, User, PackageOpen, Pencil, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';
import { NegotiationRecord } from './NegotiationsPanel';

interface CommentHistory {
  id: string;
  user_name: string;
  comment: string;
  created_at: string;
}

interface NegotiationCommentsModalProps {
  record: NegotiationRecord;
  onClose: () => void;
  companyId: string;
}

export default function NegotiationCommentsModal({ record, onClose, companyId }: NegotiationCommentsModalProps) {
  const { profile } = useAuth();
  const [comments, setComments] = useState<CommentHistory[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      const { error } = await supabase
        .from('comments_history')
        .update({ comment: editingCommentText.trim() })
        .eq('id', commentId);
      
      if (error) throw error;
      setEditingCommentId(null);
      fetchComments();
    } catch (err) {
      console.error(err);
      alert("Error al editar el comentario");
    }
  };

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comments_history')
      .select('*')
      .eq('reference_id', record.id)
      .eq('reference_type', 'negociacion')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (data && !error) {
      setComments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [record.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !profile) return;

    const newCommentStr = newComment.trim();
    const { error } = await supabase.from('comments_history').insert({
      reference_id: record.id,
      reference_type: 'negociacion',
      user_id: profile.id,
      user_name: profile.full_name,
      comment: newCommentStr,
      company_id: companyId
    });

    if (!error) {
      // Notify the buyer if the commenter is not the buyer
      if (profile.full_name !== record.buyer) {
        await supabase.from('notifications').insert({
          target_buyer_name: record.buyer,
          message: `Nuevo comentario en tu partida ${record.sku}: "${newCommentStr.substring(0, 30)}..."`,
          reference_id: record.id,
          reference_type: 'negociacion',
          company_id: companyId
        });
      }

      // Notify other participants in the thread
      const otherCommenters = Array.from(new Set(comments.map(c => c.user_name)))
        .filter(name => name !== profile.full_name && name !== record.buyer);
      
      for (const commenterName of otherCommenters) {
        await supabase.from('notifications').insert({
          target_buyer_name: commenterName,
          message: `${profile.full_name} respondió en la partida ${record.sku}: "${newCommentStr.substring(0, 30)}..."`,
          reference_id: record.id,
          reference_type: 'negociacion',
          company_id: companyId
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
        width: '100%', maxWidth: '600px', maxHeight: '80vh',
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
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PackageOpen size={20} className="text-primary" />
              Bitácora de Negociación: {record.sku}
            </h2>
            <div style={{ color: 'var(--foreground)', opacity: 0.7, fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {record.supplier} | {record.description}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} /> Historial
          </h3>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
            {loading ? (
              <div style={{ opacity: 0.5 }}>Cargando bitácora...</div>
            ) : comments.length === 0 ? (
              <div style={{ opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>No hay comentarios adicionales aún.</div>
            ) : (
              comments.map(c => {
                const isEditing = editingCommentId === c.id;
                const canEdit = profile?.role === 'director';

                return (
                  <div key={c.id} style={{ background: 'var(--panel-bg)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={14} /> {c.user_name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                        {!isEditing && canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(c.id);
                              setEditingCommentText(c.comment);
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                            title="Editar comentario"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          style={{
                            width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)',
                            border: '1px solid var(--panel-border)', borderRadius: '4px',
                            color: 'white', resize: 'vertical', minHeight: '60px',
                            fontFamily: 'inherit', fontSize: '0.9rem'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleSaveCommentEdit(c.id)}
                            style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Check size={14} /> Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            style={{ background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--panel-border)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <X size={14} /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {c.comment}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Comment Input */}
          <form onSubmit={handleAddComment} style={{ marginTop: '1rem', position: 'relative' }}>
            <textarea 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Agregar observación..."
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
  );
}
