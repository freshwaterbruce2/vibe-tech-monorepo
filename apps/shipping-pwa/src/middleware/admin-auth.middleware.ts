/**
 * Admin Authentication Middleware
 * Extracted from server.ts (lines 866-901)
 */

import type { NextFunction, Response } from 'express'

interface AdminAuthDependencies {
  adminManager: any // Will be typed when AdminService is extracted
}

export function createAdminAuthMiddleware(deps: AdminAuthDependencies) {
  return (req: any, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Admin ')) {
      res.status(401).json({
        error: 'Admin authentication required',
        message:
          'Please provide a valid admin token: Authorization: Admin <token>',
      })
      return
    }

    const token = authHeader.substring(6) // Remove 'Admin ' prefix
    const admin = deps.adminManager.validateSession(token)

    if (!admin) {
      res.status(401).json({
        error: 'Invalid or expired admin token',
        message: 'Please login again',
      })
      return
    }

    req.admin = admin
    next()
  }
}

export function createPermissionMiddleware(deps: AdminAuthDependencies) {
  return (permission: string) => {
    return (req: any, res: Response, next: NextFunction): void => {
      if (
        !req.admin ||
        !deps.adminManager.hasPermission(req.admin, permission)
      ) {
        res.status(403).json({
          error: 'Insufficient permissions',
          required: permission,
          message: 'You do not have permission to perform this action',
        })
        return
      }
      next()
    }
  }
}
