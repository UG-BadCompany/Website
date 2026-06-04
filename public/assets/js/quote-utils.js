window.TAQuotes={
  moneyToCents(value,{assumeCents=false}={}){if(value===null||value===undefined||value==='')return 0;if(typeof value==='number'&&Number.isFinite(value)){if(assumeCents||(Number.isInteger(value)&&Math.abs(value)>=10000))return Math.round(value);return Math.round(value*100)}const raw=String(value).trim().toLowerCase();if(!raw)return 0;const cents=raw.match(/(-?\d[\d,]*)\s*(?:¢|cents?)\b/);if(cents)return Math.round(Number(cents[1].replace(/,/g,''))||0);const match=raw.replace(/usd|dollars?|\$/g,'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);if(!match)return 0;const num=Number(match[0]);if(!Number.isFinite(num))return 0;if(assumeCents||(/cents?\b/.test(raw)&&!/dollars?|\$|\./.test(raw)))return Math.round(num);return Math.round(num*100)},
  centsToDollars(cents){return Math.round(Number(cents||0))/100},
  firstMoney(obj={},keys=[],opts={}){for(const key of keys){if(obj[key]!==undefined&&obj[key]!==null&&obj[key]!=='')return this.moneyToCents(obj[key],opts)}return 0},
  firstValue(obj={},keys=[],fallback=''){for(const key of keys){if(obj[key]!==undefined&&obj[key]!==null&&obj[key]!=='')return obj[key]}return fallback},
  blankLine(type='labor'){return{description:'',quantity:1,unit:type==='labor'?'hours':'each',unitCostCents:0,markupPct:0,totalCents:0,type}},
  confidenceLabel(v){v=Number(v||0);if(v<=1)v*=100;return v>=88?'Very High':v>=74?'High':v>=55?'Medium':'Low'},
  confidencePercent(v){v=Number(v||0);if(v<=1)v*=100;return Math.round(Math.max(0,Math.min(100,v)))},
  lineTotalCents(line={}){const quantity=Number(line.quantity??line.hours??1)||0;const unitCostCents=Number(line.unitCostCents??line.rateCents??0)||0;const markupPct=Number(line.markupPct??0)||0;return Math.round(quantity*unitCostCents*(1+(markupPct/100)))},
  normalizeLine(line={},type='labor'){
    const quantity=Number(this.firstValue(line,type==='labor'?['hours','quantity','lowHours','highHours','low_hours','hours_low']:['quantity','qty'],1))||1;
    const unitCostCents= type==='labor'
      ? (this.firstMoney(line,['rate','hourly_rate','labor_rate','unit_cost','unitCost'])||this.firstMoney(line,['rate_cents','rateCents','unit_cost_cents','unitCostCents'],{assumeCents:true}))
      : (this.firstMoney(line,['unit_cost','unitCost','unit_price','unitPrice','price','estimated_price'])||this.firstMoney(line,['estimatedBuyCostCents','unit_cost_cents','unitCostCents'],{assumeCents:true}));
    const markupPct=Number(this.firstValue(line,['markup_percent','markupPct','markup'],0))||0;
    const normalized={
      name:this.firstValue(line,type==='labor'?['name','description','label','phase']:['name','material','description','label'],''),
      description:this.firstValue(line,type==='labor'?['description','name','label','phase']:['description','name','material','label'],type==='labor'?'Labor line':'Material line'),
      quantity,
      unit:line.unit||(type==='labor'?'hours':'each'),
      unitCostCents,
      rateCents:type==='labor'?unitCostCents:undefined,
      markupPct,
      notes:line.notes||'',
      source:line.source||line.pricing_source||line.pricingSource||'',
      sourceUrl:line.source_url||line.sourceUrl||line.url||line.link||'',
      confidence:line.confidence||'',
      type
    };
    const totalCents=this.firstMoney(line,['total','total_cost','line_total'])||this.firstMoney(line,['total_cents','totalCents','totalCostCents'],{assumeCents:true})||this.lineTotalCents(normalized);
    return{...normalized,totalCents};
  },
  normalizeOtherPricing(source={}){const cents=(names)=>this.firstMoney(source,names)||this.firstMoney(source,names.map((n)=>`${n}_cents`).concat(names.map((n)=>`${n}Cents`)),{assumeCents:true});return{tripChargeCents:cents(['trip_charge','tripCharge','travel','travel_charge']),permitCents:cents(['permit','permit_fee']),disposalCents:cents(['disposal','disposal_fee']),rentalCents:cents(['rental','rental_fee']),taxCents:cents(['tax','sales_tax']),discountCents:cents(['discount']),markupCents:cents(['markup','additional_markup'])}},
  pricingTotals({laborLineItems=[],materialLineItems=[],other={}}={}){const laborTotal=laborLineItems.reduce((sum,line)=>sum+(Number(line.totalCents)||this.lineTotalCents(line)),0);const materialTotal=materialLineItems.reduce((sum,line)=>sum+(Number(line.totalCents)||this.lineTotalCents(line)),0);const otherTotal=['tripChargeCents','permitCents','disposalCents','rentalCents','markupCents'].reduce((sum,key)=>sum+(Number(other[key])||0),0);const subtotal=laborTotal+materialTotal+otherTotal;const taxCents=Number(other.taxCents)||0;const discountCents=Number(other.discountCents)||0;return{laborTotal,materialTotal,otherTotal,subtotal,taxCents,discountCents,grandTotal:subtotal+taxCents-discountCents}},
  buildPricingSummary(laborLineItems=[],materialLineItems=[],other={}){const t=this.pricingTotals({laborLineItems,materialLineItems,other});return{labor_total:this.centsToDollars(t.laborTotal),labor_total_cents:t.laborTotal,material_total:this.centsToDollars(t.materialTotal),material_total_cents:t.materialTotal,other_total:this.centsToDollars(t.otherTotal),other_total_cents:t.otherTotal,subtotal:this.centsToDollars(t.subtotal),subtotal_cents:t.subtotal,tax:this.centsToDollars(t.taxCents),tax_cents:t.taxCents,discount:this.centsToDollars(t.discountCents),discount_cents:t.discountCents,grand_total:this.centsToDollars(t.grandTotal),grand_total_cents:t.grandTotal}},
  normalizeAiDraft(draft={}){
    const structured=draft.structuredEstimate||draft.aiStructuredQuote||draft.result||draft.aiMetadata?.aiStructuredQuote||draft.aiMetadata?.aiStructuredEstimate||draft;
    const laborLineItems=(structured.laborLineItems||structured.labor_line_items||draft.laborLineItems||draft.laborPhases||draft.labor_items||[]).map((line)=>this.normalizeLine(line,'labor'));
    const materialLineItems=(structured.materialLineItems||structured.material_line_items||draft.materialLineItems||draft.materials||draft.materialBreakdown||draft.material_breakdown||[]).map((line)=>this.normalizeLine(line,'material'));
    const other=this.normalizeOtherPricing(structured.other_pricing||structured.otherPricing||structured.pricing_engine||structured.pricingEngine||draft.quoteEditor||{});
    const pricingSummary=structured.pricing_summary||structured.pricingSummary||draft.pricingSummary||this.buildPricingSummary(laborLineItems,materialLineItems,other);
    return {...draft,structuredEstimate:structured,customerName:draft.customerName||draft.clientName||structured.customer_name||structured.customer_summary||'',customerEmail:draft.customerEmail||draft.clientEmail||structured.customer_email||'',customerPhone:draft.customerPhone||draft.clientPhone||structured.customer_phone||'',propertySummary:draft.propertySummary||structured.property_summary||'',description:draft.description||structured.description||structured.customer_summary||structured.scope_of_work||draft.summary||'',serviceType:draft.serviceType||structured.service_category||structured.trade||'',trade:structured.trade||draft.trade||'',scopeOfWork:structured.scopeOfWork||structured.scope_of_work||draft.scopeOfWork||draft.summary||'',laborLineItems,materialLineItems,otherPricing:other,pricingSummary,assumptions:structured.assumptions||draft.assumptions||[],exclusions:structured.exclusions||draft.exclusions||[],customerNotes:structured.customerNotes||structured.customer_notes||draft.customerNotes||'',internalNotes:structured.internalAdminNotes||structured.internal_admin_notes||draft.internalNotes||'',confidenceScores:structured.confidenceScores||structured.confidence_scores||draft.confidenceScores||{},recommendedQuestions:structured.recommended_questions||draft.recommendedQuestions||draft.missingInfoQuestions||[],confidenceReasons:structured.confidence_reasons||draft.confidenceReasons||[],researchMetadata:structured.research_metadata||structured.researchMetadata||draft.researchMetadata||{},pricingWarnings:structured.pricing_warnings||draft.pricingWarnings||[],recommendedAction:structured.recommended_action||draft.recommendedAction||'',status:draft.status||'draft'};
  }
};
