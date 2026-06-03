window.TAModules.register({
  id:'admin.quotes', role:'admin', title:'Estimate Review Center', icon:'💰', permissions:['quotes.manage'],
  async mount(ctx) {
    const quoteSections = ['Customer information','Address/property','Request summary','Uploaded files/photos','Scope of work','Labor line items','Material line items','Pricing','Tax / markup / discounts','Assumptions','Exclusions','Warranty/notes','Customer-facing notes','Internal admin notes','AI confidence','AI recommendations','Status'];
    const openManual = (root, config, record = {}) => TAModuleKit.openDetail(root, { ...config, detailSections: quoteSections }, TAQuotes.normalizeAiDraft({ ...record, status:'draft' }));
    const generateAiDraft = async ({ root, api, config, record }) => {
      const target = record || {};
      const jobRequestId = target.jobRequestId || target.job_request_id || target.requestId || target.request_id || target.id;
      if (!jobRequestId) return TAUi.toast('Select a request before generating an AI draft.');
      TAUi.toast('Generating AI draft with internal knowledge and live research context...');
      try {
        const response = await TAAI.draftQuote({
          jobRequestId,
          requestContext: {
            name: target.customerName || target.customer_name || target.requesterName || target.requester_name || '',
            email: target.email || target.requester_email || '',
            streetAddress: target.streetAddress || target.street_address || target.address || '',
            city: target.city || '',
            serviceType: target.serviceType || target.service_type || target.title || '',
            typeOfWork: target.workCategory || target.work_category || '',
            workScope: target.workScope || target.work_scope || '',
            description: target.description || target.summary || '',
            createdAt: target.createdAt || target.created_at || '',
          },
          researchMode:'internal_live',
        });
        const draft = TAQuotes.normalizeAiDraft(response.draft || response.result || response);
        TAModuleKit.openDetail(root, { ...config, detailSections: quoteSections }, draft);
        TAUi.toast('AI draft generated. Review and edit before sending.');
      } catch (error) {
        const manualDraft = TAQuotes.normalizeAiDraft(error.data?.manualDraft || { ...target, status:'draft' });
        TAModuleKit.openDetail(root, { ...config, detailSections: quoteSections }, manualDraft);
        TAUi.toast(error.data?.message || 'AI estimate generation failed. Continue manually?');
      }
    };
    return TAModuleKit.mount(ctx, {
      title:'Estimate Review Center', icon:'💰',
      description:'Review submitted requests, generate AI/manual drafts, edit quotes, send estimates, request information, and convert accepted work into jobs. Status text stays only in the status field.',
      endpoints:['/api/admin/quotes','/api/admin/job-requests'],
      recordPaths:['quotes','requests'],
      tabs:[{label:'Needs Review',key:'needs_review'},{label:'Information Needed',key:'information_needed'},{label:'Drafts',key:'draft'},{label:'Sent',key:'sent'},{label:'Accepted',key:'accepted'},{label:'Declined',key:'declined'},{label:'All',key:'all'}],
      metrics:[{label:'Needs Review',icon:'🧭',status:'needs_review'},{label:'Information Needed',icon:'❓',status:'information_needed'},{label:'Drafts',icon:'📝',status:'draft'},{label:'Sent',icon:'📬',status:'sent'},{label:'Accepted',icon:'✅',status:'accepted'}],
      actions:[{label:'Generate AI Draft',action:'generate-ai-draft',primary:true},'Create Manual Draft','Request Information','Open AI Assistant'],
      recordActions:[{label:'View Request',action:'view-request'},{label:'Generate AI Draft',action:'generate-ai-draft',primary:true},{label:'Create Manual Draft',action:'create-manual-draft'},{label:'Review/Edit',action:'review-edit'},{label:'Request Information',action:'request-info'},{label:'Recalculate AI',action:'generate-ai-draft'}],
      detailSections: quoteSections,
      emptyTitle:'No estimate records in this queue',
      emptyText:'Submitted requests and draft quotes will appear here. Admins can still create a manual draft if AI is unavailable.',
      onAction(action, context) {
        if (action === 'generate-ai-draft') return generateAiDraft({ ...context, record: context.records[0] });
        if (action === 'Create Manual Draft' || action === 'create-manual-draft') return openManual(context.root, context.config, context.records[0] || { title:'Manual draft' });
        TAModuleKit.openDetail(context.root, { ...context.config, detailSections: quoteSections }, context.records[0] || { title: action, status:'draft', summary:'Manual admin override is available when AI is unavailable.' });
      },
      onRecordAction(action, context) {
        if (action === 'generate-ai-draft') return generateAiDraft(context);
        if (action === 'create-manual-draft') return openManual(context.root, context.config, context.record);
        return TAModuleKit.openDetail(context.root, { ...context.config, detailSections: quoteSections }, TAQuotes.normalizeAiDraft(context.record));
      },
      secondary:[
        {icon:'🤖',title:'AI with admin approval',text:'AI can research, recommend, calculate, and draft; admins must review before any customer receives an estimate.'},
        {icon:'🧾',title:'Correct field mapping',text:'Customer, property, scope, labor, materials, pricing, assumptions, exclusions, notes, confidence, and recommended questions map to their own fields.'}
      ]
    });
  },
  async destroy(){}, async refresh(){}
});
