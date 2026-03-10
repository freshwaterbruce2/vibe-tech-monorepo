import {
	index,
	integer,
	sqliteTable,
	text,
} from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';

export const users = sqliteTable(
	'users',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		email: text('email', { length: 255 }).notNull().unique(),
		passwordHash: text('password_hash').notNull(),
		firstName: text('first_name', { length: 100 }).notNull(),
		lastName: text('last_name', { length: 100 }).notNull(),
		phone: text('phone', { length: 20 }),
		avatar: text('avatar'),
		role: text('role', { length: 20 }).notNull().default('user'),
		isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
		emailVerified: integer('email_verified', { mode: 'boolean' })
			.notNull()
			.default(false),
		emailVerificationToken: text('email_verification_token'),
		passwordResetToken: text('password_reset_token'),
		passwordResetExpires: integer('password_reset_expires', {
			mode: 'timestamp',
		}),
		tokenVersion: integer('token_version').default(0),
		preferences: text('preferences', { mode: 'json' }).default({
			currency: 'USD',
			language: 'en',
			notifications: {
				email: true,
				push: false,
				sms: false,
			},
		}),
		metadata: text('metadata', { mode: 'json' }).default({}),
		lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => {
		return {
			emailIdx: index('users_email_idx').on(table.email),
			roleIdx: index('users_role_idx').on(table.role),
		};
	},
);

export const sessions = sqliteTable(
	'sessions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		token: text('token').notNull().unique(),
		refreshToken: text('refresh_token').notNull().unique(),
		ipAddress: text('ip_address', { length: 45 }),
		userAgent: text('user_agent'),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
		refreshExpiresAt: integer('refresh_expires_at', {
			mode: 'timestamp',
		}).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => {
		return {
			userIdIdx: index('sessions_user_id_idx').on(table.userId),
			tokenIdx: index('sessions_token_idx').on(table.token),
		};
	},
);

export const userProfiles = sqliteTable(
	'user_profiles',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' })
			.unique(),
		dateOfBirth: integer('date_of_birth', { mode: 'timestamp' }),
		nationality: text('nationality', { length: 2 }),
		passportNumber: text('passport_number', { length: 50 }),
		passportExpiry: integer('passport_expiry', { mode: 'timestamp' }),
		loyaltyPrograms: text('loyalty_programs', { mode: 'json' }).default([]),
		emergencyContact: text('emergency_contact', { mode: 'json' }),
		travelPreferences: text('travel_preferences', { mode: 'json' }).default({
			seatPreference: 'any',
			mealPreference: 'any',
			roomPreference: {
				bedType: 'any',
				floor: 'any',
				smoking: false,
			},
		}),
		savedPaymentMethods: text('saved_payment_methods', {
			mode: 'json',
		}).default([]),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => {
		return {
			userIdIdx: index('user_profiles_user_id_idx').on(table.userId),
		};
	},
);

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertSessionSchema = createInsertSchema(sessions);
export const selectSessionSchema = createSelectSchema(sessions);
export const insertUserProfileSchema = createInsertSchema(userProfiles);
export const selectUserProfileSchema = createSelectSchema(userProfiles);

// Type exports
export type User = z.infer<typeof selectUserSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;
export type Session = z.infer<typeof selectSessionSchema>;
export type NewSession = z.infer<typeof insertSessionSchema>;
export type UserProfile = z.infer<typeof selectUserProfileSchema>;
export type NewUserProfile = z.infer<typeof insertUserProfileSchema>;
