import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';
import { users } from './users.js';

export const aiFeedback = sqliteTable(
	'ai_feedback',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id').references(() => users.id),
		searchQuery: text('search_query'),
		feedbackType: text('feedback_type', {
			enum: ['helpful', 'not_helpful', 'suggestion', 'error'],
		}).notNull(),
		rating: integer('rating'), // 1-5 scale
		comment: text('comment'),
		aiResponse: text('ai_response'), // Store the AI response that was rated
		metadata: text('metadata'), // JSON string for additional data
		createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
			() => new Date(),
		),
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
