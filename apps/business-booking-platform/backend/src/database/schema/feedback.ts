import { relations } from 'drizzle-orm';
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { users } from './users.js';

export const aiFeedback = pgTable(
	'ai_feedback',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id').references(() => users.id),
		searchQuery: text('search_query'),
		feedbackType: text('feedback_type', {
			enum: ['helpful', 'not_helpful', 'suggestion', 'error'],
		}).notNull(),
		rating: integer('rating'), // 1-5 scale
		comment: text('comment'),
		aiResponse: text('ai_response'), // Store the AI response that was rated
		metadata: text('metadata'), // JSON string for additional data
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		userIdIndex: index('ai_feedback_user_id_idx').on(table.userId),
		feedbackTypeIndex: index('ai_feedback_type_idx').on(table.feedbackType),
		createdAtIndex: index('ai_feedback_created_at_idx').on(table.createdAt),
	}),
);

export const aiFeedbackRelations = relations(aiFeedback, ({ one }) => ({
	user: one(users, {
		fields: [aiFeedback.userId],
		references: [users.id],
	}),
}));

export const insertAiFeedbackSchema = createInsertSchema(aiFeedback);
export const selectAiFeedbackSchema = createInsertSchema(aiFeedback);

export type AiFeedback = typeof aiFeedback.$inferSelect;
export type InsertAiFeedback = typeof aiFeedback.$inferInsert;
