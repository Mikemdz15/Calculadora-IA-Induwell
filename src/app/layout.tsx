import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";
import { LayoutDashboard, Table, AlertTriangle, Settings, Box, PackageOpen } from "lucide-react";
import { fetchSupplyChainData } from "@/lib/dataFetcher";
import { calculateKPIs } from "@/lib/supplyChainLogic";
import { cookies } from "next/headers";
import { COMPANIES } from "@/config/companies";

const inter = Inter({ subsets: ["latin"] });

import Sidebar from '@/components/Sidebar';
import { AuthProvider } from '@/lib/authContext';
import AuthWrapper from '@/components/AuthWrapper';
export const metadata: Metadata = {
  title: "Calculadora IA - S&OP",
  description: "Control de Compras y S&OP impulsado por IA",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("selectedCompanyId")?.value;
  const selectedCompany = COMPANIES.find(c => c.id === companyId) || null;

  let kpis = { buyerStats: {} };
  if (selectedCompany) {
    // Fetch data to calculate global Buyer Risk Matrix for the sidebar
    const data = await fetchSupplyChainData(selectedCompany.gid);
    // Filter out non-applicable categories for global stats
    const validData = data.filter(d => {
      const cat = d.skuInfo.category.toUpperCase().trim();
      return cat !== 'INDIRECTOS' && cat !== '' && cat !== 'SIN CATEGORÍA';
    });
    kpis = calculateKPIs(validData);
  }

  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <div className={styles.container}>
            <AuthWrapper 
              sidebar={<Sidebar buyerStats={kpis.buyerStats} />} 
              headerTitle="Vista General"
              selectedCompany={selectedCompany}
            >
              {children}
            </AuthWrapper>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
