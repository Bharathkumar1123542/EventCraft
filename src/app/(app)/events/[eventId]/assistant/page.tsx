/**
 * Assistant page
 * Spec: prd.md §3.8 US-31 through US-35
 * Chat interface with SSE streaming and conversation management
 */

'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EventShell } from '@/components/layout/event-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useSSE } from '@/lib/client/sse';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface Event {
  id: string;
  title: string;
  eventType: string;
}

interface Vendor {
  id: string;
  need: string;
  status: string;
  categoryLabel: string;
}

export default function AssistantPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const eventId = params?.eventId as string;

  const [input, setInput] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamingMessage, setStreamingMessage] = React.useState('');
  const [clearDialogOpen, setClearDialogOpen] = React.useState(false);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Fetch event
  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      return res.json() as Promise<{ event: Event }>;
    },
  });

  // Fetch vendors for starter prompts
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/vendors`);
      if (!res.ok) throw new Error('Failed to fetch vendors');
      return res.json() as Promise<{ vendors: Vendor[] }>;
    },
    enabled: !!eventId,
  });

  // Fetch conversation history
  const { data: conversationData, isLoading: conversationLoading } = useQuery({
    queryKey: ['assistant-conversation', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/assistant/conversation`);
      if (!res.ok) throw new Error('Failed to fetch conversation');
      return res.json() as Promise<{ messages: Message[] }>;
    },
    enabled: !!eventId,
  });

  // Send message with SSE streaming
  const sendMessageMutation = useMutation({
    mutationFn: async (question: string) => {
      setIsStreaming(true);
      setStreamingMessage('');
      
      const response = await fetch(`/api/v1/events/${eventId}/assistant/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                  setIsStreaming(false);
                  return { answer: fullAnswer };
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.token) {
                    fullAnswer += parsed.token;
                    setStreamingMessage(fullAnswer);
                  }
                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                } catch (e) {
                  // Skip invalid JSON lines
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      setIsStreaming(false);
      return { answer: fullAnswer };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-conversation', eventId] });
      setStreamingMessage('');
    },
    onError: (error: Error) => {
      setIsStreaming(false);
      setStreamingMessage('');
      toast({ title: error.message, variant: 'error' });
    },
  });

  // Clear conversation mutation
  const clearConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/assistant/conversation`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to clear conversation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-conversation', eventId] });
      toast({ title: 'Conversation cleared', variant: 'success' });
      setClearDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'error' });
    },
  });

  const handleSend = () => {
    const question = input.trim();
    if (!question || isStreaming) return;

    setInput('');
    sendMessageMutation.mutate(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarterPrompt = (prompt: string) => {
    if (isStreaming) return;
    setInput(prompt);
    textareaRef.current?.focus();
  };

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationData?.messages, streamingMessage]);

  if (conversationLoading) {
    return (
      <EventShell eventId={eventId}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </EventShell>
    );
  }

  const messages = conversationData?.messages || [];
  const event = eventData?.event;
  const vendors = vendorsData?.vendors || [];

  // Get a vendor for starter prompt (first non-booked vendor)
  const vendorForPrompt = vendors.find(v => v.status !== 'booked');

  // Starter prompts
  const starterPrompts = [
    'What should I do this week?',
    'Am I on budget?',
    vendorForPrompt ? `What should I ask my ${vendorForPrompt.need.toLowerCase()}?` : 'What vendors should I prioritize?',
  ];

  return (
    <EventShell eventId={eventId}>
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-text">Assistant</h1>
          {messages.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setClearDialogOpen(true)}
              disabled={isStreaming}
            >
              Clear conversation
            </Button>
          )}
        </div>

        {/* Privacy notice */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-sm text-muted">
              <strong className="text-text">Privacy:</strong> The assistant sees your budget numbers, task titles, and vendor needs. It never sees your name, email, or notes, and it can't change your plan.
            </p>
          </CardContent>
        </Card>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto mb-6 space-y-4">
          {messages.length === 0 && !streamingMessage ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-base text-muted mb-6">
                  Ask me anything about your {event?.eventType || 'event'}.
                </p>
                <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
                  {starterPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleStarterPrompt(prompt)}
                      className="w-full px-4 py-3 text-left text-base bg-surface text-text border border-border rounded-control hover:bg-bg transition-colors focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {messages.slice(-10).map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-control ${
                      message.role === 'user'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface text-text border border-border'
                    }`}
                  >
                    <p className="text-base whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[75%] px-4 py-3 rounded-control bg-surface text-text border border-border">
                    <p className="text-base whitespace-pre-wrap">{streamingMessage}</p>
                    <span className="inline-block w-2 h-4 ml-1 bg-text animate-pulse" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                rows={2}
                disabled={isStreaming}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="self-end"
              >
                {isStreaming ? 'Sending...' : 'Send'}
              </Button>
            </div>
            <p className="text-xs text-muted mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </CardContent>
        </Card>

        {/* Clear conversation dialog */}
        <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear conversation?</DialogTitle>
              <DialogDescription>
                This will permanently delete all messages in this conversation. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setClearDialogOpen(false)}
                disabled={clearConversationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => clearConversationMutation.mutate()}
                disabled={clearConversationMutation.isPending}
              >
                {clearConversationMutation.isPending ? 'Clearing...' : 'Clear conversation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </EventShell>
  );
}
