import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';

export const users = pgTable(
	'users',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		email: varchar('email', { length: 255 }).notNull().unique(),
		passwordHash: text('password_hash').notNull(),
		firstName: varchar('first_name', { length: 100 }).notNull(),
		lastName: varchar('last_name', { length: 100 }).notNull(),
		phone: varchar('phone', { length: 20 }),
		avatar: text('avatar'),
		role: varchar('role', { length: 20 }).notNull().default('user'),
		isActive: boolean('is_active').notNull().default(true),
		emailVerified: boolean('email_verified').notNull().default(false),
		emailVerificationToken: text('email_verification_token'),
		passwordResetToken: text('password_reset_token'),
		passwordResetExpires: timestamp('password_reset_expires'),
		tokenVersion: integer('token_version').default(0),
		preferences: jsonb('preferences').default({
			currency: 'USD',
			language: 'en',
			notifications: {
				email: true,
				push: false,
				sms: false,
			},
		}),
		metadata: jsonb('metadata').default({}),
		lastLoginAt: timestamp('last_login_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			emailIdx: index('users_email_idx').on(table.email),
			roleIdx: index('users_role_idx').on(table.role),
		};
	},
);

export const sessions = pgTable(
	'sessions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		token: text('token').notNull().unique(),
		refreshToken: text('refresh_token').notNull().unique(),
		ipAddress: varchar('ip_address', { length: 45 }),
		userAgent: text('user_agent'),
		expiresAt: timestamp('expires_at').notNull(),
		refreshExpiresAt: timestamp('refresh_expires_at').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			userIdIdx: index('sessions_user_id_idx').on(table.userId),
			tokenIdx: index('sessions_token_idx').on(table.token),
		};
	},
);

export const userProfiles = pgTable(
	'user_profiles',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' })
			.unique(),
		dateOfBirth: timestamp('date_of_birth'),
		nationality: varchar('nationality', { length: 2 }),
		passportNumber: varchar('passport_number', { length: 50 }),
		passportExpiry: timestamp('passport_expiry'),
		loyaltyPrograms: jsonb('loyalty_programs').default([]),
		emergencyContact: jsonb('emergency_contact'),
		travelPreferences: jsonb('travel_preferences').default({
			seatPreference: 'any',
			mealPreference: 'any',
			roomPreference: {
				bedType: 'any',
				floor: 'any',
				smoking: false,
			},
		}),
		savedPaymentMethods: jsonb('saved_payment_methods').default([]),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
