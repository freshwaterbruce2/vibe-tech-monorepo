import { z } from 'zod';

export const DimensionSchema = z.enum(['physical', 'mental', 'emotional', 'spiritual']);
export type Dimension = z.infer<typeof DimensionSchema>;

export const ScoreSchema = z.number().int().min(1).max(10);

export const ScoresSchema = z.object({
  physical: ScoreSchema,
  mental: ScoreSchema,
  emotional: ScoreSchema,
  spiritual: ScoreSchema,
}).partial();
export type Scores = z.infer<typeof ScoresSchema>;

export const ValenceSchema = z.enum(['positive', 'neutral', 'negative']);
export type Valence = z.infer<typeof ValenceSchema>;

export const DailyEntrySchema = z.object({
  id: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scores: ScoresSchema,
  habits: z.record(z.string(), z.boolean()),
  gratitude: z.string(),
  reflection: z.string(),
  themes: z.array(z.string()).optional(),
  valence: ValenceSchema.optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type DailyEntry = z.infer<typeof DailyEntrySchema>;

export const HabitDefinitionSchema = z.object({
  id: z.string(),
  dimension: DimensionSchema,
  label: z.string(),
  enabled: z.boolean(),
});
export type HabitDefinition = z.infer<typeof HabitDefinitionSchema>;

export const SymptomEntrySchema = z.object({
  id: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  symptom: z.string().trim().min(1).max(80),
  severity: z.number().int().min(0).max(10),
  notes: z.string().max(4000),
  tags: z.array(z.string().trim().min(1).max(32)),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type SymptomEntry = z.infer<typeof SymptomEntrySchema>;

export interface SymptomSummary {
  symptom: string;
  count: number;
  avgSeverity: number;
}

export type InsightPriority = 'info' | 'watch' | 'attention' | 'urgent';

export interface PatternInsight {
  id: string;
  title: string;
  detail: string;
  priority: InsightPriority;
  evidence: string[];
}

export interface HealthInsightReport {
  generatedAt: string;
  entryCount: number;
  averageSeverity: number | null;
  highSeverityCount: number;
  insights: PatternInsight[];
  suggestedQuestions: string[];
  nextActions: string[];
  disclaimer: string;
}
