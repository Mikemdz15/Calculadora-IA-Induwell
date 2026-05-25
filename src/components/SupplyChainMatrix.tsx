"use client";

import React, { useRef, useEffect, useState, useMemo } from 'react';
import styles from './SupplyChainMatrix.module.css';
import { SupplyChainRow } from '@/lib/supplyChainLogic';
import { ChevronDown, ChevronUp, Database } from 'lucide-react';

interface SupplyChainMatrixProps {
  data: SupplyChainRow[];
}

export default function SupplyChainMatrix({ data }: SupplyChainMatrixProps) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableWidth, setTableWidth] = useState(2500);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync scrollbars
  const handleTopScroll = () => {
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  // Measure table width for top scrollbar
  useEffect(() => {
    if (tableRef.current) {
      setTableWidth(tableRef.current.scrollWidth);
    }
  }, [data]);

  if (data.length === 0) return <div>No hay datos para mostrar en la matriz.</div>;

  const weeks = data[0].projections.map(p => p.weekNumber);

  return (
    <div id="matriz" style={{ marginTop: '3rem' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}
            title={isCollapsed ? "Expandir matriz" : "Comprimir matriz"}
          >
            <Database size={18} color="var(--primary)" />
            Matriz de Abasto (N a N+5) <span style={{fontSize: '0.9rem', opacity: 0.7, fontWeight: 'normal'}}>({data.length} SKUs)</span>
            {isCollapsed ? <ChevronDown size={16} style={{ opacity: 0.6 }} /> : <ChevronUp size={16} style={{ opacity: 0.6 }} />}
          </h3>
        </div>
        
        {!isCollapsed && (
          <div className={styles.wrapper}>
        {/* Top Horizontal Scrollbar */}
        <div className={styles.topScroll} ref={topScrollRef} onScroll={handleTopScroll}>
          <div className={styles.topScrollInner} style={{ width: tableWidth }}></div>
        </div>

        {/* Main Scrolling Container */}
        <div className={styles.matrixContainer} ref={bottomScrollRef} onScroll={handleBottomScroll}>
          <table className={styles.table} ref={tableRef}>
            <thead>
              {/* Header Row 1: Week Groups */}
              <tr>
                <th className={styles.stickyCol} rowSpan={2} style={{ verticalAlign: 'bottom' }}>Info SKU</th>
                {weeks.map((w, idx) => (
                  <th key={w} colSpan={10} className={`${styles.weekGroupHeader} ${styles.thickRightBorder}`}>
                    Semana {idx === 0 ? `N (${w})` : `N+${idx} (${w})`}
                  </th>
                ))}
              </tr>
              {/* Header Row 2: Metrics */}
              <tr>
                {weeks.map((w, idx) => {
                  return (
                    <React.Fragment key={`metrics-${w}`}>
                      <th className={styles.colGray}>Requerido</th>
                      <th className={styles.colYellow}>Inv. Inicial</th>
                      <th className={styles.colGreen}>Recepciones</th>
                      <th className={styles.colRed}>Por Comprar (Urg.)</th>
                      <th>OC x Fincar</th>
                      <th className={styles.colOrange}>Compra Req.</th>
                      <th className={styles.colMustard}>Min Stock</th>
                      <th className={styles.colRoyalBlue}>Inv c/Recepciones</th>
                      <th className={styles.colMustard}>Max Óptimo</th>
                      <th className={`${styles.colPurple} ${styles.thickRightBorder}`}>Compra Pre-Auth</th>
                    </React.Fragment>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.skuInfo.sku}>
                  <td className={styles.stickyCol}>
                    <div style={{ fontWeight: 600 }}>{row.skuInfo.sku}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{row.skuInfo.description.substring(0, 30)}...</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>LT: {row.skuInfo.leadTimeWeeks} sem | MOQ: {row.skuInfo.moq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | {row.skuInfo.buyer}</div>
                  </td>
                  
                  {row.projections.map((p, idx) => {
                    let poStatusClass = styles.textSuccess;
                    if (p.poToPlace === 'BOMBERAZO') poStatusClass = styles.textDanger;
                    if (p.poToPlace === 'FINCAR') poStatusClass = styles.textWarning;
                    
                    // Inventory Status Color Logic
                    let invStatusClass = styles.textWhite; // White if normal
                    if (p.inventoryWithReceipts < row.skuInfo.minSafetyStock) {
                      invStatusClass = styles.textDanger; // Red if below min
                    } else if (p.isCapitalInefficiency) {
                      invStatusClass = styles.textWarning; // Orange if above max
                    }
                    
                    return (
                      <React.Fragment key={`${row.skuInfo.sku}-w${idx}`}>
                        <td className={styles.colGray}>{p.requiredMaterial.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className={styles.colYellow}>{p.initialInventory.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className={styles.colGreen}>{p.receiptsQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className={`${styles.colRed} ${p.toBuyBomberazo > 0 ? styles.textDanger : ''}`}>
                          {p.toBuyBomberazo > 0 ? p.toBuyBomberazo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className={poStatusClass}>{p.poToPlace}</td>
                        <td className={`${styles.colOrange} ${p.requiredPurchase > 0 ? styles.textWarning : ''}`}>
                          {p.requiredPurchase > 0 ? p.requiredPurchase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className={styles.colMustard}>{row.skuInfo.minSafetyStock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className={`${styles.colRoyalBlue} ${invStatusClass}`}>
                          {p.inventoryWithReceipts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={styles.colMustard}>{row.skuInfo.maxOptimalStock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className={`${styles.colPurple} ${styles.thickRightBorder}`}>
                          {p.preAuthPurchaseQty > 0 ? p.preAuthPurchaseQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={61} style={{ textAlign: 'center', padding: '3rem', color: 'var(--foreground)' }}>
                    No hay SKUs que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
      </div>
    </div>
  );
}
