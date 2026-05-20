import { NextResponse } from 'next/server';
import { fetchSupplyChainData } from '@/lib/dataFetcher';

export async function GET() {
  const data = await fetchSupplyChainData('0');
  const d = data.find(r => r.skuInfo.sku === 'DIETANOLCO');
  return NextResponse.json(d || { error: 'Not found' });
}
