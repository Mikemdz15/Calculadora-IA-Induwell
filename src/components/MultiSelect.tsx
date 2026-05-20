"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './MultiSelect.module.css';
import { ChevronDown, Check } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  title: string;
}

export default function MultiSelect({ options, selected, onChange, placeholder, title }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: string, forceSolo = false) => {
    if (forceSolo) {
      onChange([option]);
    } else {
      if (selected.includes(option)) {
        onChange(selected.filter(item => item !== option));
      } else {
        onChange([...selected, option]);
      }
    }
  };

  const cleanSearch = searchTerm.replace(/\s+/g, ' ').trim().toLowerCase();
  const filteredOptions = options.filter(o => o.toLowerCase().includes(cleanSearch));

  const selectAll = () => {
    if (cleanSearch) {
      const isAllFilteredSelected = filteredOptions.every(o => selected.includes(o));
      if (isAllFilteredSelected) {
        onChange(selected.filter(o => !filteredOptions.includes(o)));
      } else {
        const newSelected = new Set([...selected, ...filteredOptions]);
        onChange(Array.from(newSelected));
      }
    } else {
      if (selected.length === options.length) {
        onChange([]);
      } else {
        onChange([...options]);
      }
    }
  };


  return (
    <div className={styles.container} ref={containerRef}>
      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '0.25rem', fontWeight: 600 }}>{title}</div>
      <button 
        className={styles.button} 
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {selected.length === 0 ? placeholder : (
            selected.length === options.length ? `Todos (${options.length})` : 
            `${selected.length} seleccionados`
          )}
        </span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {options.length > 10 && (
            <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--panel-border)' }}>
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  borderRadius: '4px',
                  border: '1px solid var(--panel-border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
          <div  
            className={styles.option} 
            style={{ borderBottom: '1px solid var(--panel-border)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            onClick={selectAll}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className={`${styles.checkbox} ${cleanSearch ? (filteredOptions.every(o => selected.includes(o)) ? styles.checked : '') : (selected.length === options.length ? styles.checked : '')}`}>
                {(cleanSearch ? filteredOptions.every(o => selected.includes(o)) : selected.length === options.length) && <Check size={12} />}
              </div>
              <span>{cleanSearch ? "Seleccionar Todos (Filtrados)" : "Seleccionar Todos"}</span>
            </div>
            {selected.length > 0 && (
              <span 
                style={{ color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
              >
                Limpiar
              </span>
            )}
          </div>
          {filteredOptions.map(option => (
            <div 
              key={option} 
              className={styles.option}
              onClick={(e) => toggleOption(option, e.ctrlKey || e.metaKey)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', flex: 1 }}>
                <div className={`${styles.checkbox} ${selected.includes(option) ? styles.checked : ''}`}>
                  {selected.includes(option) && <Check size={12} />}
                </div>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={option}>
                  {option}
                </span>
              </div>
              <button
                type="button"
                className={styles.soloButton}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(option, true);
                }}
              >
                Solo
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
