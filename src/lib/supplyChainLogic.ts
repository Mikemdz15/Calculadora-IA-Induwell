import { getISOWeek } from 'date-fns';

export interface SKUData {
  sku: string;
  description: string;
  supplier: string;
  buyer: string;
  paymentTerms: string;
  paymentDays: number;
  moq: number;
  leadTimeWeeks: number;
  uom: string;
  unitPrice: number;
  minSafetyStock: number;
  maxOptimalStock: number;
  category: string;
  status: string;
}

export interface WeekData {
  weekNumber: number;
  requiredMaterial: number;
  initialInventory: number;
  wip: number;
  receiptsQty: number;
  receiptsAmount: number;
  toBuyBomberazo: number;
  poToPlace: 'OK' | 'FINCAR' | 'BOMBERAZO';
  requiredPurchase: number;
  inventoryWithReceipts: number;
  preAuthPurchaseQty: number;
  preAuthPurchaseAmount: number;
  // Analytical Flags
  isCriticalRisk: boolean;
  isCapitalInefficiency: boolean;
}

export interface GlobalRiskAssessment {
  isCriticalRisk: boolean;
  minDeficitWeekIdx: number | null;
  minDeficitQty: number | null;
  stockoutWeekIdx: number | null;
  stockoutQty: number | null;
  reliefWeekIdx: number | null;
  reliefQty: number | null;
  reliefInventoryProjected: number | null;
  actionPlan: string;
}

export interface SupplyChainRow {
  skuInfo: SKUData;
  projections: WeekData[]; // length 6 for N to N+5
  riskAssessment: GlobalRiskAssessment;
}

/**
 * Gets the current ISO week number (Week N)
 */
export function getCurrentWeek(): number {
  return getISOWeek(new Date());
}

/**
 * Core S&OP Logic Engine
 */
export function calculateProjections(
  skuInfo: SKUData,
  initialInventoryN: number,
  weeklyRequirements: number[], // array of 6 elements (N to N+5)
  receiptsN: number,
  preAuthPurchases: number[], // array of 6 elements
  currentWeekNumber: number
): SupplyChainRow {
  
  const projections: WeekData[] = [];
  let rollingInventory = initialInventoryN;

  for (let i = 0; i < 6; i++) {
    const req = weeklyRequirements[i] || 0;
    const receipts = i === 0 ? receiptsN : 0; // Usually only given for N
    const preAuth = preAuthPurchases[i] || 0;

    // 1. Inventario teorico con recepciones
    // Saldo Inicial - Requerido + Recepciones + Compras Pre Auth (if any actually arrive, usually they are in transit)
    // For safety, the formula used: Inv Inicial - Req + Recepciones
    const invWithReceipts = rollingInventory - req + receipts + preAuth;

    // 2. Bomberazo (Urgencia)
    // Si Inv Inicial + Recepciones no alcanza para cubrir el requerimiento de la semana N
    let toBuyBomberazo = 0;
    if (i === 0 && (rollingInventory + receipts) < req) {
      toBuyBomberazo = req - (rollingInventory + receipts);
    }

    // 3. Compra Requerida para llegar al Mínimo Óptimo (Safety Stock)
    let requiredPurchase = 0;
    if (invWithReceipts < skuInfo.minSafetyStock) {
      requiredPurchase = skuInfo.minSafetyStock - invWithReceipts;
    }

    // 4. Status OC x Fincar
    let poToPlace: 'OK' | 'FINCAR' | 'BOMBERAZO' = 'OK';
    if (toBuyBomberazo > 0) {
      poToPlace = 'BOMBERAZO';
    } else if (requiredPurchase > 0) {
      poToPlace = 'FINCAR';
    }

    // 5. Analytical Rules
    // Rule 1: Riesgo Crítico si Lead Time > Semanas de Cobertura
    const weeksOfCoverage = invWithReceipts / (req > 0 ? req : 1); // rough proxy
    const isCriticalRisk = skuInfo.leadTimeWeeks > weeksOfCoverage && invWithReceipts < skuInfo.minSafetyStock;

    // Rule 2: Capital Atrapado (Ineficiencia)
    const isCapitalInefficiency = invWithReceipts > skuInfo.maxOptimalStock;

    projections.push({
      weekNumber: currentWeekNumber + i,
      requiredMaterial: req,
      initialInventory: rollingInventory,
      wip: 0,
      receiptsQty: receipts,
      receiptsAmount: receipts * skuInfo.unitPrice,
      toBuyBomberazo,
      poToPlace,
      requiredPurchase,
      inventoryWithReceipts: invWithReceipts,
      preAuthPurchaseQty: preAuth,
      preAuthPurchaseAmount: preAuth * skuInfo.unitPrice,
      isCriticalRisk,
      isCapitalInefficiency
    });

    // Update rolling inventory for the next week's initial inventory
    // Next week's initial inventory is this week's end inventory (without the imaginary purchase, just what actually came in)
    rollingInventory = invWithReceipts;
  }

  // 6. Global Risk Assessment (Cross 6-Week Horizon)
  let isCriticalGlobal = false;
  let minDeficitWeekIdx: number | null = null;
  let minDeficitQty: number | null = null;
  let stockoutWeekIdx: number | null = null;
  let stockoutQty: number | null = null;

  for (let w = 0; w < 6; w++) {
    const p = projections[w];
    
    // Check for Min Safety Stock deficit
    if (p.inventoryWithReceipts < skuInfo.minSafetyStock && minDeficitWeekIdx === null) {
      minDeficitWeekIdx = w;
      minDeficitQty = skuInfo.minSafetyStock - p.inventoryWithReceipts;
      
      const weeksRemaining = w; 
      if (skuInfo.leadTimeWeeks > weeksRemaining) {
        isCriticalGlobal = true;
      }
    }

    // Check for actual Stockout (Inventory < 0)
    if (p.inventoryWithReceipts < 0 && stockoutWeekIdx === null) {
      stockoutWeekIdx = w;
      stockoutQty = Math.abs(p.inventoryWithReceipts);
    }
  }

  // Look for relief
  let reliefWeekIdx: number | null = null;
  let reliefQty: number | null = null;
  let reliefInventoryProjected: number | null = null;

  if (isCriticalGlobal && minDeficitWeekIdx !== null) {
    for (let w = minDeficitWeekIdx + 1; w < 6; w++) {
      if (projections[w].preAuthPurchaseQty > 0) {
        reliefWeekIdx = w;
        reliefQty = projections[w].preAuthPurchaseQty;
        reliefInventoryProjected = projections[w].inventoryWithReceipts;
        break;
      }
    }
  }

  // Action Plan
  let actionPlan = "Monitorear";
  if (isCriticalGlobal) {
    if (reliefWeekIdx === null || (reliefInventoryProjected !== null && reliefInventoryProjected < skuInfo.minSafetyStock)) {
      // Calculate how much we need to buy to reach maxOptimalStock when it arrives
      const arrivalWeek = Math.min(skuInfo.leadTimeWeeks, 5);
      const projectedInvAtArrival = projections[arrivalWeek].inventoryWithReceipts;
      let targetBuy = skuInfo.maxOptimalStock - projectedInvAtArrival;
      
      if (targetBuy > 0) {
        if (skuInfo.moq > 0) {
          targetBuy = Math.ceil(targetBuy / skuInfo.moq) * skuInfo.moq;
        }
        if (reliefWeekIdx !== null) {
          actionPlan = `Aumentar Tránsito: Fincar +${targetBuy.toLocaleString()} extra`;
        } else {
          actionPlan = `Fincar Inmediato: ${targetBuy.toLocaleString()} uds`;
        }
      } else {
         actionPlan = "Revisar Máximos vs Consumo";
      }
    } else {
      actionPlan = "Cubierto por Tránsito";
    }
  }

  return {
    skuInfo,
    projections,
    riskAssessment: {
      isCriticalRisk: isCriticalGlobal,
      minDeficitWeekIdx,
      minDeficitQty,
      stockoutWeekIdx,
      stockoutQty,
      reliefWeekIdx,
      reliefQty,
      reliefInventoryProjected,
      actionPlan
    }
  };
}

/**
 * Computes Dashboard KPIs based on all SKU projections
 */
export function calculateKPIs(data: SupplyChainRow[]) {
  const totalSkus = data.length;
  let skusAtRisk = 0;
  let bomberazosCount = 0;
  let capitalTrapped = 0;
  
  const buyerStats: Record<string, { total: number; atRisk: number; bomberazos: number }> = {};

  data.forEach(row => {
    const buyer = row.skuInfo.buyer;
    if (!buyerStats[buyer]) buyerStats[buyer] = { total: 0, atRisk: 0, bomberazos: 0 };
    buyerStats[buyer].total += 1;

    // Check risk using global assessment
    if (row.riskAssessment.isCriticalRisk) {
      skusAtRisk++;
      buyerStats[buyer].atRisk += 1;
    }

    // Check Week N for bomberazos
    if (row.projections[0].toBuyBomberazo > 0) {
      bomberazosCount++;
      buyerStats[buyer].bomberazos += 1;
    }

    // Calculate Trapped Capital (Over-stock > Max Optimal) in Week N
    const wN = row.projections[0];
    if (wN.isCapitalInefficiency) {
      capitalTrapped += (wN.inventoryWithReceipts - row.skuInfo.maxOptimalStock) * row.skuInfo.unitPrice;
    }
  });

  return {
    totalSkus,
    skusAtRisk,
    riskPercentage: totalSkus > 0 ? (skusAtRisk / totalSkus) * 100 : 0,
    bomberazosCount,
    capitalTrapped,
    buyerStats
  };
}
