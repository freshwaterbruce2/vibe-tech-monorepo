import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { getDb } from '../database';
import { type NewUser, users } from '../database/schema';
import { validateRequest } from '../middleware/validateRequest';
import { emailService } from '../services/emailService.js';
import { logger } from '../utils/logger';

export const authRouter = Router();

// Validation schemas
const registerSchema = z.object({
	firstName: z.string().min(1).max(100),
	lastName: z.string().min(1).max(100),
	email: z.string().email(),
	password: z.string().min(8).max(100),
	phone: z.string().min(5).max(20).optional(),
	acceptTerms: z.boolean().refine((val) => val === true, {
		message: 'You must accept the terms and conditions',
	}),
});

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
	rememberMe: z.boolean().default(false),
});

const refreshTokenSchema = z.object({
	refreshToken: z.string(),
});

const forgotPasswordSchema = z.object({
	email: z.string().email(),
});

const resetPasswordSchema = z.object({
	token: z.string(),
	password: z.string().min(8).max(100),
});

const changePasswordSchema = z.object({
	currentPassword: z.string(),
	newPassword: z.string().min(8).max(100),
});

// Helper functions
const generateTokens = (user: any): { accessToken: string; refreshToken: string } => {
	const accessTokenOptions: SignOptions = {
		expiresIn: config.jwt.expiresIn,
	};

	const accessToken = jwt.sign(
		{
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
		},
		config.jwt.secret,
		accessTokenOptions,
	) as string;

	const refreshTokenOptions: SignOptions = {
		expiresIn: config.jwt.refreshExpiresIn,
	};

	const refreshToken = jwt.sign(
		{
			id: user.id,
			tokenVersion: user.tokenVersion || 0,
		},
		config.jwt.refreshSecret,
		refreshTokenOptions,
	) as string;

	return { accessToken, refreshToken };
};

const hashPassword = async (password: string): Promise<string> => {
	return await bcrypt.hash(password, 12);
};

const verifyPassword = async (
	password: string,
	hashedPassword: string,
): Promise<boolean> => {
	return await bcrypt.compare(password, hashedPassword);
};

// POST /api/auth/register - User registration
authRouter.post(
	'/register',
	validateRequest(registerSchema),
	async (req, res) => {
		try {
			const { firstName, lastName, email, password, phone } = req.body;

			const db = getDb();

			// Check if user already exists
			const [existingUser] = await db
				.select()
				.from(users)
				.where(eq(users.email, email.toLowerCase()))
				.limit(1);

			if (existingUser) {
				return res.status(400).json({
					error: 'Registration Error',
					message: 'A user with this email already exists',
				});
			}

			// Hash password
			const hashedPassword = await hashPassword(password);

			// Create user
			const newUser: NewUser = {
				firstName,
				lastName,
				email: email.toLowerCase(),
				passwordHash: hashedPassword,
				phone,
				role: 'user',
				emailVerified: false,
				preferences: {},
				metadata: {
					registrationIp: req.ip,
					registrationUserAgent: req.get('User-Agent'),
				},
			};

			const [createdUser] = await db.insert(users).values(newUser).returning({
				id: users.id,
				firstName: users.firstName,
				lastName: users.lastName,
				email: users.email,
				role: users.role,
				emailVerified: users.emailVerified,
				createdAt: users.createdAt,
			});

			// Generate tokens
			const { accessToken, refreshToken } = generateTokens(createdUser);

			logger.info('User registered successfully', {
				userId: createdUser.id,
				email: createdUser.email,
			});

			res.status(201).json({
				success: true,
				data: {
					user: createdUser,
					accessToken,
					refreshToken,
				},
			});
			return;
		} catch (error) {
			logger.error('User registration failed', { error, body: req.body });
			res.status(500).json({
				error: 'Registration Error',
				message: 'Failed to create account. Please try again.',
			});
		}
	},
);

// POST /api/auth/login - User login
authRouter.post('/login', validateRequest(loginSchema), async (req, res) => {
	try {
		const { email, password, rememberMe } = req.body;

		const db = getDb();

		// Find user by email
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.email, email.toLowerCase()))
			.limit(1);

		if (!user) {
			return res.status(401).json({
				error: 'Authentication Error',
				message: 'Invalid email or password',
			});
		}

		// Verify password
		const isValidPassword = await verifyPassword(password, user.passwordHash);
		if (!isValidPassword) {
			return res.status(401).json({
				error: 'Authentication Error',
				message: 'Invalid email or password',
			});
		}

		// Check if account is active
		if (!user.isActive) {
			return res.status(401).json({
				error: 'Authentication Error',
				message: 'Your account has been deactivated',
			});
		}

		// Update last login
		await db
			.update(users)
			.set({
				lastLoginAt: new Date(),
				metadata: {
					...user.metadata,
					lastLoginIp: req.ip,
					lastLoginUserAgent: req.get('User-Agent'),
				},
				updatedAt: new Date(),
			})
			.where(eq(users.id, user.id));

		// Generate tokens
		const { accessToken, refreshToken } = generateTokens(user);

		const userResponse = {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			role: user.role,
			emailVerified: user.emailVerified,
			lastLoginAt: new Date(),
		};

		logger.info('User logged in successfully', {
			userId: user.id,
			email: user.email,
			rememberMe,
		});

		res.json({
			success: true,
			data: {
				user: userResponse,
				accessToken,
				refreshToken,
			},
		});
		return;
	} catch (error) {
		logger.error('User login failed', { error, body: req.body });
		res.status(500).json({
			error: 'Authentication Error',
			message: 'Login failed. Please try again.',
		});
	}
});

// POST /api/auth/refresh - Refresh access token
authRouter.post(
	'/refresh',
	validateRequest(refreshTokenSchema),
	async (req, res) => {
		try {
			const { refreshToken } = req.body;

			// Verify refresh token
			let decoded: any;
			try {
				decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
			} catch (_jwtError) {
				return res.status(401).json({
					error: 'Authentication Error',
					message: 'Invalid refresh token',
				});
			}

			const db = getDb();

			// Get user
			const [user] = await db
				.select()
				.from(users)
				.where(eq(users.id, decoded.id))
				.limit(1);

			if (!user || !user.isActive) {
				return res.status(401).json({
					error: 'Authentication Error',
					message: 'User not found or inactive',
				});
			}

			// Check token version (for logout all functionality)
			if (decoded.tokenVersion !== (user.tokenVersion || 0)) {
				return res.status(401).json({
					error: 'Authentication Error',
					message: 'Token has been invalidated',
				});
			}

			// Generate new tokens
			const tokens = generateTokens(user);

			const userResponse = {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				role: user.role,
				emailVerified: user.emailVerified,
			};

			res.json({
				success: true,
				data: {
					user: userResponse,
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
				},
			});
			return;
		} catch (error) {
			logger.error('Token refresh failed', { error });
			res.status(500).json({
				error: 'Authentication Error',
				message: 'Failed to refresh token',
			});
		}
	},
);

// POST /api/auth/logout - Logout user
authRouter.post('/logout', async (req, res) => {
	try {
		// For JWT-based auth, logout is handled client-side by removing tokens
		// If you want to invalidate tokens server-side, you could:
		// 1. Maintain a blacklist of tokens
		// 2. Increment user's tokenVersion to invalidate all refresh tokens

		res.json({
			success: true,
			message: 'Logged out successfully',
		});
		return;
	} catch (error) {
		logger.error('Logout failed', { error });
		res.status(500).json({
			error: 'Logout Error',
			message: 'Failed to logout',
		});
	}
});

// POST /api/auth/logout-all - Logout from all devices
authRouter.post('/logout-all', async (req, res) => {
	try {
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({
				error: 'Authentication Error',
				message: 'User not authenticated',
			});
		}

		const db = getDb();

		// Increment token version to invalidate all refresh tokens
		await db
			.update(users)
			.set({
				tokenVersion: sql`COALESCE(token_version, 0) + 1`,
				updatedAt: new Date(),
			})
			.where(eq(users.id, userId));

		logger.info('User logged out from all devices', { userId });

		res.json({
			success: true,
			message: 'Logged out from all devices successfully',
		});
		return;
	} catch (error) {
		logger.error('Logout all failed', { error });
		res.status(500).json({
			error: 'Logout Error',
			message: 'Failed to logout from all devices',
		});
	}
});

// POST /api/auth/forgot-password - Request password reset
authRouter.post(
	'/forgot-password',
	validateRequest(forgotPasswordSchema),
	async (req, res) => {
		try {
			const { email } = req.body;

			const db = getDb();

			// Find user
			const [user] = await db
				.select()
				.from(users)
				.where(eq(users.email, email.toLowerCase()))
				.limit(1);

			// Always return success to prevent email enumeration
			if (!user) {
				return res.json({
					success: true,
					message:
						'If an account with that email exists, a password reset link has been sent',
				});
			}

			// Generate reset token
			const resetToken = jwt.sign(
				{ userId: user.id, email: user.email },
				config.jwt.resetSecret,
				{ expiresIn: '1h' },
			);

			// Update user with reset token
			await db
				.update(users)
				.set({
					passwordResetToken: resetToken,
					passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour
					updatedAt: new Date(),
				})
				.where(eq(users.id, user.id));

			// Send password reset email
			await emailService.sendPasswordReset(user.email, resetToken, user.email);

			logger.info('Password reset requested', {
				userId: user.id,
				email: user.email,
			});

			res.json({
				success: true,
				message:
					'If an account with that email exists, a password reset link has been sent',
			});
			return;
		} catch (error) {
			logger.error('Password reset request failed', { error });
			res.status(500).json({
				error: 'Reset Error',
				message: 'Failed to process password reset request',
			});
		}
	},
);

// POST /api/auth/reset-password - Reset password with token
authRouter.post(
	'/reset-password',
	validateRequest(resetPasswordSchema),
	async (req, res) => {
		try {
			const { token, password } = req.body;

			// Verify reset token
			let decoded: any;
			try {
				decoded = jwt.verify(token, config.jwt.resetSecret);
			} catch (_jwtError) {
				return res.status(400).json({
					error: 'Reset Error',
					message: 'Invalid or expired reset token',
				});
			}

			const db = getDb();

			// Find user and verify token
			const [user] = await db
				.select()
				.from(users)
				.where(eq(users.id, decoded.userId))
				.limit(1);

			if (!user || user.passwordResetToken !== token) {
				return res.status(400).json({
					error: 'Reset Error',
					message: 'Invalid or expired reset token',
				});
			}

			// Check if token is expired
			if (
				!user.passwordResetExpires ||
				new Date() > user.passwordResetExpires
			) {
				return res.status(400).json({
					error: 'Reset Error',
					message: 'Reset token has expired',
				});
			}

			// Hash new password
			const hashedPassword = await hashPassword(password);

			// Update user password and clear reset token
			await db
				.update(users)
				.set({
					passwordHash: hashedPassword,
					passwordResetToken: null,
					passwordResetExpires: null,
					tokenVersion: sql`COALESCE(token_version, 0) + 1`, // Invalidate existing sessions
					updatedAt: new Date(),
				})
				.where(eq(users.id, user.id));

			logger.info('Password reset completed', {
				userId: user.id,
				email: user.email,
			});

			res.json({
				success: true,
				message: 'Password reset successfully',
			});
			return;
		} catch (error) {
			logger.error('Password reset failed', { error });
			res.status(500).json({
				error: 'Reset Error',
				message: 'Failed to reset password',
			});
		}
	},
);

// POST /api/auth/change-password - Change password (authenticated)
authRouter.post(
	'/change-password',
	validateRequest(changePasswordSchema),
	async (req, res) => {
		try {
			const userId = req.user?.id;
			const { currentPassword, newPassword } = req.body;

			if (!userId) {
				return res.status(401).json({
					error: 'Authentication Error',
					message: 'User not authenticated',
				});
			}

			const db = getDb();

			// Get user
			const [user] = await db
				.select()
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			if (!user) {
				return res.status(404).json({
					error: 'User Error',
					message: 'User not found',
				});
			}

			// Verify current password
			const isValidPassword = await verifyPassword(
				currentPassword,
				user.passwordHash,
			);
			if (!isValidPassword) {
				return res.status(400).json({
					error: 'Authentication Error',
					message: 'Current password is incorrect',
				});
			}

			// Hash new password
			const hashedPassword = await hashPassword(newPassword);

			// Update password
			await db
				.update(users)
				.set({
					passwordHash: hashedPassword,
					updatedAt: new Date(),
				})
				.where(eq(users.id, userId));

			logger.info('Password changed successfully', {
				userId: user.id,
				email: user.email,
			});

			res.json({
				success: true,
				message: 'Password changed successfully',
			});
			return;
		} catch (error) {
			logger.error('Password change failed', { error });
			res.status(500).json({
				error: 'Change Password Error',
				message: 'Failed to change password',
			});
		}
	},
);

// GET /api/auth/me - Get current user info
authRouter.get('/me', async (req, res) => {
	try {
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({
				error: 'Authentication Error',
				message: 'User not authenticated',
			});
		}

		const db = getDb();

		const [user] = await db
			.select({
				id: users.id,
				firstName: users.firstName,
				lastName: users.lastName,
				email: users.email,
				phone: users.phone,
				role: users.role,
				emailVerified: users.emailVerified,
				preferences: users.preferences,
				createdAt: users.createdAt,
				lastLoginAt: users.lastLoginAt,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!user) {
			res.status(404).json({
				error: 'User Error',
				message: 'User not found',
			});
			return;
		}

		res.json({
			success: true,
			data: {
				user,
			},
		});
		return;
	} catch (error) {
		logger.error('Failed to get user info', { error });
		res.status(500).json({
			error: 'User Error',
			message: 'Failed to get user information',
		});
	}
});
