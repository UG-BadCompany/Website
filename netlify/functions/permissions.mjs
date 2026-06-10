import { query, getSessionFromToken } from './lib/db.mjs';
import { successResponse, errorResponse } from './lib/response.mjs';
import { permissions as allPermissions } from './lib/platformData.mjs';

export async function handler(event) {
  // CORS headers
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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
    
    // GET /api/permissions - List all permissions
    if (httpMethod === 'GET' && pathParts.length === 2) {
      const permissions = await query(`select id, slug, description, created_at from permissions order by slug`);
      return successResponse(permissions);
    }

    // GET /api/permissions/available - Get all available permissions (from platformData)
    if (httpMethod === 'GET' && pathParts.length === 3 && pathParts[2] === 'available') {
      const grouped = {};
      
      allPermissions.forEach(perm => {
        const [module, action] = perm.split('.');
        if (!grouped[module]) {
          grouped[module] = [];
        }
        grouped[module].push({ slug: perm, action });
      });

      return successResponse(grouped);
    }

    // GET /api/permissions/role/:roleSlug - Get permissions for a specific role
    if (httpMethod === 'GET' && pathParts.length === 4 && pathParts[2] === 'role') {
      const roleSlug = pathParts[3];
      
      const permissions = await query(
        `select p.slug, p.description 
         from permissions p 
         join role_permissions rp on rp.permission_id = p.id 
         join roles r on r.id = rp.role_id 
         where r.slug = $1 
         order by p.slug`,
        [roleSlug]
      );

      return successResponse(permissions);
    }

    // GET /api/permissions/user/:userId - Get permissions for a specific user
    if (httpMethod === 'GET' && pathParts.length === 4 && pathParts[2] === 'user') {
      const userId = parseInt(pathParts[3]);
      
      const permissions = await query(
        `select distinct p.slug, p.description 
         from permissions p 
         join role_permissions rp on rp.permission_id = p.id 
         join user_roles ur on ur.role_id = rp.role_id 
         where ur.user_id = $1 
         order by p.slug`,
        [userId]
      );

      return successResponse(permissions);
    }

    // POST /api/permissions/check - Check if user has specific permission
    if (httpMethod === 'POST' && pathParts.length === 3 && pathParts[2] === 'check') {
      const body = JSON.parse(event.body || '{}');
      const { userId, permissionSlug } = body;

      if (!userId || !permissionSlug) {
        return errorResponse('userId and permissionSlug are required', 400);
      }

      const result = await query(
        `select exists(
          select 1 from permissions p 
          join role_permissions rp on rp.permission_id = p.id 
          join user_roles ur on ur.role_id = rp.role_id 
          where ur.user_id = $1 and p.slug = $2
        ) as has_permission`,
        [userId, permissionSlug]
      );

      return successResponse({ 
        hasPermission: result[0]?.has_permission || false,
        userId,
        permissionSlug
      });
    }

    return errorResponse('Not found', 404);

  } catch (error) {
    console.error('Permissions API error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

// Made with Bob
