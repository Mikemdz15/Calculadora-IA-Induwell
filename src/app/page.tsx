import React from 'react';
import { fetchSupplyChainData } from '@/lib/dataFetcher';
import DashboardContainer from '@/components/DashboardContainer';
import { cookies } from 'next/headers';
import { COMPANIES } from '@/config/companies';

export default async function Home() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("selectedCompanyId")?.value;
  const selectedCompany = COMPANIES.find(c => c.id === companyId) || null;

  let data: any[] = [];
  if (selectedCompany) {
    data = await fetchSupplyChainData(selectedCompany.gid);
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
          {selectedCompany ? selectedCompany.name : 'S&OP Control Panel'}
        </h1>
        <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>
          Análisis Clínico de Abastecimiento - Vista de Analista Experto
        </p>
      </div>

      <DashboardContainer data={data} />
    </div>
  );
}
