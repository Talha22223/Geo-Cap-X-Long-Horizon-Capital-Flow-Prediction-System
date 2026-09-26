/**
 * ============================================================================
 * GEOCAP-X SHARED LIBRARY PACKAGE (@geocap-x/shared)
 * ============================================================================
 * WHAT:
 *   Shared types, interfaces, enums, and Zod validation schemas reused across:
 *   - `apps/web`: Next.js 15 frontend client
 *   - `apps/api`: NestJS API gateway
 *
 * EXPORTS:
 *   - Auth: UserRole, UserPermission, JwtPayload, AuthenticatedUser
 *   - API: ApiResponse, PaginatedResponse, ApiError
 *   - Schemas: loginSchema, registerSchema, createApiKeySchema
 * ============================================================================
 */

export * from './types/auth.js';
export * from './types/api.js';
export * from './schemas/auth.js';
export * from './schemas/api.js';

