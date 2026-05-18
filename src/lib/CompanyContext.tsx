"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CompanyConfig } from '@/config/companies';

interface CompanyContextType {
  selectedCompany: CompanyConfig | null;
  setSelectedCompany: (company: CompanyConfig | null) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<CompanyConfig | null>(null);

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
