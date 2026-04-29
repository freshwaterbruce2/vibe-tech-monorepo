import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { getDb } from '../database';
import { users } from '../database/schema';
import { logger } from '../utils/logger';

// Define JWT payload type
interface AuthJWTPayload extends JwtPayload {
	id: string;
	email: string;
	tokenVersion?: number;
}

// Extend Express Request interface to include user data
declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
				email: string;
				firstName: string;
				lastName: string;
				role: string;
				isAdmin: boolean;
			};
		}
	}
}

export const authenticate = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		// Get token from Authorization header
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			res.status(401).json({
				error: 'Authentication Error',
				message: 'No valid authentication token provided',
			});
			return;
		}

		const token = authHeader.substring(7); // Remove 'Bearer ' prefix

		// Verify JWT token
		let decoded: AuthJWTPayload;
		try {
			const verified = jwt.verify(token, config.jwt.secret);

			// Type guard to ensure decoded JWT has required fields
			if (typeof verified === 'string' || !('id' in verified)) {
				res.status(401).json({
					error: 'Authentication Error',
					message: 'Invalid token structure',
				});
				return;
			}

			decoded = verified as AuthJWTPayload;
		} catch (_jwtError) {
			return res.status(401).json({
				error: 'Authentication Error',
				message: 'Invalid or expired token',
			});
		}

		// Get user from database to ensure they still exist and are active
		const db = getDb();
		const [user] = await db
			.select({
				id: users.id,
				email: users.email,
				firstName: users.firstName,
				lastName: users.lastName,
				role: users.role,
				isActive: users.isActive,
				tokenVersion: users.tokenVersion,
			})
			.from(users)
			.where(eq(users.id, decoded.id))
			.limit(1);

		if (!user) {
			res.status(401).json({
				error: 'Authentication Error',
				message: 'User not found',
			});
			return;
		}

		if (!user.isActive) {
			res.status(401).json({
				error: 'Authentication Error',
				message: 'Account has been deactivated',
			});
			return;
		}

		// Check token version (for logout all functionality)
		if (
			decoded.tokenVersion !== undefined &&
			decoded.tokenVersion !== (user.tokenVersion || 0)
		) {
			res.status(401).json({
				error: 'Authentication Error',
				message: 'Token has been invalidated',
			});
			return;
		}

		// Attach user data to request
		req.user = {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
			isAdmin: user.role === 'admin' || user.role === 'super_admin',
		};

		return next();
	} catch (error) {
		logger.error('Authentication middleware error', { error });
		res.status(500).json({
			error: 'Authentication Error',
			message: 'Authentication failed',
		});
		return;
	}
};

// Optional authentication - continues even if no token provided
export const optionalAuthenticate = async (
	req: Request,
	_res: Response,
	next: NextFunction,
) => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return next(); // Continue without authentication
		}

		const token = authHeader.substring(7);

		try {
			const verified = jwt.verify(token, config.jwt.secret);

			// Type guard to ensure decoded JWT has required fields
			if (typeof verified === 'string' || !('id' in verified)) {
				return next(); // Continue without authentication if token structure is invalid
			}

			const decoded = verified as AuthJWTPayload;

			const db = getDb();
			const [user] = await db
				.select({
					id: users.id,
					email: users.email,
					firstName: users.firstName,
					lastName: users.lastName,
					role: users.role,
					isActive: users.isActive,
					tokenVersion: users.tokenVersion,
				})
				.from(users)
				.where(eq(users.id, decoded.id))
				.limit(1);

			if (
				user &&
				user.isActive &&
				(decoded.tokenVersion === undefined ||
					decoded.tokenVersion === (user.tokenVersion || 0))
			) {
				req.user = {
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
					isAdmin: user.role === 'admin' || user.role === 'super_admin',
				};
			}
		} catch (_jwtError) {
			// Invalid token, but continue without authentication
			return next();
		}

		return next();
	} catch (error) {
		logger.error('Optional authentication middleware error', { error });
		return next(); // Continue even on error
	}
};

// Admin role required
export const requireAdmin = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	if (!req.user) {
		res.status(401).json({
			error: 'Authentication Error',
			message: 'Authentication required',
		});
		return;
	}

	if (!req.user.isAdmin) {
		res.status(403).json({
			error: 'Authorization Error',
			message: 'Admin access required',
		});
		return;
	}

	next();
};

// Role-based authorization
export const requireRole = (roles: string[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!req.user) {
			res.status(401).json({
				error: 'Authentication Error',
				message: 'Authentication required',
			});
			return;
		}

		if (!roles.includes(req.user.role)) {
			res.status(403).json({
				error: 'Authorization Error',
				message: `One of the following roles is required: ${roles.join(', ')}`,
			});
			return;
		}

		next();
	};
};

// Rate limiting based on user ID
export const createUserRateLimit = (maxRequests: number, windowMs: number) => {
	const userRequests = new Map<string, { count: number; resetTime: number }>();

	return (req: Request, res: Response, next: NextFunction) => {
		const userId =
			req.user?.id || req.ip || req.socket.remoteAddress || 'unknown';
		const now = Date.now();

		let userData = userRequests.get(userId);

		if (!userData || now > userData.resetTime) {
			userData = {
				count: 1,
				resetTime: now + windowMs,
			};
			userRequests.set(userId, userData);
			return next();
		}

		if (userData.count >= maxRequests) {
			res.status(429).json({
				error: 'Rate Limit Exceeded',
				message: 'Too many requests. Please try again later.',
				retryAfter: Math.ceil((userData.resetTime - now) / 1000),
			});
			return;
		}

		userData.count++;
		return next();
	};
};
