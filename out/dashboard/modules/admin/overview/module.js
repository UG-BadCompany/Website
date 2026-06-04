window.TAModules.register({
  id:'admin.overview', role:'admin', title:'Overview', icon:'🏠', permissions:[],
  async mount(ctx) {
    const routeAction = (action, { router }) => {
      const routes = {
        'New Quote': 'admin.estimate-management-center',
        'Review Estimates': 'admin.estimate-management-center',
        'New Work Order': 'admin.work-orders',
        'Inventory Alerts': 'admin.inventory',
        'Schedule Maintenance': 'admin.schedule',
        'Open AI Assistant': 'admin.ai-knowledge',
      };
      const target = routes[action] || routes[action?.label] || 'admin.overview';
      router?.go?.(target);
      window.TAUi?.toast?.(`${action} opened.`, 'success');
    };
    return TAModuleKit.mount(ctx, {
      title:'Executive Command Center', icon:'🏠',
      description:'Premium operating dashboard for revenue, quotes, work orders, maintenance plans, inventory alerts, technician activity, AI activity, recent updates, and upcoming schedules.',
      endpoints:['/api/admin/executive-overview','/api/admin/job-requests','/api/admin/quotes','/api/admin/invoices','/api/admin/inventory','/api/admin/work-orders'],
      recordPaths:['activity','requests','quotes','workOrders.items','invoices','items'],
      metrics:[
        {label:'Revenue',icon:'💵',path:'revenue.monthCents',format:'money'},
        {label:'Quotes',icon:'💰',path:'quotes.length'},
        {label:'Work Orders',icon:'🔧',path:'workOrders.activeCount'},
        {label:'Open Jobs',icon:'📍',path:'schedule.scheduledCount'},
        {label:'Maintenance Plans',icon:'🛡️',path:'maintenancePlans.activeCount'},
        {label:'Inventory Alerts',icon:'📦',path:'lowStockCount'},
        {label:'Technician Activity',icon:'👷',path:'technicianActivity.activeCount'},
        {label:'AI Activity',icon:'🤖',path:'aiConfidenceAlerts'},
        {label:'Recent Activity',icon:'📋',path:'activity.length'},
        {label:'Upcoming Schedule',icon:'📅',path:'schedule.upcomingCount'},
        {label:'Quote Conversion',icon:'🎯',path:'conversion.quoteAcceptanceRate',format:'percent'},
        {label:'Information Needed',icon:'❓',status:'information_needed'},
      ],
      actions:['Review Estimates','New Work Order','Inventory Alerts','Schedule Maintenance','Open AI Assistant'],
      onAction: routeAction,
      mainTitle:'Recent Activity & Upcoming Schedule',
      mainDescription:'Scan customer requests, AI quote drafts, work orders, invoices, materials, technician updates, and schedule events without losing context.',
      secondary:[
        {icon:'📈',title:'Revenue visibility',text:'Month revenue, open invoices, conversion, and quote velocity stay visible at the top of the dashboard.'},
        {icon:'🤖',title:'AI operations',text:'AI activity and confidence alerts surface drafts that need review before they become customer-facing quotes.'},
        {icon:'👷',title:'Technician activity',text:'Field progress, job status, material needs, and upcoming schedule stay connected to work orders.'},
        {icon:'📱',title:'Mobile-first workspace',text:'Cards, actions, tables, and bottom navigation use accessible touch targets and responsive layouts.'},
      ],
    });
  }, async destroy(){}, async refresh(){}
});
