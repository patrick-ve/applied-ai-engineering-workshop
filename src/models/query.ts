import { z } from 'zod';

export const querySchema = z.object({
  query: z.string(),
});

export type Query = z.infer<typeof querySchema>;
