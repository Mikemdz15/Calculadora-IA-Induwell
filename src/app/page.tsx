import React from 'react';
import { fetchSupplyChainData } from '@/lib/dataFetcher';
import DashboardContainer from '@/components/DashboardContainer';

export default async function Home() {
  const data = await fetchSupplyChainData();

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>S&OP Control Panel</h1>
        <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>
          Análisis Clínico de Abastecimiento - Vista de Analista Experto
        </p>
      </div>

      <DashboardContainer data={data} />
    </div>
  );
}
