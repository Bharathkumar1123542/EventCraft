/**
 * Generation provider context
 * Spec: prd.md §3.3 US-10, US-11, US-12
 * Manages generation state and SSE streaming
 */

'use client';

import * as React from 'react';
import { useSSE, SSEMessage } from './sse';

export type SectionType = 'budget' | 'timeline' | 'vendors' | 'ideas';
export type SectionStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface SectionState {
  status: SectionStatus;
  error?: string;
}

interface SectionStartedData {
  section: SectionType;
}

interface SectionCompletedData {
  section: SectionType;
}

interface SectionFailedData {
  section: SectionType;
  error?: string;
}

export interface GenerationState {
  isGenerating: boolean;
  sections: Record<SectionType, SectionState>;
}

export interface GenerationContextValue {
  state: GenerationState;
  startGeneration: (eventId: string) => void;
  regenerateSection: (eventId: string, section: SectionType, instructions?: string) => void;
  reset: () => void;
}

const GenerationContext = React.createContext<GenerationContextValue | null>(null);

const INITIAL_STATE: GenerationState = {
  isGenerating: false,
  sections: {
    budget: { status: 'pending' },
    timeline: { status: 'pending' },
    vendors: { status: 'pending' },
    ideas: { status: 'pending' },
  },
};

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<GenerationState>(INITIAL_STATE);
  const [sseUrl, setSseUrl] = React.useState<string | null>(null);

  // Handle SSE messages
  const handleMessage = React.useCallback((message: SSEMessage) => {
    console.log('SSE message:', message);

    switch (message.event) {
      case 'section.started':
        {
          const data = message.data as SectionStartedData;
          setState((prev) => ({
            ...prev,
            sections: {
              ...prev.sections,
              [data.section]: { status: 'generating' },
            },
          }));
        }
        break;

      case 'section.completed':
        {
          const data = message.data as SectionCompletedData;
          setState((prev) => ({
            ...prev,
            sections: {
              ...prev.sections,
              [data.section]: { status: 'completed' },
            },
          }));
        }
        break;

      case 'section.failed':
        {
          const data = message.data as SectionFailedData;
          setState((prev) => ({
            ...prev,
            sections: {
              ...prev.sections,
              [data.section]: {
                status: 'failed',
                error: data.error || 'Generation failed',
              },
            },
          }));
        }
        break;

      case 'run.completed':
        setState((prev) => ({
          ...prev,
          isGenerating: false,
        }));
        setSseUrl(null);
        break;

      case 'run.failed':
        setState((prev) => ({
          ...prev,
          isGenerating: false,
        }));
        setSseUrl(null);
        break;
    }
  }, []);

  const handleError = React.useCallback((error: Error) => {
    console.error('SSE error:', error);
    setState((prev) => ({
      ...prev,
      isGenerating: false,
    }));
    setSseUrl(null);
  }, []);

  const handleComplete = React.useCallback(() => {
    console.log('SSE connection closed');
    setState((prev) => ({
      ...prev,
      isGenerating: false,
    }));
    setSseUrl(null);
  }, []);

  // Set up SSE connection
  useSSE(sseUrl, {
    onMessage: handleMessage,
    onError: handleError,
    onComplete: handleComplete,
  });

  // Start full generation
  const startGeneration = React.useCallback(async (eventId: string) => {
    try {
      setState({
        isGenerating: true,
        sections: {
          budget: { status: 'generating' },
          timeline: { status: 'pending' },
          vendors: { status: 'pending' },
          ideas: { status: 'pending' },
        },
      });

      const response = await fetch(`/api/v1/events/${eventId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: ['budget', 'timeline', 'vendors', 'ideas'] }),
      });

      if (!response.ok) {
        throw new Error('Failed to start generation');
      }

      const { runId } = await response.json();
      setSseUrl(`/api/v1/events/${eventId}/generate/${runId}/stream`);
    } catch (error) {
      console.error('Failed to start generation:', error);
      setState((prev) => ({
        ...prev,
        isGenerating: false,
      }));
    }
  }, []);

  // Regenerate single section
  const regenerateSection = React.useCallback(
    async (eventId: string, section: SectionType, instructions?: string) => {
      try {
        setState((prev) => ({
          ...prev,
          isGenerating: true,
          sections: {
            ...prev.sections,
            [section]: { status: 'generating' },
          },
        }));

        const payload: any = { sections: [section] };
        if (instructions) {
          payload.instructions = { [section]: instructions };
        }

        const response = await fetch(`/api/v1/events/${eventId}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to start regeneration');
        }

        const { runId } = await response.json();
        setSseUrl(`/api/v1/events/${eventId}/generate/${runId}/stream`);
      } catch (error) {
        console.error('Failed to regenerate section:', error);
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          sections: {
            ...prev.sections,
            [section]: {
              status: 'failed',
              error: 'Failed to start regeneration',
            },
          },
        }));
      }
    },
    []
  );

  // Reset state
  const reset = React.useCallback(() => {
    setState(INITIAL_STATE);
    setSseUrl(null);
  }, []);

  const value: GenerationContextValue = {
    state,
    startGeneration,
    regenerateSection,
    reset,
  };

  return (
    <GenerationContext.Provider value={value}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = React.useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within GenerationProvider');
  }
  return context;
}
