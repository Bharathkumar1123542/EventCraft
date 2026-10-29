import 'server-only';
/**
 * AI generation wrapper
 * Spec: spec.md §7.1
 */

import { anthropic, getModelForFeature } from './client';
import type { GenerationFeature } from '../db/repositories/generation.repository';
import { env } from '../config/env';
import { logInfo, logError } from '../http/logger';

export interface GenerationResult<T> {
  data: T;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  latencyMs: number;
  modelName: string;
}

/**
 * Generate structured output with retries
 * Spec: spec.md §7.1
 */
export async function generateStructured<T>(
  feature: GenerationFeature,
  prompt: string,
  schema: {
    name: string;
    schema: Record<string, unknown>;
  },
  maxRetries = 2
): Promise<GenerationResult<T>> {
  const model = getModelForFeature(feature);
  const start = Date.now();

  // Fake provider for testing
  if (env.LLM_PROVIDER === 'fake') {
    logInfo('Using fake LLM provider', { feature, model });
    
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate latency
    
    return {
      data: {} as T, // Empty object - tests must provide real data
      usage: {
        inputTokens: prompt.length,
        outputTokens: 100,
      },
      latencyMs: Date.now() - start,
      modelName: 'fake',
    };
  }

  if (!anthropic) {
    throw new Error('Anthropic client not initialized');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logInfo('Calling Anthropic API', {
        feature,
        model,
        attempt: attempt + 1,
        promptLength: prompt.length,
      });

      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        tools: [
          {
            name: schema.name,
            description: `Structured output for ${feature}`,
            input_schema: schema.schema,
          },
        ],
        tool_choice: {
          type: 'tool',
          name: schema.name,
        },
      });

      // Extract tool use
      const toolUse = response.content.find((c) => c.type === 'tool_use');
      
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No tool use in response');
      }

      const latencyMs = Date.now() - start;

      logInfo('Anthropic API success', {
        feature,
        model,
        attempt: attempt + 1,
        latencyMs,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      return {
        data: toolUse.input as T,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        latencyMs,
        modelName: model,
      };
    } catch (error) {
      lastError = error as Error;
      
      logError(`Anthropic API error (attempt ${attempt + 1})`, lastError, {
        feature,
        model,
      });

      // Don't retry on certain errors
      if (
        lastError.message.includes('invalid_api_key') ||
        lastError.message.includes('permission_denied')
      ) {
        break;
      }

      // Exponential backoff
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Generation failed');
}
