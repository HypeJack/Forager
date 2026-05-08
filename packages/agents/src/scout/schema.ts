import { z } from "zod";

/**
 * Scout Input — What the scout agent receives to begin searching.
 */
export const ScoutInputSchema = z.object({
  tenantId: z.string().uuid(),
  /** Organization profile / mission for matching */
  orgProfile: z.object({
    name: z.string(),
    mission: z.string(),
    focus_areas: z.array(z.string()),
    annual_budget: z.number().optional(),
    location: z.string().optional(),
    org_type: z.enum(["nonprofit", "government", "tribal", "education", "other"]),
  }),
  /** Optional constraints to narrow the search */
  filters: z
    .object({
      min_amount: z.number().optional(),
      max_amount: z.number().optional(),
      deadline_after: z.string().optional(), // ISO date
      categories: z.array(z.string()).optional(),
    })
    .optional(),
});

export type ScoutInput = z.infer<typeof ScoutInputSchema>;

/**
 * Scout Output — Discovered grant opportunities with match scoring.
 */
export const ScoutOutputSchema = z.object({
  opportunities: z.array(
    z.object({
      title: z.string(),
      funder: z.string(),
      description: z.string(),
      amount_min: z.number().nullable(),
      amount_max: z.number().nullable(),
      deadline: z.string().nullable(),
      url: z.string().url(),
      match_score: z.number().min(0).max(100),
      match_rationale: z.string(),
      evidence: z.array(
        z.object({
          source: z.string(),
          excerpt: z.string(),
          relevance: z.string(),
        })
      ),
      tags: z.array(z.string()),
    })
  ),
  /** Total opportunities evaluated before filtering */
  total_evaluated: z.number(),
  /** Model used for evaluation */
  model: z.string(),
  /** Summary reasoning about the overall search */
  search_summary: z.string(),
});

export type ScoutOutput = z.infer<typeof ScoutOutputSchema>;
