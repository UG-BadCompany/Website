import { 
  listRoles, 
  getRoleBySlug, 
  createRole, 
  updateRole, 
  deleteRole,
  assignPermissionToRole,
  removePermissionFromRole,
  getSessionFromToken
} from './lib/db.mjs';
import { successResponse, errorResponse } from './lib/response.mjs';

export async function handler(event) {
  // CORS headers
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Get session from cookie or Authorization header
    const cookies = event.headers.cookie || '';
    const sessionToken = cookies.split(';').find(c => c.trim().startsWith('session='))?.split('=')[1] ||
                        event.headers.authorization?.replace('Bearer ', '');

    const session = await getSessionFromToken(sessionToken);
    if (!session) {
      return errorResponse('Unauthorized', 401);
    }

    const { httpMethod, path } = event;
    const pathParts = path.split('/').filter(Boolean);
    
    // GET /api/roles - List all roles
    if (httpMethod === 'GET' && pathParts.length === 2) {
      const roles = await listRoles();
      return successResponse(roles);
    }

    // GET /api/roles/:slug - Get role by slug
    if (httpMethod === 'GET' && pathParts.length === 3) {
      const roleSlug = pathParts[2];
      const role = await getRoleBySlug(roleSlug);
      if (!role) {
        return errorResponse('Role not found', 404);
      }
      return successResponse(role);
    }

    // POST /api/roles - Create new role
    if (httpMethod === 'POST' && pathParts.length === 2) {
      const body = JSON.parse(event.body || '{}');
      const { slug, name, description } = body;

      if (!slug || !name) {
        return errorResponse('Slug and name are required', 400);
      }

      const role = await createRole({ slug, name, description });
      return successResponse(role, 201);
    }

    // PUT /api/roles/:slug - Update role
    if (httpMethod === 'PUT' && pathParts.length === 3) {
      const roleSlug = pathParts[2];
      const body = JSON.parse(event.body || '{}');
      
      const role = await updateRole(roleSlug, body);
      if (!role) {
        return errorResponse('Role not found or cannot be modified', 404);
      }

      return successResponse(role);
    }

    // DELETE /api/roles/:slug - Delete role
    if (httpMethod === 'DELETE' && pathParts.length === 3) {
      const roleSlug = pathParts[2];
      
      await deleteRole(roleSlug);
      return successResponse({ success: true });
    }

    // POST /api/roles/:slug/permissions/assign - Assign permission to role
    if (httpMethod === 'POST' && pathParts.length === 5 && pathParts[3] === 'permissions' && pathParts[4] === 'assign') {
      const roleSlug = pathParts[2];
      const body = JSON.parse(event.body || '{}');
      const { permissionSlug } = body;

      if (!permissionSlug) {
        return errorResponse('Permission slug is required', 400);
      }

      await assignPermissionToRole(roleSlug, permissionSlug);
      return successResponse({ success: true });
    }

    // POST /api/roles/:slug/permissions/remove - Remove permission from role
    if (httpMethod === 'POST' && pathParts.length === 5 && pathParts[3] === 'permissions' && pathParts[4] === 'remove') {
      const roleSlug = pathParts[2];
      const body = JSON.parse(event.body || '{}');
      const { permissionSlug } = body;

      if (!permissionSlug) {
        return errorResponse('Permission slug is required', 400);
      }

      await removePermissionFromRole(roleSlug, permissionSlug);
      return successResponse({ success: true });
    }

    return errorResponse('Not found', 404);

  } catch (error) {
    console.error('Roles API error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

// Made with Bob
