import { relations } from 'drizzle-orm';
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';
import { reviews } from './reviews.js';
import { users } from './users.js';

export const reviewVotes = sqliteTable(
	'review_votes',
	{
		reviewId: text('review_id')
			.notNull()
			.references(() => reviews.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		voteType: text('vote_type', { enum: ['helpful', 'not_helpful'] }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
			() => new Date(),
		),
	},
	(table) => ({
		primaryKey: primaryKey({ columns: [table.reviewId, table.userId] }),
		reviewIdIndex: index('review_votes_review_id_idx').on(table.reviewId),
		userIdIndex: index('review_votes_user_id_idx').on(table.userId),
	}),
);

export const reviewVotesRelations = relations(reviewVotes, ({ one }) => ({
	review: one(reviews, {
		fields: [reviewVotes.reviewId],
		references: [reviews.id],
	}),
	user: one(users, {
		fields: [reviewVotes.userId],
		references: [users.id],
	}),
}));

export const insertReviewVoteSchema = createInsertSchema(reviewVotes);
export const selectReviewVoteSchema = createInsertSchema(reviewVotes);

export type ReviewVote = typeof reviewVotes.$inferSelect;
export type InsertReviewVote = typeof reviewVotes.$inferInsert;
