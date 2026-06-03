window.TAQuotes={
  blankLine(){return{description:'',quantity:1,unitCost:0,type:'labor'}},
  confidenceLabel(v){v=Number(v||0);if(v<=1)v*=100;return v>=80?'High':v>=55?'Medium':'Low'},
  confidencePercent(v){v=Number(v||0);if(v<=1)v*=100;return Math.round(v)},
  normalizeAiDraft(draft={}){
    const structured=draft.structuredEstimate||draft.aiStructuredQuote||draft.result||draft;
    return {
      ...draft,
      structuredEstimate:structured,
      customerName:draft.customerName||structured.customer_summary||'',
      propertySummary:draft.propertySummary||structured.property_summary||'',
      description:draft.description||structured.customer_summary||structured.scope_of_work||'',
      serviceType:draft.serviceType||structured.service_category||structured.trade||'',
      scopeOfWork:structured.scope_of_work||draft.scopeOfWork||draft.summary||'',
      laborLineItems:structured.labor_line_items||draft.laborLineItems||draft.laborPhases||[],
      materialLineItems:structured.material_line_items||draft.materialLineItems||draft.materials||draft.materialBreakdown||[],
      pricingSummary:structured.pricing_summary||draft.pricingSummary||{},
      confidenceScores:structured.confidence_scores||draft.confidenceScores||{},
      recommendedQuestions:structured.recommended_questions||draft.recommendedQuestions||draft.missingInfoQuestions||[],
      confidenceReasons:structured.confidence_reasons||draft.confidenceReasons||[],
      recommendedAction:structured.recommended_action||draft.recommendedAction||'',
      status:draft.status||'draft'
    };
  }
};
