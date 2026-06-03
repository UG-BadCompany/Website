window.TAModules.register({
  id:'admin.quotes', role:'admin', title:'Estimate Review Center', icon:'💰', permissions:['quotes.manage'],
  async mount(ctx) {
    const quoteSections = ['Customer information','Request summary','Uploaded files/photos','Scope of work','Labor line items','Material line items','Pricing','Tax / markup / discounts','Assumptions','Exclusions','Warranty/notes','Customer-facing notes','Internal admin notes','AI confidence','AI recommendations'];
    return TAModuleKit.mount(ctx, {
      title:'Estimate Review Center', icon:'💰',
      description:'Review submitted requests, generate AI/manual drafts, edit quotes, send estimates, request information, and convert accepted work into jobs.',
      endpoints:['/api/admin/quotes','/api/admin/job-requests'],
      recordPaths:['quotes','requests'],
      tabs:[{label:'Needs Review',key:'needs_review'},{label:'Information Needed',key:'information_needed'},{label:'Drafts',key:'draft'},{label:'Sent',key:'sent'},{label:'Accepted',key:'accepted'},{label:'Declined',key:'declined'},{label:'All',key:'all'}],
      metrics:[{label:'Needs Review',icon:'🧭',status:'needs_review'},{label:'Information Needed',icon:'❓',status:'information_needed'},{label:'Drafts',icon:'📝',status:'draft'},{label:'Sent',icon:'📬',status:'sent'},{label:'Accepted',icon:'✅',status:'accepted'}],
      actions:['Generate AI Draft','Create Manual Draft','Request Information','Open AI Assistant'],
      recordActions:['View Request','Generate AI Draft','Create Manual Draft','Review/Edit','Save Draft','Send to Client','Request Information','Recalculate AI','Convert to Work Order','Schedule Job'],
      detailSections: quoteSections,
      emptyTitle:'No estimate records in this queue',
      emptyText:'Submitted requests and draft quotes will appear here. Admins can still create a manual draft if AI is unavailable.',
      onAction(action, context) {
        TAModuleKit.openDetail(context.root, { ...context.config, detailSections: quoteSections }, context.records[0] || { title: action, status:'draft', summary:'Manual admin override is always available even when AI is unavailable.' });
      },
      secondary:[
        {icon:'🤖',title:'AI never blocks admin',text:'Generate or recalculate AI drafts when available; manual quote creation and editing stay available at all times.'},
        {icon:'✍️',title:'Full quote editor',text:'Customer info, request summary, scope, labor, materials, pricing, tax, markup, assumptions, exclusions, notes, confidence, and recommendations are editable.'}
      ]
    });
  },
  async destroy(){}, async refresh(){}
});
