import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Falta configurar GEMINI_API_KEY en .env.local' }, { status: 500 });
    }

    const body = await req.json();
    const { criticalSkus, skuReviews, weekId } = body;

    // Utilizar el modelo actual activo de Gemini (versión 2.5)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Rol y Objetivo:
Eres el Motor de Inteligencia Estratégica S&OP y Auditor de Cadena de Suministro. Tu función es procesar la "Matriz de Abasto" de 6 semanas (N a N+5) cruzada con el estatus operativo humano ("Comentarios de Compradores"). Debes generar un Diagnóstico de Riesgos profundo, evaluando tanto la matemática de inventarios como la calidad de la gestión del equipo de compras, priorizando la rentabilidad operativa y la continuidad del negocio.

Inputs (Contexto de Datos):
Semana Actual: ${weekId}

Data Matemática y Operativa (JSON):
${JSON.stringify({
  criticalSkus,
  skuReviews
}, null, 2)}

Directrices Clínicas de Análisis:
Triangulación de Riesgo vs. Mitigación: No te limites a repetir que un material está en rojo. Cruza la alerta matemática con el comentario del comprador. Si el sistema marca un quiebre en N+2 por el Lead Time, y el comentario del comprador no ofrece una solución clara (ej. solo dice "revisando con proveedor" en lugar de "lote adelantado por flete aéreo, llega en N+1"), debes clasificar este riesgo como NO MITIGADO Y CRÍTICO.

Auditoría de Responsabilidad (Accountability): Evalúa la calidad de la respuesta humana. Señala a los compradores que tienen SKUs críticos con comentarios vacíos, desactualizados o marcados engañosamente como resueltos (is_resolved: true) cuando los números proyectan un desabasto inminente.

Control de "Bomberazos" y Costos Extra: Detecta compras urgentes en la Semana N. Exige en tu diagnóstico que los comentarios justifiquen el sobrecosto logístico de estas entradas de última hora.

Rentabilidad y Capital Atrapado: Identifica SKUs donde el burn-down proyecta un inventario superior al máximo óptimo. Evalúa si el comprador ha documentado acciones para frenar recepciones y proteger el flujo de efectivo de la compañía.

Estructura de Salida Obligatoria:
Genera tu diagnóstico en formato Markdown estructurado EXACTAMENTE con las siguientes 3 secciones para su fácil lectura:

## 1. Riesgos Críticos No Mitigados (Peligro Inminente de Paro de Línea)
[IMPORTANTE: En esta sección ÚNICAMENTE lista los SKUs cuyo "paro de línea" o "stockout" inminente (stockoutWeekIdx) sea INFERIOR a su tiempo de entrega (leadTimeWeeks), lo que significa que el Lead Time ya está rebasado y es matemáticamente imposible recibir material a tiempo por vías normales. Si el stockoutWeekIdx es MAYOR o IGUAL al leadTimeWeeks, IGNÓRALO por completo en este reporte.

Para que no se vea amontonado, formatea CADA SKU estrictamente de la siguiente manera usando separadores claros:

### ⚠️ SKU: [Código] - [Descripción Corta]
* **Comprador Responsable:** [Nombre]
* **Déficit de Tiempo:** Quiebre proyectado en Semana N+[stockoutWeekIdx], pero el proveedor tarda [leadTimeWeeks] semanas.
* **Comentario Actual:** "[Lo que dice el comprador o 'Sin comentario']"
* **Diagnóstico de Impacto:** [Consecuencia directa del paro]
* **Acción Inmediata Requerida:** [Qué debe hacer compras hoy mismo]

---

## 2. Fugas de Capital (Sobre-Inventario)
[Análisis de materiales superando el máximo óptimo y recomendaciones de aplazamiento de órdenes. Usa viñetas claras (bullet points) para cada SKU.]

## 3. Evaluación de Desempeño Operativo
[Observaciones directas sobre la disciplina de los compradores al actualizar la plataforma y la calidad de sus planes de acción. Usa viñetas claras para facilitar la lectura.]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ diagnosis: text });

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: error.message || 'Error al generar el diagnóstico' }, { status: 500 });
  }
}
