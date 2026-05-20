const p = (v) => { 
  if (!v || v === '-' || v === '$-') return 0; 
  const c = v.replace(/[\$,]/g, '').replace(/\"/g, '').trim(); 
  const n = parseFloat(c); 
  return isNaN(n) ? 0 : n; 
}; 

const rawStr = 'DIETANOLCO,DIETANOLCO,DIETANOLAMIDA DE COCO,AUSTRAL COSMETICA SA DE CV,JOVANY,Anticipo,30,220,8,Kg,$41.08,562.5,"6,448",100,-,-,-,Ok,-,"3,388","6,885.84","4,235","1,000",$-,830,"5,886",-,Ok,-,"3,388","6,056.00","4,235",-,-,570,"5,056",-,Ok,-,"3,388","5,485.84","4,235",-,-,847.01,"4,486",-,Ok,-,"3,388","4,638.83","4,235",-,-,847.01,"3,639",-,Ok,-,"3,388","4,391.82","4,235",600,"24,648.00",847.01,"2,792",-,Ok,-,"3,388","3,545.00","4,235",-,QUÍMICOS,ACTIVO';

// simple CSV parse line:
const r = rawStr.match(/("[^"]*")|[^,]+/g).map(s=>s.startsWith('"')?s.slice(1,-1):s);

console.log('reqN', p(r[11]), 'initInvN', p(r[12]), 'receiptsN', p(r[14]), 'preAuthN', p(r[22])); 
console.log('invWithReceipts', p(r[12]) - p(r[11]) + p(r[14]) + p(r[22]));
console.log('What if receipts is index 13?', p(r[12]) - p(r[11]) + p(r[13]) + p(r[22]));
