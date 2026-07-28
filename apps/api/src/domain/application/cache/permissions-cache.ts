export const PERMISSIONS_CACHE_PREFIX = 'permissions:user:'

export function permissionsCacheKey(userId: string): string {
  return `${PERMISSIONS_CACHE_PREFIX}${userId}`
}

export const PERMISSIONS_CACHE_PATTERN = `${PERMISSIONS_CACHE_PREFIX}*`
