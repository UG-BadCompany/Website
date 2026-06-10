# Users + Roles + Permissions System

## Overview

This document describes the comprehensive Users, Roles, and Permissions system that forms the foundation of the CMMS platform.

## System Architecture

### Core Components

1. **Users Management** - Full CRUD for user accounts
2. **Roles System** - System and custom role support
3. **Permissions Engine** - Granular access control
4. **Magic Login** - Passwordless authentication
5. **Session Management** - Secure session tracking
6. **Module Access Control** - Role-based module visibility

---

## Database Schema

### Tables

#### `app_users`
- `id` - Primary key
- `full_name` - User's full name
- `email` - Unique email address
- `phone` - Optional phone number
- `active` - Account status (true/false)
- `last_login` - Timestamp of last login
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

#### `roles`
- `id` - Primary key
- `slug` - Unique role identifier (e.g., 'owner', 'admin')
- `name` - Display name
- `description` - Role description
- `is_system` - System role flag (cannot be deleted)
- `created_at` - Creation timestamp

#### `permissions`
- `id` - Primary key
- `slug` - Permission identifier (e.g., 'customers.view')
- `description` - Permission description
- `created_at` - Creation timestamp

#### `role_permissions`
- `role_id` - Foreign key to roles
- `permission_id` - Foreign key to permissions
- Primary key: (role_id, permission_id)

#### `user_roles`
- `user_id` - Foreign key to app_users
- `role_id` - Foreign key to roles
- Primary key: (user_id, role_id)

#### `auth_sessions`
- `id` - Primary key
- `user_id` - Foreign key to app_users
- `token_hash` - Hashed session token
- `expires_at` - Session expiration
- `revoked_at` - Revocation timestamp (if revoked)
- `last_seen_at` - Last activity timestamp
- `metadata` - JSON metadata
- `created_at` - Creation timestamp

#### `user_sessions`
- `id` - Primary key
- `user_id` - Foreign key to app_users
- `token_hash` - Hashed session token
- `ip_address` - Client IP address
- `user_agent` - Client user agent
- `created_at` - Creation timestamp
- `expires_at` - Session expiration
- `last_activity` - Last activity timestamp

#### `magic_tokens`
- `id` - Primary key
- `user_id` - Foreign key to app_users
- `token_hash` - Hashed magic link token
- `expires_at` - Token expiration (15 minutes)
- `used_at` - Usage timestamp
- `metadata` - JSON metadata
- `created_at` - Creation timestamp

#### `licenses` (prepared for future)
- `id` - Primary key
- `license_key` - Unique license key
- `email` - License holder email
- `company_name` - Company name
- `expires_at` - License expiration
- `active` - License status
- `metadata` - JSON metadata
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

#### `license_modules` (prepared for future)
- `license_id` - Foreign key to licenses
- `module_id` - Module identifier
- `enabled` - Module enabled status
- Primary key: (license_id, module_id)

---

## System Roles

### Owner
**Full system access - Cannot be restricted**

Permissions: ALL

Capabilities:
- Full access to everything
- Cannot be deleted
- Can impersonate other roles
- Can manage licenses
- Can manage modules
- Can manage permissions
- Can manage all users

### Admin
**Nearly full access**

Permissions: Most permissions except owner-specific ones

Capabilities:
- Manage customers, requests, quotes, work orders
- Manage schedules and inventory
- Manage invoices and view finance
- Manage users (cannot delete owner)
- View and configure modules
- Manage theme and homepage
- View system settings and audit logs

Restrictions:
- Cannot delete owner
- Cannot change license settings
- Cannot use impersonation

### Manager
**Operations management**

Permissions: Operations-focused permissions

Capabilities:
- Manage customers and properties
- Manage requests and quotes
- Approve quotes
- Manage work orders and assign workers
- Manage schedules
- View inventory
- Create and edit invoices
- View finance reports
- View users

Restrictions:
- Cannot manage system settings
- Cannot manage users or roles
- Cannot manage modules

### Dispatcher
**Schedule and assignment management**

Permissions: Schedule-focused permissions

Capabilities:
- View customers
- View requests and quotes
- View and assign work orders
- Manage schedules
- View users
- View files

Restrictions:
- Cannot create or edit customers
- Cannot create quotes or invoices
- Cannot manage inventory
- Cannot access system settings

### Worker
**Field work execution**

Permissions: Work execution permissions

Capabilities:
- View assigned work orders
- Complete work orders
- Update work order statuses
- View schedule
- View inventory
- Upload photos and files

Restrictions:
- Can only see assigned work
- Cannot create or assign work orders
- Cannot access customer information
- Cannot access financial data
- Cannot access system settings

### Client
**Customer portal access**

Permissions: Customer-facing permissions

Capabilities:
- Submit service requests
- View quotes
- Approve quotes
- View invoices
- Make payments
- View finance (own data only)

Restrictions:
- Cannot access internal operations
- Cannot see other customers' data
- Cannot access system settings

### Guest
**Public website only**

Permissions: None

Capabilities:
- View public website
- No dashboard access

---

## Permission Structure

Permissions follow the format: `module.action`

### Permission Actions
- `view` - Read access
- `create` - Create new records
- `edit` - Modify existing records
- `delete` - Delete records
- `manage` - Full management access
- `assign` - Assign to users
- `approve` - Approval authority
- `complete` - Mark as complete

### Permission Modules
- `dashboard` - Dashboard access
- `customers` - Customer management
- `requests` - Service requests
- `quotes` - Quote management
- `workorders` - Work order management
- `schedule` - Schedule management
- `inventory` - Inventory management
- `invoices` - Invoice management
- `payments` - Payment processing
- `finance` - Financial reporting
- `users` - User management
- `roles` - Role management
- `permissions` - Permission management
- `modules` - Module management
- `theme` - Theme customization
- `homepage` - Homepage editing
- `system` - System settings
- `audit` - Audit log access
- `files` - File management
- `licensing` - License management
- `impersonation` - Role impersonation (Owner only)

---

## API Endpoints

### Users API (`/api/users`)

#### GET /api/users
List all users with their roles

#### GET /api/users/:id
Get specific user details

#### POST /api/users
Create new user
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "roles": ["worker"]
}
```

#### PUT /api/users/:id
Update user details
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "active": true
}
```

#### POST /api/users/:id/roles/assign
Assign role to user
```json
{
  "roleSlug": "manager"
}
```

#### POST /api/users/:id/roles/remove
Remove role from user
```json
{
  "roleSlug": "worker"
}
```

#### POST /api/users/:id/reset-login
Reset user's login (revoke all sessions)

### Roles API (`/api/roles`)

#### GET /api/roles
List all roles

#### GET /api/roles/:slug
Get specific role with permissions

#### POST /api/roles
Create custom role
```json
{
  "slug": "supervisor",
  "name": "Supervisor",
  "description": "Supervises workers"
}
```

#### PUT /api/roles/:slug
Update custom role (system roles cannot be modified)
```json
{
  "name": "Senior Supervisor",
  "description": "Updated description"
}
```

#### DELETE /api/roles/:slug
Delete custom role (system roles cannot be deleted)

#### POST /api/roles/:slug/permissions/assign
Assign permission to role
```json
{
  "permissionSlug": "workorders.assign"
}
```

#### POST /api/roles/:slug/permissions/remove
Remove permission from role
```json
{
  "permissionSlug": "workorders.delete"
}
```

### Permissions API (`/api/permissions`)

#### GET /api/permissions
List all permissions

#### GET /api/permissions/available
Get all available permissions grouped by module

#### GET /api/permissions/role/:roleSlug
Get permissions for specific role

#### GET /api/permissions/user/:userId
Get permissions for specific user

#### POST /api/permissions/check
Check if user has specific permission
```json
{
  "userId": 1,
  "permissionSlug": "customers.edit"
}
```

---

## Magic Login Flow

1. User enters email on login page
2. System generates magic token (32 bytes, base64url encoded)
3. Token is hashed (SHA-256) and stored in database
4. Magic link email sent to user (token in URL)
5. User clicks link
6. System verifies token (not used, not expired)
7. Token marked as used
8. Session created (7-day expiration)
9. Session token stored in cookie
10. User redirected to dashboard

### Session Management

- Sessions expire after 7 days
- Last activity tracked on each request
- Sessions can be revoked individually
- All sessions can be revoked (reset login)
- IP address and user agent tracked
- Session tokens are hashed before storage

---

## Module Access Control

Modules can specify `allowed_roles` in the database:

```sql
UPDATE module_registry 
SET allowed_roles = '["owner", "admin", "manager"]'::jsonb 
WHERE id = 'inventory';
```

If `allowed_roles` is empty or null, module is available to all authenticated users.

The sidebar automatically filters modules based on user's roles.

---

## Implementation Status

### ✅ Completed

1. Database schema with all tables
2. System roles (Owner, Admin, Manager, Dispatcher, Worker, Client, Guest)
3. Comprehensive permission system (90+ permissions)
4. Users CRUD module
5. Roles management API
6. Permissions API
7. Enhanced magic login with session tracking
8. User management functions in db.mjs
9. Role management functions in db.mjs
10. Permission checking functions in db.mjs
11. License system database structure (prepared)

### 🚧 In Progress

1. Permissions management UI
2. Role-based sidebar filtering in app.js
3. Route protection middleware
4. API protection middleware

### 📋 Pending

1. "View As Role" testing feature for Owner
2. Update installer to create default roles
3. Session management UI
4. Active sessions viewer
5. Login history viewer
6. Comprehensive testing
7. Documentation completion

---

## Security Considerations

1. **Token Hashing**: All tokens (magic links, sessions) are hashed before storage
2. **Session Expiration**: Sessions automatically expire after 7 days
3. **Token Expiration**: Magic links expire after 15 minutes
4. **One-Time Use**: Magic tokens can only be used once
5. **System Role Protection**: System roles cannot be deleted or have slug changed
6. **Owner Protection**: Owner role has all permissions and cannot be restricted
7. **Session Tracking**: IP address and user agent tracked for security auditing
8. **Last Login Tracking**: User's last login timestamp updated on each login

---

## Future Enhancements

1. **Two-Factor Authentication**: Add optional 2FA
2. **Password Option**: Allow password-based login as alternative
3. **Session Limits**: Limit concurrent sessions per user
4. **Device Management**: Allow users to view and revoke devices
5. **Permission Templates**: Pre-configured permission sets
6. **Role Cloning**: Clone existing roles to create new ones
7. **Audit Trail**: Detailed audit log for all permission changes
8. **License Enforcement**: Activate license system with API validation
9. **Module Marketplace**: Allow installing additional modules
10. **SSO Integration**: Support SAML/OAuth for enterprise

---

## Database Functions Reference

### User Management
- `getUserById(userId)` - Get user with roles and permissions
- `getUserByEmail(email)` - Get user by email
- `listUsers(filters)` - List users with optional filters
- `createUser(userData)` - Create new user
- `updateUser(userId, userData)` - Update user
- `updateUserLastLogin(userId)` - Update last login timestamp
- `assignRoleToUser(userId, roleSlug)` - Assign role
- `removeRoleFromUser(userId, roleSlug)` - Remove role

### Role Management
- `listRoles()` - List all roles
- `getRoleBySlug(slug)` - Get role with permissions
- `createRole(roleData)` - Create custom role
- `updateRole(roleSlug, roleData)` - Update custom role
- `deleteRole(roleSlug)` - Delete custom role
- `assignPermissionToRole(roleSlug, permissionSlug)` - Assign permission
- `removePermissionFromRole(roleSlug, permissionSlug)` - Remove permission

### Permission Checking
- `userHasPermission(userId, permissionSlug)` - Check single permission
- `userHasRole(userId, roleSlug)` - Check if user has role
- `getUserPermissions(userId)` - Get all user permissions
- `getModulesForUser(userId)` - Get accessible modules

### Session Management
- `createMagicLoginToken(email, metadata)` - Create magic link
- `verifyMagicLoginToken(token, metadata)` - Verify and create session
- `getSessionFromToken(token)` - Get session details
- `revokeSessionToken(token)` - Revoke specific session

---

## Testing Checklist

- [ ] Owner can create users
- [ ] Owner can assign roles
- [ ] Owner can modify permissions
- [ ] Owner can view as other roles
- [ ] Admin cannot delete owner
- [ ] Admin cannot change license
- [ ] Manager can manage operations
- [ ] Dispatcher can assign work
- [ ] Worker sees only assigned work
- [ ] Client sees only client modules
- [ ] Guest has no dashboard access
- [ ] Sidebar filters by role
- [ ] Routes are protected
- [ ] APIs are protected
- [ ] Sessions expire correctly
- [ ] Magic links work
- [ ] Magic links expire
- [ ] Sessions can be revoked
- [ ] Last login updates
- [ ] System roles cannot be deleted
- [ ] Custom roles can be created
- [ ] Custom roles can be deleted
- [ ] Permissions can be assigned
- [ ] Permissions can be removed
- [ ] Module access respects roles

---

## Conclusion

This Users + Roles + Permissions system provides a solid foundation for the entire CMMS platform. Every feature built on top of this system will automatically inherit proper access control, ensuring security and proper role separation throughout the application.

The system is designed to be:
- **Secure**: Token hashing, session management, permission checking
- **Flexible**: Custom roles, granular permissions, module access control
- **Scalable**: Prepared for licensing, multi-tenant support
- **User-Friendly**: Magic login, intuitive role management
- **Maintainable**: Clear separation of concerns, comprehensive documentation
