/**
 * SSE (Server-Sent Events) client utility
 * Spec: spec.md §6, DD-17
 * Handles streaming of generation and assistant events
 */

export type SSEMessage<T = unknown> = {
  event: string;
  data: T;
};

export type SSEEventHandler<T = unknown> = (message: SSEMessage<T>) => void;

export interface SSEClientOptions {
  onMessage?: SSEEventHandler;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

/**
 * Parse SSE message from text
 */
function parseSSEMessage(text: string): SSEMessage | null {
  const lines = text.split('\n');
  let event = 'message';
  let data = '';

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data += line.slice(5).trim();
    }
  }

  if (!data) return null;

  try {
    return {
      event,
      data: JSON.parse(data),
    };
  } catch {
    return {
      event,
      data,
    };
  }
}

/**
 * SSE Client
 * Manages streaming connection and message parsing
 */
export class SSEClient {
  private abortController: AbortController | null = null;
  private options: SSEClientOptions;

  constructor(options: SSEClientOptions = {}) {
    this.options = options;
  }

  /**
   * Connect to SSE endpoint
   */
  async connect(url: string): Promise<void> {
    this.abortController = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
        },
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          this.options.onComplete?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Keep incomplete message in buffer
        buffer = lines.pop() || '';

        for (const messageText of lines) {
          if (messageText.trim()) {
            const message = parseSSEMessage(messageText);
            if (message) {
              this.options.onMessage?.(message);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        this.options.onError?.(error);
      }
    }
  }

  /**
   * Disconnect from SSE endpoint
   */
  disconnect(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.abortController !== null;
  }
}

/**
 * React hook for SSE connection
 */
export function useSSE(url: string | null, options: SSEClientOptions = {}) {
  const clientRef = React.useRef<SSEClient | null>(null);

  React.useEffect(() => {
    if (!url) return;

    const client = new SSEClient(options);
    clientRef.current = client;
    
    client.connect(url).catch((error) => {
      options.onError?.(error);
    });

    return () => {
      client.disconnect();
    };
  }, [url]);

  return {
    disconnect: () => clientRef.current?.disconnect(),
    isConnected: () => clientRef.current?.isConnected() ?? false,
  };
}

import * as React from 'react';
