export const registry = {
  "generatedAt": "2026-06-07T18:47:48.042Z",
  "modules": [
    {
      "id": "admin-dashboard",
      "title": "Admin Dashboard",
      "description": "Admin operational command center",
      "version": "1.0.0",
      "icon": "🧑‍💼",
      "workspace": "admin",
      "category": "dashboard",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "admin-dashboard:read",
        "admin-dashboard:write"
      ],
      "routes": [
        {
          "path": "/dashboard/admin-dashboard",
          "title": "Admin Dashboard",
          "view": "admin-dashboard-view",
          "workspace": "admin"
        }
      ],
      "nav": {
        "label": "Admin Dashboard",
        "path": "/dashboard/admin-dashboard",
        "icon": "🧑‍💼",
        "workspace": "admin",
        "order": 16
      },
      "mobileNav": {
        "label": "Admin Dashboard",
        "path": "/dashboard/admin-dashboard",
        "icon": "🧑‍💼"
      },
      "api": [
        {
          "method": "GET",
          "path": "admin-dashboard/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/admin-dashboard/module.html",
        "js": "/modules/admin-dashboard/module.js",
        "css": "/modules/admin-dashboard/module.css"
      }
    },
    {
      "id": "ai-photo-estimate",
      "title": "AI Photo Estimate",
      "description": "Upload photos and generate contractor estimates",
      "version": "1.0.0",
      "icon": "📸",
      "workspace": "admin",
      "category": "ai",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "ai-photo-estimate:read",
        "ai-photo-estimate:write"
      ],
      "routes": [
        {
          "path": "/dashboard/ai-photo-estimate",
          "title": "AI Photo Estimate",
          "view": "ai-photo-estimate-view",
          "workspace": "admin"
        }
      ],
      "nav": {
        "label": "AI Photo Estimate",
        "path": "/dashboard/ai-photo-estimate",
        "icon": "📸",
        "workspace": "admin",
        "order": 4
      },
      "mobileNav": {
        "label": "AI Photo Estimate",
        "path": "/dashboard/ai-photo-estimate",
        "icon": "📸"
      },
      "api": [
        {
          "method": "GET",
          "path": "ai-photo-estimate/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/ai-photo-estimate/module.html",
        "js": "/modules/ai-photo-estimate/module.js",
        "css": "/modules/ai-photo-estimate/module.css"
      }
    },
    {
      "id": "ai-troubleshooting",
      "title": "AI Troubleshooting",
      "description": "Guided diagnostics for field and office teams",
      "version": "1.0.0",
      "icon": "🤖",
      "workspace": "worker",
      "category": "ai",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "ai-troubleshooting:read",
        "ai-troubleshooting:write"
      ],
      "routes": [
        {
          "path": "/dashboard/ai-troubleshooting",
          "title": "AI Troubleshooting",
          "view": "ai-troubleshooting-view",
          "workspace": "worker"
        }
      ],
      "nav": {
        "label": "AI Troubleshooting",
        "path": "/dashboard/ai-troubleshooting",
        "icon": "🤖",
        "workspace": "worker",
        "order": 20
      },
      "mobileNav": {
        "label": "AI Troubleshooting",
        "path": "/dashboard/ai-troubleshooting",
        "icon": "🤖"
      },
      "api": [
        {
          "method": "GET",
          "path": "ai-troubleshooting/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/ai-troubleshooting/module.html",
        "js": "/modules/ai-troubleshooting/module.js",
        "css": "/modules/ai-troubleshooting/module.css"
      }
    },
    {
      "id": "client-dashboard",
      "title": "Client Dashboard",
      "description": "Client workspace dashboard",
      "version": "1.0.0",
      "icon": "🙋",
      "workspace": "client",
      "category": "dashboard",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "client-dashboard:read",
        "client-dashboard:write"
      ],
      "routes": [
        {
          "path": "/dashboard/client-dashboard",
          "title": "Client Dashboard",
          "view": "client-dashboard-view",
          "workspace": "client"
        }
      ],
      "nav": {
        "label": "Client Dashboard",
        "path": "/dashboard/client-dashboard",
        "icon": "🙋",
        "workspace": "client",
        "order": 19
      },
      "mobileNav": {
        "label": "Client Dashboard",
        "path": "/dashboard/client-dashboard",
        "icon": "🙋"
      },
      "api": [
        {
          "method": "GET",
          "path": "client-dashboard/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/client-dashboard/module.html",
        "js": "/modules/client-dashboard/module.js",
        "css": "/modules/client-dashboard/module.css"
      }
    },
    {
      "id": "client-portal",
      "title": "Client Portal",
      "description": "Client quote, job, and invoice access",
      "version": "1.0.0",
      "icon": "🔐",
      "workspace": "client",
      "category": "portal",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "client-portal:read",
        "client-portal:write"
      ],
      "routes": [
        {
          "path": "/dashboard/client-portal",
          "title": "Client Portal",
          "view": "client-portal-view",
          "workspace": "client"
        }
      ],
      "nav": {
        "label": "Client Portal",
        "path": "/dashboard/client-portal",
        "icon": "🔐",
        "workspace": "client",
        "order": 14
      },
      "mobileNav": {
        "label": "Client Portal",
        "path": "/dashboard/client-portal",
        "icon": "🔐"
      },
      "api": [
        {
          "method": "GET",
          "path": "client-portal/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/client-portal/module.html",
        "js": "/modules/client-portal/module.js",
        "css": "/modules/client-portal/module.css"
      }
    },
    {
      "id": "finance",
      "title": "Finance",
      "description": "Revenue, cost, and payment reporting",
      "version": "1.0.0",
      "icon": "💰",
      "workspace": "owner",
      "category": "finance",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "finance:read",
        "finance:write"
      ],
      "routes": [
        {
          "path": "/dashboard/finance",
          "title": "Finance",
          "view": "finance-view",
          "workspace": "owner"
        }
      ],
      "nav": {
        "label": "Finance",
        "path": "/dashboard/finance",
        "icon": "💰",
        "workspace": "owner",
        "order": 10
      },
      "mobileNav": {
        "label": "Finance",
        "path": "/dashboard/finance",
        "icon": "💰"
      },
      "api": [
        {
          "method": "GET",
          "path": "finance/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/finance/module.html",
        "js": "/modules/finance/module.js",
        "css": "/modules/finance/module.css"
      }
    },
    {
      "id": "homepage-editor",
      "title": "Homepage Editor",
      "description": "Edit public homepage sections and branding",
      "version": "1.0.0",
      "icon": "🏠",
      "workspace": "owner",
      "category": "content",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "homepage-editor:read",
        "homepage-editor:write"
      ],
      "routes": [
        {
          "path": "/dashboard/homepage-editor",
          "title": "Homepage Editor",
          "view": "homepage-editor-view",
          "workspace": "owner"
        }
      ],
      "nav": {
        "label": "Homepage Editor",
        "path": "/dashboard/homepage-editor",
        "icon": "🏠",
        "workspace": "owner",
        "order": 3
      },
      "mobileNav": {
        "label": "Homepage Editor",
        "path": "/dashboard/homepage-editor",
        "icon": "🏠"
      },
      "api": [
        {
          "method": "GET",
          "path": "homepage-editor/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [
        {
          "id": "hero",
          "title": "Hero"
        },
        {
          "id": "services",
          "title": "Services"
        },
        {
          "id": "gallery",
          "title": "Gallery"
        },
        {
          "id": "contact",
          "title": "Contact"
        }
      ],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/homepage-editor/module.html",
        "js": "/modules/homepage-editor/module.js",
        "css": "/modules/homepage-editor/module.css"
      }
    },
    {
      "id": "installer",
      "title": "Installer",
      "description": "First-run setup wizard",
      "version": "1.0.0",
      "icon": "🚀",
      "workspace": "owner",
      "category": "platform",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "installer:read",
        "installer:write"
      ],
      "routes": [
        {
          "path": "/dashboard/installer",
          "title": "Installer",
          "view": "installer-view",
          "workspace": "owner"
        }
      ],
      "nav": {
        "label": "Installer",
        "path": "/dashboard/installer",
        "icon": "🚀",
        "workspace": "owner",
        "order": 13
      },
      "mobileNav": {
        "label": "Installer",
        "path": "/dashboard/installer",
        "icon": "🚀"
      },
      "api": [
        {
          "method": "GET",
          "path": "installer/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [
        "welcome",
        "license",
        "environment",
        "database",
        "company",
        "logo",
        "branding",
        "theme",
        "sidebar",
        "owner",
        "email",
        "homepage",
        "modules",
        "permissions",
        "square",
        "ai",
        "review",
        "complete"
      ],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/installer/module.html",
        "js": "/modules/installer/module.js",
        "css": "/modules/installer/module.css"
      }
    },
    {
      "id": "inventory",
      "title": "Inventory",
      "description": "Track materials, tools, and stock",
      "version": "1.0.0",
      "icon": "📦",
      "workspace": "manager",
      "category": "operations",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "inventory:read",
        "inventory:write"
      ],
      "routes": [
        {
          "path": "/dashboard/inventory",
          "title": "Inventory",
          "view": "inventory-view",
          "workspace": "manager"
        }
      ],
      "nav": {
        "label": "Inventory",
        "path": "/dashboard/inventory",
        "icon": "📦",
        "workspace": "manager",
        "order": 8
      },
      "mobileNav": {
        "label": "Inventory",
        "path": "/dashboard/inventory",
        "icon": "📦"
      },
      "api": [
        {
          "method": "GET",
          "path": "inventory/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/inventory/module.html",
        "js": "/modules/inventory/module.js",
        "css": "/modules/inventory/module.css"
      }
    },
    {
      "id": "invoices",
      "title": "Invoices",
      "description": "Create invoices and collect payments",
      "version": "1.0.0",
      "icon": "💳",
      "workspace": "admin",
      "category": "finance",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "invoices:read",
        "invoices:write"
      ],
      "routes": [
        {
          "path": "/dashboard/invoices",
          "title": "Invoices",
          "view": "invoices-view",
          "workspace": "admin"
        }
      ],
      "nav": {
        "label": "Invoices",
        "path": "/dashboard/invoices",
        "icon": "💳",
        "workspace": "admin",
        "order": 9
      },
      "mobileNav": {
        "label": "Invoices",
        "path": "/dashboard/invoices",
        "icon": "💳"
      },
      "api": [
        {
          "method": "GET",
          "path": "invoices/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/invoices/module.html",
        "js": "/modules/invoices/module.js",
        "css": "/modules/invoices/module.css"
      }
    },
    {
      "id": "manager-dashboard",
      "title": "Manager Dashboard",
      "description": "Manager scheduling and crew controls",
      "version": "1.0.0",
      "icon": "👷",
      "workspace": "manager",
      "category": "dashboard",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "manager-dashboard:read",
        "manager-dashboard:write"
      ],
      "routes": [
        {
          "path": "/dashboard/manager-dashboard",
          "title": "Manager Dashboard",
          "view": "manager-dashboard-view",
          "workspace": "manager"
        }
      ],
      "nav": {
        "label": "Manager Dashboard",
        "path": "/dashboard/manager-dashboard",
        "icon": "👷",
        "workspace": "manager",
        "order": 17
      },
      "mobileNav": {
        "label": "Manager Dashboard",
        "path": "/dashboard/manager-dashboard",
        "icon": "👷"
      },
      "api": [
        {
          "method": "GET",
          "path": "manager-dashboard/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/manager-dashboard/module.html",
        "js": "/modules/manager-dashboard/module.js",
        "css": "/modules/manager-dashboard/module.css"
      }
    },
    {
      "id": "module-manager",
      "title": "Module Manager",
      "description": "Manage drop-in modules",
      "version": "1.0.0",
      "icon": "🧩",
      "workspace": "owner",
      "category": "platform",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "module-manager:read",
        "module-manager:write"
      ],
      "routes": [
        {
          "path": "/dashboard/module-manager",
          "title": "Module Manager",
          "view": "module-manager-view",
          "workspace": "owner"
        }
      ],
      "nav": {
        "label": "Module Manager",
        "path": "/dashboard/module-manager",
        "icon": "🧩",
        "workspace": "owner",
        "order": 1
      },
      "mobileNav": {
        "label": "Module Manager",
        "path": "/dashboard/module-manager",
        "icon": "🧩"
      },
      "api": [
        {
          "method": "GET",
          "path": "module-manager/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/module-manager/module.html",
        "js": "/modules/module-manager/module.js",
        "css": "/modules/module-manager/module.css"
      }
    },
    {
      "id": "owner-dashboard",
      "title": "Owner Dashboard",
      "description": "Executive overview and controls",
      "version": "1.0.0",
      "icon": "👑",
      "workspace": "owner",
      "category": "dashboard",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "owner-dashboard:read",
        "owner-dashboard:write"
      ],
      "routes": [
        {
          "path": "/dashboard/owner-dashboard",
          "title": "Owner Dashboard",
          "view": "owner-dashboard-view",
          "workspace": "owner"
        }
      ],
      "nav": {
        "label": "Owner Dashboard",
        "path": "/dashboard/owner-dashboard",
        "icon": "👑",
        "workspace": "owner",
        "order": 15
      },
      "mobileNav": {
        "label": "Owner Dashboard",
        "path": "/dashboard/owner-dashboard",
        "icon": "👑"
      },
      "api": [
        {
          "method": "GET",
          "path": "owner-dashboard/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/owner-dashboard/module.html",
        "js": "/modules/owner-dashboard/module.js",
        "css": "/modules/owner-dashboard/module.css"
      }
    },
    {
      "id": "public-invoice-viewer",
      "title": "Public Invoice Viewer",
      "description": "Secure public invoice and payment pages",
      "version": "1.0.0",
      "icon": "🧾",
      "workspace": "public",
      "category": "public",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "public-invoice-viewer:read",
        "public-invoice-viewer:write"
      ],
      "routes": [
        {
          "path": "/dashboard/public-invoice-viewer",
          "title": "Public Invoice Viewer",
          "view": "public-invoice-viewer-view",
          "workspace": "public"
        }
      ],
      "nav": {
        "label": "Public Invoice Viewer",
        "path": "/dashboard/public-invoice-viewer",
        "icon": "🧾",
        "workspace": "public",
        "order": 23
      },
      "mobileNav": {
        "label": "Public Invoice Viewer",
        "path": "/dashboard/public-invoice-viewer",
        "icon": "🧾"
      },
      "api": [
        {
          "method": "GET",
          "path": "public-invoice-viewer/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/public-invoice-viewer/module.html",
        "js": "/modules/public-invoice-viewer/module.js",
        "css": "/modules/public-invoice-viewer/module.css"
      }
    },
    {
      "id": "public-quote-viewer",
      "title": "Public Quote Viewer",
      "description": "Secure public quote acceptance pages",
      "version": "1.0.0",
      "icon": "📄",
      "workspace": "public",
      "category": "public",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "public-quote-viewer:read",
        "public-quote-viewer:write"
      ],
      "routes": [
        {
          "path": "/dashboard/public-quote-viewer",
          "title": "Public Quote Viewer",
          "view": "public-quote-viewer-view",
          "workspace": "public"
        }
      ],
      "nav": {
        "label": "Public Quote Viewer",
        "path": "/dashboard/public-quote-viewer",
        "icon": "📄",
        "workspace": "public",
        "order": 22
      },
      "mobileNav": {
        "label": "Public Quote Viewer",
        "path": "/dashboard/public-quote-viewer",
        "icon": "📄"
      },
      "api": [
        {
          "method": "GET",
          "path": "public-quote-viewer/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/public-quote-viewer/module.html",
        "js": "/modules/public-quote-viewer/module.js",
        "css": "/modules/public-quote-viewer/module.css"
      }
    },
    {
      "id": "quote-center",
      "title": "Quote Center",
      "description": "Create, review, send, and accept quotes",
      "version": "1.0.0",
      "icon": "🧾",
      "workspace": "admin",
      "category": "sales",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "quote-center:read",
        "quote-center:write"
      ],
      "routes": [
        {
          "path": "/dashboard/quote-center",
          "title": "Quote Center",
          "view": "quote-center-view",
          "workspace": "admin"
        }
      ],
      "nav": {
        "label": "Quote Center",
        "path": "/dashboard/quote-center",
        "icon": "🧾",
        "workspace": "admin",
        "order": 5
      },
      "mobileNav": {
        "label": "Quote Center",
        "path": "/dashboard/quote-center",
        "icon": "🧾"
      },
      "api": [
        {
          "method": "GET",
          "path": "quote-center/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/quote-center/module.html",
        "js": "/modules/quote-center/module.js",
        "css": "/modules/quote-center/module.css"
      }
    },
    {
      "id": "reporting",
      "title": "Reporting",
      "description": "Operational dashboards and KPI reports",
      "version": "1.0.0",
      "icon": "📊",
      "workspace": "owner",
      "category": "analytics",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "reporting:read",
        "reporting:write"
      ],
      "routes": [
        {
          "path": "/dashboard/reporting",
          "title": "Reporting",
          "view": "reporting-view",
          "workspace": "owner"
        }
      ],
      "nav": {
        "label": "Reporting",
        "path": "/dashboard/reporting",
        "icon": "📊",
        "workspace": "owner",
        "order": 11
      },
      "mobileNav": {
        "label": "Reporting",
        "path": "/dashboard/reporting",
        "icon": "📊"
      },
      "api": [
        {
          "method": "GET",
          "path": "reporting/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/reporting/module.html",
        "js": "/modules/reporting/module.js",
        "css": "/modules/reporting/module.css"
      }
    },
    {
      "id": "scheduling",
      "title": "Scheduling",
      "description": "Schedule crews, jobs, and visits",
      "version": "1.0.0",
      "icon": "📅",
      "workspace": "manager",
      "category": "operations",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "scheduling:read",
        "scheduling:write"
      ],
      "routes": [
        {
          "path": "/dashboard/scheduling",
          "title": "Scheduling",
          "view": "scheduling-view",
          "workspace": "manager"
        }
      ],
      "nav": {
        "label": "Scheduling",
        "path": "/dashboard/scheduling",
        "icon": "📅",
        "workspace": "manager",
        "order": 7
      },
      "mobileNav": {
        "label": "Scheduling",
        "path": "/dashboard/scheduling",
        "icon": "📅"
      },
      "api": [
        {
          "method": "GET",
          "path": "scheduling/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/scheduling/module.html",
        "js": "/modules/scheduling/module.js",
        "css": "/modules/scheduling/module.css"
      }
    },
    {
      "id": "square-integration",
      "title": "Square Integration",
      "description": "Secure Square payment link and webhook support",
      "version": "1.0.0",
      "icon": "⬛",
      "workspace": "admin",
      "category": "payments",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "square-integration:read",
        "square-integration:write"
      ],
      "routes": [
        {
          "path": "/dashboard/square-integration",
          "title": "Square Integration",
          "view": "square-integration-view",
          "workspace": "admin"
        }
      ],
      "nav": {
        "label": "Square Integration",
        "path": "/dashboard/square-integration",
        "icon": "⬛",
        "workspace": "admin",
        "order": 21
      },
      "mobileNav": {
        "label": "Square Integration",
        "path": "/dashboard/square-integration",
        "icon": "⬛"
      },
      "api": [
        {
          "method": "GET",
          "path": "square-integration/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/square-integration/module.html",
        "js": "/modules/square-integration/module.js",
        "css": "/modules/square-integration/module.css"
      }
    },
    {
      "id": "theme-manager",
      "title": "Theme Manager",
      "description": "Control light, dark, system themes and sidebar colors",
      "version": "1.0.0",
      "icon": "🎨",
      "workspace": "owner",
      "category": "settings",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "theme-manager:read",
        "theme-manager:write"
      ],
      "routes": [
        {
          "path": "/dashboard/theme-manager",
          "title": "Theme Manager",
          "view": "theme-manager-view",
          "workspace": "owner"
        }
      ],
      "nav": {
        "label": "Theme Manager",
        "path": "/dashboard/theme-manager",
        "icon": "🎨",
        "workspace": "owner",
        "order": 2
      },
      "mobileNav": {
        "label": "Theme Manager",
        "path": "/dashboard/theme-manager",
        "icon": "🎨"
      },
      "api": [
        {
          "method": "GET",
          "path": "theme-manager/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/theme-manager/module.html",
        "js": "/modules/theme-manager/module.js",
        "css": "/modules/theme-manager/module.css"
      }
    },
    {
      "id": "work-orders",
      "title": "Work Orders",
      "description": "Manage the full job workflow",
      "version": "1.0.0",
      "icon": "🛠️",
      "workspace": "admin",
      "category": "operations",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "work-orders:read",
        "work-orders:write"
      ],
      "routes": [
        {
          "path": "/dashboard/work-orders",
          "title": "Work Orders",
          "view": "work-orders-view",
          "workspace": "admin"
        }
      ],
      "nav": {
        "label": "Work Orders",
        "path": "/dashboard/work-orders",
        "icon": "🛠️",
        "workspace": "admin",
        "order": 6
      },
      "mobileNav": {
        "label": "Work Orders",
        "path": "/dashboard/work-orders",
        "icon": "🛠️"
      },
      "api": [
        {
          "method": "GET",
          "path": "work-orders/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/work-orders/module.html",
        "js": "/modules/work-orders/module.js",
        "css": "/modules/work-orders/module.css"
      }
    },
    {
      "id": "worker-dashboard",
      "title": "Worker Dashboard",
      "description": "Worker job queue and completion flow",
      "version": "1.0.0",
      "icon": "🧰",
      "workspace": "worker",
      "category": "dashboard",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "worker-dashboard:read",
        "worker-dashboard:write"
      ],
      "routes": [
        {
          "path": "/dashboard/worker-dashboard",
          "title": "Worker Dashboard",
          "view": "worker-dashboard-view",
          "workspace": "worker"
        }
      ],
      "nav": {
        "label": "Worker Dashboard",
        "path": "/dashboard/worker-dashboard",
        "icon": "🧰",
        "workspace": "worker",
        "order": 18
      },
      "mobileNav": {
        "label": "Worker Dashboard",
        "path": "/dashboard/worker-dashboard",
        "icon": "🧰"
      },
      "api": [
        {
          "method": "GET",
          "path": "worker-dashboard/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/worker-dashboard/module.html",
        "js": "/modules/worker-dashboard/module.js",
        "css": "/modules/worker-dashboard/module.css"
      }
    },
    {
      "id": "workflow-engine",
      "title": "Workflow Engine",
      "description": "Single-source job state machine",
      "version": "1.0.0",
      "icon": "🔁",
      "workspace": "admin",
      "category": "platform",
      "enabledByDefault": true,
      "dependencies": [],
      "permissions": [
        "workflow-engine:read",
        "workflow-engine:write"
      ],
      "routes": [
        {
          "path": "/dashboard/workflow-engine",
          "title": "Workflow Engine",
          "view": "workflow-engine-view",
          "workspace": "admin"
        }
      ],
      "nav": {
        "label": "Workflow Engine",
        "path": "/dashboard/workflow-engine",
        "icon": "🔁",
        "workspace": "admin",
        "order": 12
      },
      "mobileNav": {
        "label": "Workflow Engine",
        "path": "/dashboard/workflow-engine",
        "icon": "🔁"
      },
      "api": [
        {
          "method": "GET",
          "path": "workflow-engine/summary",
          "handler": "summary.mjs"
        }
      ],
      "events": [
        "workflow.updated",
        "module.toggled"
      ],
      "settings": {
        "configurable": true
      },
      "homepageSections": [],
      "installerSteps": [],
      "migrations": [
        "netlify/migrations/0001_initial_platform.sql"
      ],
      "assets": {
        "html": "/modules/workflow-engine/module.html",
        "js": "/modules/workflow-engine/module.js",
        "css": "/modules/workflow-engine/module.css"
      }
    }
  ],
  "routes": [
    {
      "path": "/dashboard/admin-dashboard",
      "title": "Admin Dashboard",
      "view": "admin-dashboard-view",
      "workspace": "admin",
      "moduleId": "admin-dashboard"
    },
    {
      "path": "/dashboard/ai-photo-estimate",
      "title": "AI Photo Estimate",
      "view": "ai-photo-estimate-view",
      "workspace": "admin",
      "moduleId": "ai-photo-estimate"
    },
    {
      "path": "/dashboard/ai-troubleshooting",
      "title": "AI Troubleshooting",
      "view": "ai-troubleshooting-view",
      "workspace": "worker",
      "moduleId": "ai-troubleshooting"
    },
    {
      "path": "/dashboard/client-dashboard",
      "title": "Client Dashboard",
      "view": "client-dashboard-view",
      "workspace": "client",
      "moduleId": "client-dashboard"
    },
    {
      "path": "/dashboard/client-portal",
      "title": "Client Portal",
      "view": "client-portal-view",
      "workspace": "client",
      "moduleId": "client-portal"
    },
    {
      "path": "/dashboard/finance",
      "title": "Finance",
      "view": "finance-view",
      "workspace": "owner",
      "moduleId": "finance"
    },
    {
      "path": "/dashboard/homepage-editor",
      "title": "Homepage Editor",
      "view": "homepage-editor-view",
      "workspace": "owner",
      "moduleId": "homepage-editor"
    },
    {
      "path": "/dashboard/installer",
      "title": "Installer",
      "view": "installer-view",
      "workspace": "owner",
      "moduleId": "installer"
    },
    {
      "path": "/dashboard/inventory",
      "title": "Inventory",
      "view": "inventory-view",
      "workspace": "manager",
      "moduleId": "inventory"
    },
    {
      "path": "/dashboard/invoices",
      "title": "Invoices",
      "view": "invoices-view",
      "workspace": "admin",
      "moduleId": "invoices"
    },
    {
      "path": "/dashboard/manager-dashboard",
      "title": "Manager Dashboard",
      "view": "manager-dashboard-view",
      "workspace": "manager",
      "moduleId": "manager-dashboard"
    },
    {
      "path": "/dashboard/module-manager",
      "title": "Module Manager",
      "view": "module-manager-view",
      "workspace": "owner",
      "moduleId": "module-manager"
    },
    {
      "path": "/dashboard/owner-dashboard",
      "title": "Owner Dashboard",
      "view": "owner-dashboard-view",
      "workspace": "owner",
      "moduleId": "owner-dashboard"
    },
    {
      "path": "/dashboard/public-invoice-viewer",
      "title": "Public Invoice Viewer",
      "view": "public-invoice-viewer-view",
      "workspace": "public",
      "moduleId": "public-invoice-viewer"
    },
    {
      "path": "/dashboard/public-quote-viewer",
      "title": "Public Quote Viewer",
      "view": "public-quote-viewer-view",
      "workspace": "public",
      "moduleId": "public-quote-viewer"
    },
    {
      "path": "/dashboard/quote-center",
      "title": "Quote Center",
      "view": "quote-center-view",
      "workspace": "admin",
      "moduleId": "quote-center"
    },
    {
      "path": "/dashboard/reporting",
      "title": "Reporting",
      "view": "reporting-view",
      "workspace": "owner",
      "moduleId": "reporting"
    },
    {
      "path": "/dashboard/scheduling",
      "title": "Scheduling",
      "view": "scheduling-view",
      "workspace": "manager",
      "moduleId": "scheduling"
    },
    {
      "path": "/dashboard/square-integration",
      "title": "Square Integration",
      "view": "square-integration-view",
      "workspace": "admin",
      "moduleId": "square-integration"
    },
    {
      "path": "/dashboard/theme-manager",
      "title": "Theme Manager",
      "view": "theme-manager-view",
      "workspace": "owner",
      "moduleId": "theme-manager"
    },
    {
      "path": "/dashboard/work-orders",
      "title": "Work Orders",
      "view": "work-orders-view",
      "workspace": "admin",
      "moduleId": "work-orders"
    },
    {
      "path": "/dashboard/worker-dashboard",
      "title": "Worker Dashboard",
      "view": "worker-dashboard-view",
      "workspace": "worker",
      "moduleId": "worker-dashboard"
    },
    {
      "path": "/dashboard/workflow-engine",
      "title": "Workflow Engine",
      "view": "workflow-engine-view",
      "workspace": "admin",
      "moduleId": "workflow-engine"
    }
  ],
  "sidebar": [
    {
      "label": "Module Manager",
      "path": "/dashboard/module-manager",
      "icon": "🧩",
      "workspace": "owner",
      "order": 1,
      "moduleId": "module-manager"
    },
    {
      "label": "Theme Manager",
      "path": "/dashboard/theme-manager",
      "icon": "🎨",
      "workspace": "owner",
      "order": 2,
      "moduleId": "theme-manager"
    },
    {
      "label": "Homepage Editor",
      "path": "/dashboard/homepage-editor",
      "icon": "🏠",
      "workspace": "owner",
      "order": 3,
      "moduleId": "homepage-editor"
    },
    {
      "label": "AI Photo Estimate",
      "path": "/dashboard/ai-photo-estimate",
      "icon": "📸",
      "workspace": "admin",
      "order": 4,
      "moduleId": "ai-photo-estimate"
    },
    {
      "label": "Quote Center",
      "path": "/dashboard/quote-center",
      "icon": "🧾",
      "workspace": "admin",
      "order": 5,
      "moduleId": "quote-center"
    },
    {
      "label": "Work Orders",
      "path": "/dashboard/work-orders",
      "icon": "🛠️",
      "workspace": "admin",
      "order": 6,
      "moduleId": "work-orders"
    },
    {
      "label": "Scheduling",
      "path": "/dashboard/scheduling",
      "icon": "📅",
      "workspace": "manager",
      "order": 7,
      "moduleId": "scheduling"
    },
    {
      "label": "Inventory",
      "path": "/dashboard/inventory",
      "icon": "📦",
      "workspace": "manager",
      "order": 8,
      "moduleId": "inventory"
    },
    {
      "label": "Invoices",
      "path": "/dashboard/invoices",
      "icon": "💳",
      "workspace": "admin",
      "order": 9,
      "moduleId": "invoices"
    },
    {
      "label": "Finance",
      "path": "/dashboard/finance",
      "icon": "💰",
      "workspace": "owner",
      "order": 10,
      "moduleId": "finance"
    },
    {
      "label": "Reporting",
      "path": "/dashboard/reporting",
      "icon": "📊",
      "workspace": "owner",
      "order": 11,
      "moduleId": "reporting"
    },
    {
      "label": "Workflow Engine",
      "path": "/dashboard/workflow-engine",
      "icon": "🔁",
      "workspace": "admin",
      "order": 12,
      "moduleId": "workflow-engine"
    },
    {
      "label": "Installer",
      "path": "/dashboard/installer",
      "icon": "🚀",
      "workspace": "owner",
      "order": 13,
      "moduleId": "installer"
    },
    {
      "label": "Client Portal",
      "path": "/dashboard/client-portal",
      "icon": "🔐",
      "workspace": "client",
      "order": 14,
      "moduleId": "client-portal"
    },
    {
      "label": "Owner Dashboard",
      "path": "/dashboard/owner-dashboard",
      "icon": "👑",
      "workspace": "owner",
      "order": 15,
      "moduleId": "owner-dashboard"
    },
    {
      "label": "Admin Dashboard",
      "path": "/dashboard/admin-dashboard",
      "icon": "🧑‍💼",
      "workspace": "admin",
      "order": 16,
      "moduleId": "admin-dashboard"
    },
    {
      "label": "Manager Dashboard",
      "path": "/dashboard/manager-dashboard",
      "icon": "👷",
      "workspace": "manager",
      "order": 17,
      "moduleId": "manager-dashboard"
    },
    {
      "label": "Worker Dashboard",
      "path": "/dashboard/worker-dashboard",
      "icon": "🧰",
      "workspace": "worker",
      "order": 18,
      "moduleId": "worker-dashboard"
    },
    {
      "label": "Client Dashboard",
      "path": "/dashboard/client-dashboard",
      "icon": "🙋",
      "workspace": "client",
      "order": 19,
      "moduleId": "client-dashboard"
    },
    {
      "label": "AI Troubleshooting",
      "path": "/dashboard/ai-troubleshooting",
      "icon": "🤖",
      "workspace": "worker",
      "order": 20,
      "moduleId": "ai-troubleshooting"
    },
    {
      "label": "Square Integration",
      "path": "/dashboard/square-integration",
      "icon": "⬛",
      "workspace": "admin",
      "order": 21,
      "moduleId": "square-integration"
    },
    {
      "label": "Public Quote Viewer",
      "path": "/dashboard/public-quote-viewer",
      "icon": "📄",
      "workspace": "public",
      "order": 22,
      "moduleId": "public-quote-viewer"
    },
    {
      "label": "Public Invoice Viewer",
      "path": "/dashboard/public-invoice-viewer",
      "icon": "🧾",
      "workspace": "public",
      "order": 23,
      "moduleId": "public-invoice-viewer"
    }
  ],
  "mobileNav": [
    {
      "label": "Admin Dashboard",
      "path": "/dashboard/admin-dashboard",
      "icon": "🧑‍💼",
      "moduleId": "admin-dashboard"
    },
    {
      "label": "AI Photo Estimate",
      "path": "/dashboard/ai-photo-estimate",
      "icon": "📸",
      "moduleId": "ai-photo-estimate"
    },
    {
      "label": "AI Troubleshooting",
      "path": "/dashboard/ai-troubleshooting",
      "icon": "🤖",
      "moduleId": "ai-troubleshooting"
    },
    {
      "label": "Client Dashboard",
      "path": "/dashboard/client-dashboard",
      "icon": "🙋",
      "moduleId": "client-dashboard"
    },
    {
      "label": "Client Portal",
      "path": "/dashboard/client-portal",
      "icon": "🔐",
      "moduleId": "client-portal"
    },
    {
      "label": "Finance",
      "path": "/dashboard/finance",
      "icon": "💰",
      "moduleId": "finance"
    },
    {
      "label": "Homepage Editor",
      "path": "/dashboard/homepage-editor",
      "icon": "🏠",
      "moduleId": "homepage-editor"
    },
    {
      "label": "Installer",
      "path": "/dashboard/installer",
      "icon": "🚀",
      "moduleId": "installer"
    },
    {
      "label": "Inventory",
      "path": "/dashboard/inventory",
      "icon": "📦",
      "moduleId": "inventory"
    },
    {
      "label": "Invoices",
      "path": "/dashboard/invoices",
      "icon": "💳",
      "moduleId": "invoices"
    },
    {
      "label": "Manager Dashboard",
      "path": "/dashboard/manager-dashboard",
      "icon": "👷",
      "moduleId": "manager-dashboard"
    },
    {
      "label": "Module Manager",
      "path": "/dashboard/module-manager",
      "icon": "🧩",
      "moduleId": "module-manager"
    },
    {
      "label": "Owner Dashboard",
      "path": "/dashboard/owner-dashboard",
      "icon": "👑",
      "moduleId": "owner-dashboard"
    },
    {
      "label": "Public Invoice Viewer",
      "path": "/dashboard/public-invoice-viewer",
      "icon": "🧾",
      "moduleId": "public-invoice-viewer"
    },
    {
      "label": "Public Quote Viewer",
      "path": "/dashboard/public-quote-viewer",
      "icon": "📄",
      "moduleId": "public-quote-viewer"
    },
    {
      "label": "Quote Center",
      "path": "/dashboard/quote-center",
      "icon": "🧾",
      "moduleId": "quote-center"
    },
    {
      "label": "Reporting",
      "path": "/dashboard/reporting",
      "icon": "📊",
      "moduleId": "reporting"
    },
    {
      "label": "Scheduling",
      "path": "/dashboard/scheduling",
      "icon": "📅",
      "moduleId": "scheduling"
    },
    {
      "label": "Square Integration",
      "path": "/dashboard/square-integration",
      "icon": "⬛",
      "moduleId": "square-integration"
    },
    {
      "label": "Theme Manager",
      "path": "/dashboard/theme-manager",
      "icon": "🎨",
      "moduleId": "theme-manager"
    },
    {
      "label": "Work Orders",
      "path": "/dashboard/work-orders",
      "icon": "🛠️",
      "moduleId": "work-orders"
    },
    {
      "label": "Worker Dashboard",
      "path": "/dashboard/worker-dashboard",
      "icon": "🧰",
      "moduleId": "worker-dashboard"
    },
    {
      "label": "Workflow Engine",
      "path": "/dashboard/workflow-engine",
      "icon": "🔁",
      "moduleId": "workflow-engine"
    }
  ],
  "permissions": {
    "admin-dashboard": [
      "admin-dashboard:read",
      "admin-dashboard:write"
    ],
    "ai-photo-estimate": [
      "ai-photo-estimate:read",
      "ai-photo-estimate:write"
    ],
    "ai-troubleshooting": [
      "ai-troubleshooting:read",
      "ai-troubleshooting:write"
    ],
    "client-dashboard": [
      "client-dashboard:read",
      "client-dashboard:write"
    ],
    "client-portal": [
      "client-portal:read",
      "client-portal:write"
    ],
    "finance": [
      "finance:read",
      "finance:write"
    ],
    "homepage-editor": [
      "homepage-editor:read",
      "homepage-editor:write"
    ],
    "installer": [
      "installer:read",
      "installer:write"
    ],
    "inventory": [
      "inventory:read",
      "inventory:write"
    ],
    "invoices": [
      "invoices:read",
      "invoices:write"
    ],
    "manager-dashboard": [
      "manager-dashboard:read",
      "manager-dashboard:write"
    ],
    "module-manager": [
      "module-manager:read",
      "module-manager:write"
    ],
    "owner-dashboard": [
      "owner-dashboard:read",
      "owner-dashboard:write"
    ],
    "public-invoice-viewer": [
      "public-invoice-viewer:read",
      "public-invoice-viewer:write"
    ],
    "public-quote-viewer": [
      "public-quote-viewer:read",
      "public-quote-viewer:write"
    ],
    "quote-center": [
      "quote-center:read",
      "quote-center:write"
    ],
    "reporting": [
      "reporting:read",
      "reporting:write"
    ],
    "scheduling": [
      "scheduling:read",
      "scheduling:write"
    ],
    "square-integration": [
      "square-integration:read",
      "square-integration:write"
    ],
    "theme-manager": [
      "theme-manager:read",
      "theme-manager:write"
    ],
    "work-orders": [
      "work-orders:read",
      "work-orders:write"
    ],
    "worker-dashboard": [
      "worker-dashboard:read",
      "worker-dashboard:write"
    ],
    "workflow-engine": [
      "workflow-engine:read",
      "workflow-engine:write"
    ]
  },
  "managerList": [
    {
      "id": "admin-dashboard",
      "title": "Admin Dashboard",
      "description": "Admin operational command center",
      "version": "1.0.0",
      "workspace": "admin",
      "category": "dashboard",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🧑‍💼"
    },
    {
      "id": "ai-photo-estimate",
      "title": "AI Photo Estimate",
      "description": "Upload photos and generate contractor estimates",
      "version": "1.0.0",
      "workspace": "admin",
      "category": "ai",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "📸"
    },
    {
      "id": "ai-troubleshooting",
      "title": "AI Troubleshooting",
      "description": "Guided diagnostics for field and office teams",
      "version": "1.0.0",
      "workspace": "worker",
      "category": "ai",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🤖"
    },
    {
      "id": "client-dashboard",
      "title": "Client Dashboard",
      "description": "Client workspace dashboard",
      "version": "1.0.0",
      "workspace": "client",
      "category": "dashboard",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🙋"
    },
    {
      "id": "client-portal",
      "title": "Client Portal",
      "description": "Client quote, job, and invoice access",
      "version": "1.0.0",
      "workspace": "client",
      "category": "portal",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🔐"
    },
    {
      "id": "finance",
      "title": "Finance",
      "description": "Revenue, cost, and payment reporting",
      "version": "1.0.0",
      "workspace": "owner",
      "category": "finance",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "💰"
    },
    {
      "id": "homepage-editor",
      "title": "Homepage Editor",
      "description": "Edit public homepage sections and branding",
      "version": "1.0.0",
      "workspace": "owner",
      "category": "content",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🏠"
    },
    {
      "id": "installer",
      "title": "Installer",
      "description": "First-run setup wizard",
      "version": "1.0.0",
      "workspace": "owner",
      "category": "platform",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🚀"
    },
    {
      "id": "inventory",
      "title": "Inventory",
      "description": "Track materials, tools, and stock",
      "version": "1.0.0",
      "workspace": "manager",
      "category": "operations",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "📦"
    },
    {
      "id": "invoices",
      "title": "Invoices",
      "description": "Create invoices and collect payments",
      "version": "1.0.0",
      "workspace": "admin",
      "category": "finance",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "💳"
    },
    {
      "id": "manager-dashboard",
      "title": "Manager Dashboard",
      "description": "Manager scheduling and crew controls",
      "version": "1.0.0",
      "workspace": "manager",
      "category": "dashboard",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "👷"
    },
    {
      "id": "module-manager",
      "title": "Module Manager",
      "description": "Manage drop-in modules",
      "version": "1.0.0",
      "workspace": "owner",
      "category": "platform",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🧩"
    },
    {
      "id": "owner-dashboard",
      "title": "Owner Dashboard",
      "description": "Executive overview and controls",
      "version": "1.0.0",
      "workspace": "owner",
      "category": "dashboard",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "👑"
    },
    {
      "id": "public-invoice-viewer",
      "title": "Public Invoice Viewer",
      "description": "Secure public invoice and payment pages",
      "version": "1.0.0",
      "workspace": "public",
      "category": "public",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🧾"
    },
    {
      "id": "public-quote-viewer",
      "title": "Public Quote Viewer",
      "description": "Secure public quote acceptance pages",
      "version": "1.0.0",
      "workspace": "public",
      "category": "public",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "📄"
    },
    {
      "id": "quote-center",
      "title": "Quote Center",
      "description": "Create, review, send, and accept quotes",
      "version": "1.0.0",
      "workspace": "admin",
      "category": "sales",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🧾"
    },
    {
      "id": "reporting",
      "title": "Reporting",
      "description": "Operational dashboards and KPI reports",
      "version": "1.0.0",
      "workspace": "owner",
      "category": "analytics",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "📊"
    },
    {
      "id": "scheduling",
      "title": "Scheduling",
      "description": "Schedule crews, jobs, and visits",
      "version": "1.0.0",
      "workspace": "manager",
      "category": "operations",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "📅"
    },
    {
      "id": "square-integration",
      "title": "Square Integration",
      "description": "Secure Square payment link and webhook support",
      "version": "1.0.0",
      "workspace": "admin",
      "category": "payments",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "⬛"
    },
    {
      "id": "theme-manager",
      "title": "Theme Manager",
      "description": "Control light, dark, system themes and sidebar colors",
      "version": "1.0.0",
      "workspace": "owner",
      "category": "settings",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🎨"
    },
    {
      "id": "work-orders",
      "title": "Work Orders",
      "description": "Manage the full job workflow",
      "version": "1.0.0",
      "workspace": "admin",
      "category": "operations",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🛠️"
    },
    {
      "id": "worker-dashboard",
      "title": "Worker Dashboard",
      "description": "Worker job queue and completion flow",
      "version": "1.0.0",
      "workspace": "worker",
      "category": "dashboard",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🧰"
    },
    {
      "id": "workflow-engine",
      "title": "Workflow Engine",
      "description": "Single-source job state machine",
      "version": "1.0.0",
      "workspace": "admin",
      "category": "platform",
      "enabledByDefault": true,
      "dependencies": [],
      "icon": "🔁"
    }
  ],
  "homepageSections": [
    {
      "id": "hero",
      "title": "Hero",
      "moduleId": "homepage-editor"
    },
    {
      "id": "services",
      "title": "Services",
      "moduleId": "homepage-editor"
    },
    {
      "id": "gallery",
      "title": "Gallery",
      "moduleId": "homepage-editor"
    },
    {
      "id": "contact",
      "title": "Contact",
      "moduleId": "homepage-editor"
    }
  ],
  "installerSteps": [
    {
      "step": "welcome",
      "moduleId": "installer"
    },
    {
      "step": "license",
      "moduleId": "installer"
    },
    {
      "step": "environment",
      "moduleId": "installer"
    },
    {
      "step": "database",
      "moduleId": "installer"
    },
    {
      "step": "company",
      "moduleId": "installer"
    },
    {
      "step": "logo",
      "moduleId": "installer"
    },
    {
      "step": "branding",
      "moduleId": "installer"
    },
    {
      "step": "theme",
      "moduleId": "installer"
    },
    {
      "step": "sidebar",
      "moduleId": "installer"
    },
    {
      "step": "owner",
      "moduleId": "installer"
    },
    {
      "step": "email",
      "moduleId": "installer"
    },
    {
      "step": "homepage",
      "moduleId": "installer"
    },
    {
      "step": "modules",
      "moduleId": "installer"
    },
    {
      "step": "permissions",
      "moduleId": "installer"
    },
    {
      "step": "square",
      "moduleId": "installer"
    },
    {
      "step": "ai",
      "moduleId": "installer"
    },
    {
      "step": "review",
      "moduleId": "installer"
    },
    {
      "step": "complete",
      "moduleId": "installer"
    }
  ]
};
export default registry;
