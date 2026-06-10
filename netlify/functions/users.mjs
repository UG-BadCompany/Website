import { 
  listUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  assignRoleToUser, 
  removeRoleFromUser,
  getSessionFromToken
} from './lib/db.mjs';
import { successResponse, errorResponse, requireAuth } from './lib/response.mjs';

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
    
    // GET /api/users - List all users
    if (httpMethod === 'GET' && pathParts.length === 2) {
      const users = await listUsers();
      return successResponse(users);
    }

    // GET /api/users/:id - Get user by ID
    if (httpMethod === 'GET' && pathParts.length === 3) {
      const userId = parseInt(pathParts[2]);
      const user = await getUserById(userId);
      if (!user) {
        return errorResponse('User not found', 404);
      }
      return successResponse(user);
    }

    // POST /api/users - Create new user
    if (httpMethod === 'POST' && pathParts.length === 2) {
      const body = JSON.parse(event.body || '{}');
      const { fullName, email, phone, roles } = body;

      if (!fullName || !email) {
        return errorResponse('Full name and email are required', 400);
      }

      const user = await createUser({ fullName, email, phone });

      // Assign roles if provided
      if (roles && Array.isArray(roles)) {
        for (const roleSlug of roles) {
          await assignRoleToUser(user.id, roleSlug);
        }
      }

      const fullUser = await getUserById(user.id);
      return successResponse(fullUser, 201);
    }

    // PUT /api/users/:id - Update user
    if (httpMethod === 'PUT' && pathParts.length === 3) {
      const userId = parseInt(pathParts[2]);
      const body = JSON.parse(event.body || '{}');
      
      const user = await updateUser(userId, body);
      if (!user) {
        return errorResponse('User not found', 404);
      }

      const fullUser = await getUserById(userId);
      return successResponse(fullUser);
    }

    // POST /api/users/:id/roles/assign - Assign role to user
    if (httpMethod === 'POST' && pathParts.length === 5 && pathParts[3] === 'roles' && pathParts[4] === 'assign') {
      const userId = parseInt(pathParts[2]);
      const body = JSON.parse(event.body || '{}');
      const { roleSlug } = body;

      if (!roleSlug) {
        return errorResponse('Role slug is required', 400);
      }

      await assignRoleToUser(userId, roleSlug);
      return successResponse({ success: true });
    }

    // POST /api/users/:id/roles/remove - Remove role from user
    if (httpMethod === 'POST' && pathParts.length === 5 && pathParts[3] === 'roles' && pathParts[4] === 'remove') {
      const userId = parseInt(pathParts[2]);
      const body = JSON.parse(event.body || '{}');
      const { roleSlug } = body;

      if (!roleSlug) {
        return errorResponse('Role slug is required', 400);
      }

      await removeRoleFromUser(userId, roleSlug);
      return successResponse({ success: true });
    }

    // POST /api/users/:id/reset-login - Reset user login (revoke all sessions)
    if (httpMethod === 'POST' && pathParts.length === 4 && pathParts[3] === 'reset-login') {
      const userId = parseInt(pathParts[2]);
      
      // Revoke all sessions for this user
      await query(`update auth_sessions set revoked_at=now() where user_id=$1 and revoked_at is null`, [userId]);
      
      return successResponse({ success: true });
    }

    return errorResponse('Not found', 404);

  } catch (error) {
    console.error('Users API error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

// Made with Bob
