"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Clock, User, PackageOpen, Pencil, Check, Paperclip, FileSpreadsheet, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';
import { NegotiationRecord } from './NegotiationsPanel';

interface CommentHistory {
  id: string;
  user_name: string;
  comment: string;
  created_at: string;
  file_url?: string;
  file_name?: string;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
  };

  const isExcel = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['xlsx', 'xls', 'csv'].includes(ext || '');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

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
    if ((!newComment.trim() && !selectedFile) || !profile) return;

    setUploading(true);
    let fileUrl = null;
    let fileName = null;

    try {
      if (selectedFile) {
        const cleanFileName = selectedFile.name.replace(/[^\w\s.-]/gi, '').replace(/\s+/g, '_');
        const filePath = `negociaciones/${record.id}/${Date.now()}_${cleanFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = selectedFile.name;
      }

      const commentText = newComment.trim() || `Adjuntó un archivo: ${fileName}`;

      const { error } = await supabase.from('comments_history').insert({
        reference_id: record.id,
        reference_type: 'negociacion',
        user_id: profile.id,
        user_name: profile.full_name,
        comment: commentText,
        company_id: companyId,
        file_url: fileUrl,
        file_name: fileName
      });

      if (!error) {
        // Notify the buyer if the commenter is not the buyer
        if (profile.full_name !== record.buyer) {
          await supabase.from('notifications').insert({
            target_buyer_name: record.buyer,
            message: `Nuevo comentario en tu partida ${record.sku}: "${commentText.substring(0, 30)}..."`,
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
            message: `${profile.full_name} respondió en la partida ${record.sku}: "${commentText.substring(0, 30)}..."`,
            reference_id: record.id,
            reference_type: 'negociacion',
            company_id: companyId
          });
        }

        setNewComment('');
        setSelectedFile(null);
        fetchComments();
      } else {
        throw error;
      }
    } catch (err: any) {
      console.error(err);
      alert('Error agregando comentario: ' + (err.message || err));
    } finally {
      setUploading(false);
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
                      <div>
                        <div style={{ fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {c.comment}
                        </div>
                        {c.file_url && (
                          <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                            {isImage(c.file_name || '') ? (
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <a href={c.file_url} target="_blank" rel="noopener noreferrer" title="Ver imagen a tamaño completo">
                                  <img 
                                    src={c.file_url} 
                                    alt={c.file_name} 
                                    style={{ 
                                      maxWidth: '100%', 
                                      maxHeight: '180px', 
                                      borderRadius: '6px', 
                                      border: '1px solid var(--panel-border)',
                                      cursor: 'pointer',
                                      transition: 'transform 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                  />
                                </a>
                                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <ImageIcon size={12} /> {c.file_name}
                                </div>
                              </div>
                            ) : (
                              <a 
                                href={c.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  background: isExcel(c.file_name || '') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
                                  border: `1px solid ${isExcel(c.file_name || '') ? 'rgba(34, 197, 94, 0.3)' : 'var(--panel-border)'}`,
                                  padding: '0.6rem 1rem',
                                  borderRadius: '6px',
                                  textDecoration: 'none',
                                  color: 'white',
                                  fontSize: '0.85rem',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = isExcel(c.file_name || '') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = isExcel(c.file_name || '') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)'}
                              >
                                {isExcel(c.file_name || '') ? (
                                  <FileSpreadsheet size={20} style={{ color: '#22c55e' }} />
                                ) : (
                                  <FileText size={20} style={{ color: 'var(--primary)' }} />
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 500, textDecoration: 'underline' }}>{c.file_name}</span>
                                  <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Haga clic para descargar evidencia</span>
                                </div>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Comment Input */}
          <form onSubmit={handleAddComment} style={{ marginTop: '1rem' }}>
            {selectedFile && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--panel-border)',
                borderBottom: 'none',
                padding: '0.5rem 0.75rem',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                  {isExcel(selectedFile.name) ? (
                    <FileSpreadsheet size={16} style={{ color: '#22c55e' }} />
                  ) : isImage(selectedFile.name) ? (
                    <ImageIcon size={16} />
                  ) : (
                    <FileText size={16} />
                  )}
                  <span style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {selectedFile.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <textarea 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder={selectedFile ? "Añadir una descripción al archivo (opcional)..." : "Agregar observación o evidencia..."}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  paddingRight: '6rem', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--panel-border)', 
                  borderTopLeftRadius: selectedFile ? '0' : '6px',
                  borderTopRightRadius: selectedFile ? '0' : '6px',
                  borderBottomLeftRadius: '6px',
                  borderBottomRightRadius: '6px',
                  color: 'white', 
                  resize: 'none', 
                  height: '80px',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
              
              <div style={{
                position: 'absolute',
                right: '0.75rem',
                bottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <button 
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: selectedFile ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: selectedFile ? '#22c55e' : 'var(--foreground)',
                    border: `1px solid ${selectedFile ? 'rgba(34, 197, 94, 0.4)' : 'var(--panel-border)'}`,
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Adjuntar evidencia (Excel, Imagen, Captura)"
                >
                  <Paperclip size={16} />
                </button>

                <button 
                  type="submit"
                  disabled={(!newComment.trim() && !selectedFile) || uploading}
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (newComment.trim() || selectedFile) && !uploading ? 'pointer' : 'not-allowed',
                    opacity: (newComment.trim() || selectedFile) && !uploading ? 1 : 0.5,
                    transition: 'all 0.2s'
                  }}
                >
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
