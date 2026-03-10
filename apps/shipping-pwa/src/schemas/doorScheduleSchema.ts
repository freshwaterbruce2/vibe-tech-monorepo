import { z } from 'zod'

export const doorScheduleSchema = z.object({
  doorNumber: z
    .number({
      error: 'Door number is required and must be a number',
    })
    .int()
    .min(332, { message: 'Door number must be at least 332' })
    .max(454, { message: 'Door number must be at most 454' }),

  destinationDC: z.enum(['6024', '6070', '6039', '6040', '7045'] as const, {
    error: 'Destination DC is required',
  }),

  freightType: z.enum(['23/43', '28', 'XD', 'AIB'] as const, {
    error: 'Freight type is required',
  }),

  trailerStatus: z.enum(
    ['empty', '25%', '50%', '75%', 'partial', 'shipload'] as const,
    {
      error: 'Trailer status is required',
    }
  ),

  palletCount: z
    .number({
      error: 'Pallet count is required and must be a number',
    })
    .int()
    .min(0, { message: 'Pallet count cannot be negative' }),

  notes: z.string().optional(),
  tcrPresent: z.boolean().default(false),
})

// Type inference from the schema
export type DoorScheduleFormValues = z.infer<typeof doorScheduleSchema>
