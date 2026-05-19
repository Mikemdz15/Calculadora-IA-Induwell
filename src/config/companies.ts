import { supabase } from '@/lib/supabase';

export interface CompanyConfig {
  id: string;
  name: string;
  gid: string;
}

export async function getCompanies(): Promise<CompanyConfig[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name');
    
  if (error) {
    console.error("Error fetching companies:", error);
    // Fallback in case table doesn't exist yet
    return [
      { id: 'alphalab', name: 'Grupo Alphalab', gid: '0' }
    ];
  }
  
  if (!data || data.length === 0) {
    return [
      { id: 'alphalab', name: 'Grupo Alphalab', gid: '0' }
    ];
  }
  
  return data as CompanyConfig[];
}
