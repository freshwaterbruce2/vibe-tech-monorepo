import { and, count, desc, eq, gte, lt, ne, or, sql, sum } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../database';
import { bookings, users } from '../database/schema';
import { validateRequest } from '../middleware/validateRequest';
import { logger } from '../utils/logger';

export const usersRouter = Router();

// Validation schemas
const updateProfileSchema = z.object({
	firstName: z.string().min(1).max(100).optional(),
	lastName: z.string().min(1).max(100).optional(),
	phone: z.string().min(5).max(20).optional(),
	preferences: z.record(z.string(), z.any()).optional(),
});

const updatePreferencesSchema = z.object({
	theme: z.enum(['light', 'dark', 'system']).optional(),
	language: z.string().min(2).max(5).optional(),
	currency: z.string().length(3).optional(),
	notifications: z
		.object({
			email: z.boolean().optional(),
			sms: z.boolean().optional(),
			push: z.boolean().optional(),
			marketing: z.boolean().optional(),
		})
		.optional(),
	travel: z
		.object({
			preferredPassions: z.array(z.string()).optional(),
			priceRange: z
				.object({
					min: z.number().min(0).optional(),
					max: z.number().min(0).optional(),
				})
				.optional(),
			starRating: z.array(z.number().min(1).max(5)).optional(),
			amenities: z.array(z.string()).optional(),
		})
		.optional(),
});

// GET /api/users/profile - Get user profile
usersRouter.get('/profile', async (req, res) => {
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
				updatedAt: users.updatedAt,
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

		// Get user statistics
		const [bookingStats] = await db
			.select({
				totalBookings: count(),
			})
			.from(bookings)
			.where(eq(bookings.userId, userId));

		const [recentBookings] = await db
			.select({
				count: count(),
			})
			.from(bookings)
			.where(eq(bookings.userId, userId))
			.where(
				gte(
					bookings.createdAt,
					new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
				),
			); // Last year

		return res.json({
			success: true,
			data: {
				user,
				stats: {
					totalBookings: bookingStats?.totalBookings || 0,
					bookingsThisYear: recentBookings?.count || 0,
				},
			},
		});
	} catch (error) {
		logger.error('Failed to get user profile', { error, userId: req.user?.id });
		return res.status(500).json({
			error: 'Profile Error',
			message: 'Failed to get user profile',
		});
	}
});

// PUT /api/users/profile - Update user profile
usersRouter.put(
	'/profile',
	validateRequest(updateProfileSchema),
	async (req, res) => {
		try {
			const userId = req.user?.id;
			const updates = req.body;

			if (!userId) {
				return res.status(401).json({
					error: 'Authentication Error',
					message: 'User not authenticated',
				});
			}

			const db = getDb();

			// Get current user
			const [currentUser] = await db
				.select()
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			if (!currentUser) {
				res.status(404).json({
					error: 'User Error',
					message: 'User not found',
				});
				return;
			}

			// Prepare update data
			const updateData: any = {
				updatedAt: new Date(),
			};

			if (updates.firstName !== undefined) {
				updateData.firstName = updates.firstName;
			}

			if (updates.lastName !== undefined) {
				updateData.lastName = updates.lastName;
			}

			if (updates.phone !== undefined) {
				updateData.phone = updates.phone;
			}

			if (updates.preferences !== undefined) {
				updateData.preferences = {
					...currentUser.preferences,
					...updates.preferences,
				};
			}

			// Update user
			const [updatedUser] = await db
				.update(users)
				.set(updateData)
				.where(eq(users.id, userId))
				.returning({
					id: users.id,
					firstName: users.firstName,
					lastName: users.lastName,
					email: users.email,
					phone: users.phone,
					role: users.role,
					emailVerified: users.emailVerified,
					preferences: users.preferences,
					updatedAt: users.updatedAt,
				});

			logger.info('User profile updated', {
				userId,
				updates: Object.keys(updates),
			});

			return res.json({
				success: true,
				data: {
					user: updatedUser,
				},
			});
		} catch (error) {
			logger.error('Failed to update user profile', {
				error,
				userId: req.user?.id,
			});
			return res.status(500).json({
				error: 'Update Error',
				message: 'Failed to update profile',
			});
		}
	},
);

// PUT /api/users/preferences - Update user preferences
usersRouter.put(
	'/preferences',
	validateRequest(updatePreferencesSchema),
	async (req, res) => {
		try {
			const userId = req.user?.id;
			const newPreferences = req.body;

			if (!userId) {
				return res.status(401).json({
					error: 'Authentication Error',
					message: 'User not authenticated',
				});
			}

			const db = getDb();

			// Get current user preferences
			const [currentUser] = await db
				.select({
					preferences: users.preferences,
				})
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			if (!currentUser) {
				res.status(404).json({
					error: 'User Error',
					message: 'User not found',
				});
				return;
			}

			// Merge preferences
			const updatedPreferences = {
				...currentUser.preferences,
				...newPreferences,
			};

			// Update user preferences
			const [updatedUser] = await db
				.update(users)
				.set({
					preferences: updatedPreferences,
					updatedAt: new Date(),
				})
				.where(eq(users.id, userId))
				.returning({
					id: users.id,
					preferences: users.preferences,
				});

			logger.info('User preferences updated', {
				userId,
				preferences: Object.keys(newPreferences),
			});

			return res.json({
				success: true,
				data: {
					preferences: updatedUser.preferences,
				},
			});
		} catch (error) {
			logger.error('Failed to update user preferences', {
				error,
				userId: req.user?.id,
			});
			return res.status(500).json({
				error: 'Preferences Error',
				message: 'Failed to update preferences',
			});
		}
	},
);

// GET /api/users/dashboard - Get user dashboard data
usersRouter.get('/dashboard', async (req, res) => {
	try {
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({
				error: 'Authentication Error',
				message: 'User not authenticated',
			});
		}

		const db = getDb();

		// Get upcoming bookings
		const upcomingBookings = await db
			.select({
				id: bookings.id,
				confirmationNumber: bookings.confirmationNumber,
				hotelId: bookings.hotelId,
				checkIn: bookings.checkIn,
				checkOut: bookings.checkOut,
				status: bookings.status,
				totalAmount: bookings.totalAmount,
				currency: bookings.currency,
			})
			.from(bookings)
			.where(
				and(
					eq(bookings.userId, userId),
					gte(bookings.checkIn, new Date()),
					ne(bookings.status, 'cancelled'),
				),
			)
			.orderBy(bookings.checkIn)
			.limit(5);

		// Get past bookings
		const pastBookings = await db
			.select({
				id: bookings.id,
				confirmationNumber: bookings.confirmationNumber,
				hotelId: bookings.hotelId,
				checkIn: bookings.checkIn,
				checkOut: bookings.checkOut,
				status: bookings.status,
				totalAmount: bookings.totalAmount,
				currency: bookings.currency,
			})
			.from(bookings)
			.where(
				and(eq(bookings.userId, userId), lt(bookings.checkOut, new Date())),
			)
			.orderBy(desc(bookings.checkOut))
			.limit(5);

		// Get booking statistics
		const [stats] = await db
			.select({
				totalBookings: count(),
				totalSpent: sum(bookings.totalAmount),
			})
			.from(bookings)
			.where(
				and(eq(bookings.userId, userId), ne(bookings.status, 'cancelled')),
			);

		// Get status counts
		const statusCounts = await db
			.select({
				status: bookings.status,
				count: count(),
			})
			.from(bookings)
			.where(eq(bookings.userId, userId))
			.groupBy(bookings.status);

		return res.json({
			success: true,
			data: {
				upcomingBookings,
				pastBookings,
				stats: {
					totalBookings: stats?.totalBookings || 0,
					totalSpent: parseFloat(stats?.totalSpent || '0'),
					statusBreakdown: statusCounts.reduce(
						(
							acc: Record<string, number>,
							item: { status: string | null; count: number },
						) => {
							acc[String(item.status)] = item.count;
							return acc;
						},
						{} as Record<string, number>,
					),
				},
			},
		});
	} catch (error) {
		logger.error('Failed to get user dashboard', {
			error,
			userId: req.user?.id,
		});
		return res.status(500).json({
			error: 'Dashboard Error',
			message: 'Failed to load dashboard data',
		});
	}
});

// DELETE /api/users/account - Delete user account
usersRouter.delete('/account', async (req, res) => {
	try {
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({
				error: 'Authentication Error',
				message: 'User not authenticated',
			});
		}

		const db = getDb();

		// Check for active bookings
		const [activeBookingsCount] = await db
			.select({ count: count() })
			.from(bookings)
			.where(
				and(
					eq(bookings.userId, userId),
					or(
						eq(bookings.status, 'confirmed'),
						eq(bookings.status, 'checked_in'),
					),
					gte(bookings.checkOut, new Date()),
				),
			);

		if (activeBookingsCount.count > 0) {
			return res.status(400).json({
				error: 'Account Deletion Error',
				message:
					'Cannot delete account with active bookings. Please complete or cancel your bookings first.',
			});
		}

		// Soft delete user (deactivate instead of hard delete to preserve booking history)
		await db
			.update(users)
			.set({
				isActive: false,
				email: `deleted_${Date.now()}_${users.email}`, // Preserve email uniqueness
				firstName: 'Deleted',
				lastName: 'User',
				phone: null,
				passwordHash: 'deleted',
				tokenVersion: sql`COALESCE(token_version, 0) + 1`,
				updatedAt: new Date(),
				metadata: {
					deletedAt: new Date().toISOString(),
					deletedBy: userId,
				},
			})
			.where(eq(users.id, userId));

		logger.info('User account deleted', { userId });

		return res.json({
			success: true,
			message: 'Account deleted successfully',
		});
	} catch (error) {
		logger.error('Failed to delete user account', {
			error,
			userId: req.user?.id,
		});
		return res.status(500).json({
			error: 'Deletion Error',
			message: 'Failed to delete account',
		});
	}
});

// GET /api/users/export - Export user data (GDPR compliance)
usersRouter.get('/export', async (req, res) => {
	try {
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({
				error: 'Authentication Error',
				message: 'User not authenticated',
			});
		}

		const db = getDb();

		// Get user data
		const [userData] = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!userData) {
			return res.status(404).json({
				error: 'User Error',
				message: 'User not found',
			});
		}

		// Get all user bookings
		const userBookings = await db
			.select()
			.from(bookings)
			.where(eq(bookings.userId, userId))
			.orderBy(desc(bookings.createdAt));

		// Prepare export data (remove sensitive fields)
		const exportData = {
			user: {
				id: userData.id,
				firstName: userData.firstName,
				lastName: userData.lastName,
				email: userData.email,
				phone: userData.phone,
				preferences: userData.preferences,
				createdAt: userData.createdAt,
				lastLoginAt: userData.lastLoginAt,
			},
			bookings: userBookings.map((booking: typeof bookings.$inferSelect) => ({
				id: booking.id,
				confirmationNumber: booking.confirmationNumber,
				hotelId: booking.hotelId,
				roomId: booking.roomId,
				checkIn: booking.checkIn,
				checkOut: booking.checkOut,
				adults: booking.adults,
				children: booking.children,
				totalAmount: booking.totalAmount,
				currency: booking.currency,
				status: booking.status,
				specialRequests: booking.specialRequests,
				createdAt: booking.createdAt,
			})),
			exportedAt: new Date().toISOString(),
		};

		logger.info('User data exported', { userId });

		return res.json({
			success: true,
			data: exportData,
		});
	} catch (error) {
		logger.error('Failed to export user data', { error, userId: req.user?.id });
		return res.status(500).json({
			error: 'Export Error',
			message: 'Failed to export user data',
		});
	}
});
