import 'server-only';
/**
 * AI client wrapper
 * Spec: spec.md §7.1
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';

export const anthropic =
  env.LLM_PROVIDER === 'anthropic'
    ? new Anthropic({
        apiKey: env.ANTHROPIC_API_KEY,
      })
    : null;

export type Model = 'claude-3-5-sonnet-20241022' | 'claude-3-5-haiku-20241022';

/**
 * Get model name based on feature
 * Spec: spec.md §7.1 - Sonnet for initial plan, Haiku for suggestions
 */
export function getModelForFeature(
  feature:
    | 'initial_plan'
    | 'budget_suggest'
    | 'task_suggest'
    | 'vendor_suggest'
    | 'idea_suggest'
    | 'chat'
): Model {
  switch (feature) {
    case 'initial_plan':
    case 'chat':
      return 'claude-3-5-sonnet-20241022';
    default:
      return 'claude-3-5-haiku-20241022';
  }
}
