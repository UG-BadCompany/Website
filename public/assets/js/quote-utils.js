window.TAQuotes={
  blankLine(type='labor'){return{description:'',quantity:1,unit:type==='labor'?'hours':'each',unitCostCents:0,markupPct:0,totalCents:0,type}},
  confidenceLabel(v){v=Number(v||0);if(v<=1)v*=100;return v>=88?'Very High':v>=74?'High':v>=55?'Medium':'Low'},
  confidencePercent(v){v=Number(v||0);if(v<=1)v*=100;return Math.round(Math.max(0,Math.min(100,v)))},
  lineTotalCents(line={}){const quantity=Number(line.quantity??line.hours??1)||0;const unitCostCents=Number(line.unitCostCents??line.rateCents??0)||0;const markupPct=Number(line.markupPct??0)||0;return Math.round(quantity*unitCostCents*(1+(markupPct/100)))},
  normalizeLine(line={},type='labor'){const normalized={description:line.description||line.name||line.label||line.phase||'',quantity:Number(line.quantity??line.hours??line.lowHours??1)||1,unit:line.unit||(type==='labor'?'hours':'each'),unitCostCents:Number(line.unitCostCents??line.rateCents??line.estimatedBuyCostCents??0)||0,markupPct:Number(line.markupPct??line.markup??0)||0,notes:line.notes||''};return{...normalized,totalCents:Number(line.totalCents??line.totalCostCents)||this.lineTotalCents(normalized),type}},
  pricingTotals({laborLineItems=[],materialLineItems=[],other={}}={}){const laborTotal=laborLineItems.reduce((sum,line)=>sum+this.lineTotalCents(line),0);const materialTotal=materialLineItems.reduce((sum,line)=>sum+this.lineTotalCents(line),0);const otherTotal=['tripChargeCents','permitCents','disposalCents','rentalCents','markupCents'].reduce((sum,key)=>sum+(Number(other[key])||0),0);const subtotal=laborTotal+materialTotal+otherTotal;const taxCents=Number(other.taxCents)||0;const discountCents=Number(other.discountCents)||0;return{laborTotal,materialTotal,otherTotal,subtotal,taxCents,discountCents,grandTotal:subtotal+taxCents-discountCents}},
  normalizeAiDraft(draft={}){
    const structured=draft.structuredEstimate||draft.aiStructuredQuote||draft.result||draft.aiMetadata?.aiStructuredQuote||draft;
    return {
      ...draft,
      structuredEstimate:structured,
      customerName:draft.customerName||draft.clientName||structured.customer_summary||'',
      customerEmail:draft.customerEmail||draft.clientEmail||'',
      propertySummary:draft.propertySummary||structured.property_summary||'',
      description:draft.description||structured.customer_summary||structured.scope_of_work||draft.summary||'',
      serviceType:draft.serviceType||structured.service_category||structured.trade||'',
      scopeOfWork:structured.scopeOfWork||structured.scope_of_work||draft.scopeOfWork||draft.summary||'',
      laborLineItems:(structured.laborLineItems||structured.labor_line_items||draft.laborLineItems||draft.laborPhases||[]).map((line)=>this.normalizeLine(line,'labor')),
      materialLineItems:(structured.materialLineItems||structured.material_line_items||draft.materialLineItems||draft.materials||draft.materialBreakdown||[]).map((line)=>this.normalizeLine(line,'material')),
      pricingSummary:structured.pricing_summary||draft.pricingSummary||{},
      confidenceScores:structured.confidenceScores||structured.confidence_scores||draft.confidenceScores||{},
      recommendedQuestions:structured.recommended_questions||draft.recommendedQuestions||draft.missingInfoQuestions||[],
      confidenceReasons:structured.confidence_reasons||draft.confidenceReasons||[],
      recommendedAction:structured.recommended_action||draft.recommendedAction||'',
      status:draft.status||'draft'
    };
  }
};
