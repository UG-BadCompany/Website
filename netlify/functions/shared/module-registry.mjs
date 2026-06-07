export const modules = [
  {
    "id": "ai-photo-estimate",
    "name": "AI Photo Estimate",
    "description": "Photo-based scope and estimate assistant",
    "status": "beta",
    "version": "1.0.0",
    "category": "AI",
    "hidden": false,
    "permissions": [
      "module:ai-photo-estimate:view",
      "module:ai-photo-estimate:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-ai-photo-estimate",
        "label": "AI Photo Estimate"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "ai-photo-estimate-summary"
    ]
  },
  {
    "id": "ai-quote",
    "name": "AI Quote",
    "description": "Generate quotes from request context",
    "status": "beta",
    "version": "1.0.0",
    "category": "AI",
    "hidden": false,
    "permissions": [
      "module:ai-quote:view",
      "module:ai-quote:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-ai-quote",
        "label": "AI Quote"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "ai-quote-summary"
    ]
  },
  {
    "id": "ai-troubleshooting",
    "name": "AI Troubleshooting",
    "description": "Guided diagnostic assistant",
    "status": "beta",
    "version": "1.0.0",
    "category": "AI",
    "hidden": false,
    "permissions": [
      "module:ai-troubleshooting:view",
      "module:ai-troubleshooting:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-ai-troubleshooting",
        "label": "AI Troubleshooting"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "ai-troubleshooting-summary"
    ]
  },
  {
    "id": "audit-logs",
    "name": "Audit Logs",
    "description": "Security, impersonation, workflow logs",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:audit-logs:view",
      "module:audit-logs:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-audit-logs",
        "label": "Audit Logs"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "audit-logs-summary"
    ]
  },
  {
    "id": "backup-restore",
    "name": "Backup/Restore",
    "description": "Export and restore foundations",
    "status": "experimental",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": true,
    "permissions": [
      "module:backup-restore:view",
      "module:backup-restore:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-backup-restore",
        "label": "Backup/Restore"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "backup-restore-summary"
    ]
  },
  {
    "id": "cache-manager",
    "name": "Cache Manager",
    "description": "Clear generated config and cache",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:cache-manager:view",
      "module:cache-manager:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-cache-manager",
        "label": "Cache Manager"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "cache-manager-summary"
    ]
  },
  {
    "id": "client-portal",
    "name": "Client Portal",
    "description": "Client requests, approvals, files, invoices",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:client-portal:view",
      "module:client-portal:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-client-portal",
        "label": "Client Portal"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "client-portal-summary"
    ]
  },
  {
    "id": "file-manager",
    "name": "File/photo Manager",
    "description": "Files, photos, attachments",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:file-manager:view",
      "module:file-manager:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-file-manager",
        "label": "File/photo Manager"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "file-manager-summary"
    ]
  },
  {
    "id": "finance",
    "name": "Finance",
    "description": "Revenue, expense, payout visibility",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:finance:view",
      "module:finance:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-finance",
        "label": "Finance"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "finance-summary"
    ]
  },
  {
    "id": "homepage-editor",
    "name": "Homepage Editor",
    "description": "Edit public homepage sections and CTAs",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:homepage-editor:view",
      "module:homepage-editor:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-homepage-editor",
        "label": "Homepage Editor"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "homepage-editor-summary"
    ]
  },
  {
    "id": "inventory",
    "name": "Inventory",
    "description": "Parts, stock, suppliers",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:inventory:view",
      "module:inventory:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-inventory",
        "label": "Inventory"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "inventory-summary"
    ]
  },
  {
    "id": "invoices",
    "name": "Invoices",
    "description": "Invoice generation and status",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:invoices:view",
      "module:invoices:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-invoices",
        "label": "Invoices"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "invoices-summary"
    ]
  },
  {
    "id": "module-manager",
    "name": "Module Manager",
    "description": "Enable, disable, inspect drop-in modules",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:module-manager:view",
      "module:module-manager:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-module-manager",
        "label": "Module Manager"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "module-manager-summary"
    ]
  },
  {
    "id": "platform-health",
    "name": "Platform Health",
    "description": "Install, API, database, module diagnostics",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:platform-health:view",
      "module:platform-health:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-platform-health",
        "label": "Platform Health"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "platform-health-summary"
    ]
  },
  {
    "id": "quote-center",
    "name": "Quote Center",
    "description": "Estimate, quote, approval lifecycle",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:quote-center:view",
      "module:quote-center:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-quote-center",
        "label": "Quote Center"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "quote-center-summary"
    ]
  },
  {
    "id": "scheduling",
    "name": "Scheduling",
    "description": "Calendar and crew assignment",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:scheduling:view",
      "module:scheduling:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-scheduling",
        "label": "Scheduling"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "scheduling-summary"
    ]
  },
  {
    "id": "square-payments",
    "name": "Square Payments",
    "description": "Payment capture and paid status sync",
    "status": "beta",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:square-payments:view",
      "module:square-payments:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-square-payments",
        "label": "Square Payments"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "square-payments-summary"
    ]
  },
  {
    "id": "theme-manager",
    "name": "Theme Manager",
    "description": "Manage light/dark/system/custom brand themes",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:theme-manager:view",
      "module:theme-manager:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-theme-manager",
        "label": "Theme Manager"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "theme-manager-summary"
    ]
  },
  {
    "id": "work-orders",
    "name": "Work Orders",
    "description": "Dispatch and complete service work",
    "status": "stable",
    "version": "1.0.0",
    "category": "Operations",
    "hidden": false,
    "permissions": [
      "module:work-orders:view",
      "module:work-orders:manage"
    ],
    "routes": [
      {
        "path": "/dashboard/#module-work-orders",
        "label": "Work Orders"
      }
    ],
    "navigation": {
      "sidebar": true,
      "mobile": true
    },
    "api": {
      "dispatcher": "/api/module/:module/:action"
    },
    "widgets": [
      "work-orders-summary"
    ]
  }
];
