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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const selectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
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
          <div 
            className={styles.option} 
            style={{ borderBottom: '1px solid var(--panel-border)', fontWeight: 600 }}
            onClick={selectAll}
          >
            <div className={`${styles.checkbox} ${selected.length === options.length ? styles.checked : ''}`}>
              {selected.length === options.length && <Check size={12} />}
            </div>
            Seleccionar Todos
          </div>
          {options.map(option => (
            <div 
              key={option} 
              className={styles.option}
              onClick={() => toggleOption(option)}
            >
              <div className={`${styles.checkbox} ${selected.includes(option) ? styles.checked : ''}`}>
                {selected.includes(option) && <Check size={12} />}
              </div>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {option}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
