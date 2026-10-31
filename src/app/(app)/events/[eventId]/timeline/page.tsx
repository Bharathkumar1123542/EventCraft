/**
 * Timeline page
 * Spec: prd.md §3.5 US-20 through US-23
 * Tasks grouped by due date with add/edit/complete/filter functionality
 */

'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EventShell } from '@/components/layout/event-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  categoryKey: string;
  status: 'open' | 'done';
  isCompressed: boolean;
  completedAt: string | null;
}

interface Event {
  id: string;
  timezone: string;
}

type TaskGroup = 'overdue' | 'this_week' | 'later' | 'done';

function getTaskGroup(task: Task, timezone: string): TaskGroup {
  if (task.status === 'done') return 'done';
  
  const now = new Date();
  const dueDate = new Date(task.dueDate);
  const today = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  today.setHours(0, 0, 0, 0);
  
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  
  if (dueDate < today) return 'overdue';
  if (dueDate < weekFromNow) return 'this_week';
  return 'later';
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'text-over-fg';
    case 'medium':
      return 'text-warn-fg';
    default:
      return 'text-muted';
  }
}

export default function TimelinePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const eventId = params?.eventId as string;

  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = React.useState('');
  const [taskDueDate, setTaskDueDate] = React.useState('');
  const [taskPriority, setTaskPriority] = React.useState<'low' | 'medium' | 'high'>('medium');
  const [taskCategory, setTaskCategory] = React.useState('');

  // Get filters from URL
  const statusFilter = searchParams?.get('status') || 'all';
  const dateFrom = searchParams?.get('dateFrom') || '';
  const dateTo = searchParams?.get('dateTo') || '';

  // Fetch event
  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      return res.json() as Promise<{ event: Event }>;
    },
  });

  // Fetch tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', eventId, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      
      const res = await fetch(`/api/v1/events/${eventId}/tasks?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json() as Promise<{ tasks: Task[] }>;
    },
    enabled: !!eventId,
  });

  // Complete/reopen task mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: 'open' | 'done' }) => {
      const res = await fetch(`/api/v1/events/${eventId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onMutate: async ({ taskId, status }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks', eventId] });
      const previousTasks = queryClient.getQueryData(['tasks', eventId, statusFilter, dateFrom, dateTo]);
      
      queryClient.setQueryData(
        ['tasks', eventId, statusFilter, dateFrom, dateTo],
        (old: any) => ({
          ...old,
          tasks: old.tasks.map((task: Task) =>
            task.id === taskId
              ? { ...task, status, completedAt: status === 'done' ? new Date().toISOString() : null }
              : task
          ),
        })
      );
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ['tasks', eventId, statusFilter, dateFrom, dateTo],
          context.previousTasks
        );
      }
      toast({ title: 'Failed to update task', variant: 'error' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', eventId] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/v1/events/${eventId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', eventId] });
      toast({ title: 'Task deleted', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Failed to delete task', variant: 'error' });
    },
  });

  // Save task mutation
  const saveTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      if (editingTask) {
        const res = await fetch(`/api/v1/events/${eventId}/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        if (!res.ok) throw new Error('Failed to update task');
        return res.json();
      } else {
        const res = await fetch(`/api/v1/events/${eventId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        if (!res.ok) throw new Error('Failed to create task');
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', eventId] });
      handleCloseDialog();
      toast({
        title: editingTask ? 'Task updated' : 'Task created',
        variant: 'success',
      });
    },
    onError: () => {
      toast({
        title: editingTask ? 'Failed to update task' : 'Failed to create task',
        variant: 'error',
      });
    },
  });

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskTitle(task.title);
      setTaskDueDate(task.dueDate);
      setTaskPriority(task.priority);
      setTaskCategory(task.categoryKey);
    } else {
      setEditingTask(null);
      setTaskTitle('');
      setTaskDueDate('');
      setTaskPriority('medium');
      setTaskCategory('');
    }
    setTaskDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setTaskDialogOpen(false);
    setEditingTask(null);
    setTaskTitle('');
    setTaskDueDate('');
    setTaskPriority('medium');
    setTaskCategory('');
  };

  const handleSaveTask = () => {
    if (!taskTitle.trim() || !taskDueDate) {
      toast({ title: 'Please fill in all required fields', variant: 'error' });
      return;
    }

    saveTaskMutation.mutate({
      title: taskTitle.trim(),
      dueDate: taskDueDate,
      priority: taskPriority,
      categoryKey: taskCategory || 'general',
    });
  };

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams?.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`/events/${eventId}/timeline?${params.toString()}`);
  };

  if (tasksLoading) {
    return (
      <EventShell eventId={eventId}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Card>
            <CardContent className="p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full mb-4" />
              ))}
            </CardContent>
          </Card>
        </div>
      </EventShell>
    );
  }

  const tasks = tasksData?.tasks || [];
  const event = eventData?.event;
  
  // Group tasks
  const groupedTasks: Record<TaskGroup, Task[]> = {
    overdue: [],
    this_week: [],
    later: [],
    done: [],
  };

  tasks.forEach((task) => {
    const group = event ? getTaskGroup(task, event.timezone) : 'later';
    groupedTasks[group].push(task);
  });

  const groupLabels: Record<TaskGroup, string> = {
    overdue: 'Overdue',
    this_week: 'This week',
    later: 'Later',
    done: 'Done',
  };

  return (
    <EventShell eventId={eventId}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Timeline</h1>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = `/api/v1/events/${eventId}/export/ics`;
              }}
            >
              Download calendar
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              Add task
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-text mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => updateFilters({ status: e.target.value })}
                  className="block w-full rounded-control border border-border px-3 py-2 text-base bg-surface text-text"
                >
                  <option value="all">All tasks</option>
                  <option value="open">Open only</option>
                  <option value="done">Done only</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-text mb-2">From date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => updateFilters({ dateFrom: e.target.value })}
                  className="block w-full rounded-control border border-border px-3 py-2 text-base bg-surface text-text"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-text mb-2">To date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => updateFilters({ dateTo: e.target.value })}
                  className="block w-full rounded-control border border-border px-3 py-2 text-base bg-surface text-text"
                />
              </div>
              {(statusFilter !== 'all' || dateFrom || dateTo) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    router.push(`/events/${eventId}/timeline`);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Task groups */}
        {(['overdue', 'this_week', 'later', 'done'] as TaskGroup[]).map((group) => {
          const groupTasks = groupedTasks[group];
          if (groupTasks.length === 0) return null;

          return (
            <div key={group}>
              <h2 className="text-lg font-semibold text-text mb-3">
                {groupLabels[group]} ({groupTasks.length})
              </h2>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {groupTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 rounded-control border border-border hover:bg-bg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={task.status === 'done'}
                          onChange={() =>
                            toggleTaskMutation.mutate({
                              taskId: task.id,
                              status: task.status === 'done' ? 'open' : 'done',
                            })
                          }
                          className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-focus focus:ring-2 focus:ring-offset-2"
                          aria-label={task.status === 'done' ? 'Reopen task' : 'Complete task'}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-base font-medium ${
                                task.status === 'done' ? 'line-through text-muted' : 'text-text'
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.isCompressed && (
                              <Badge variant="warn" title="Scheduled closer than ideal because the event is soon">
                                Compressed
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm">
                            <span className="text-muted">
                              {new Date(task.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className={`font-medium capitalize ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className="text-muted capitalize">{task.categoryKey}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenDialog(task)}
                            className="px-3 py-1 text-sm text-primary hover:text-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-control"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${task.title}"?`)) {
                                deleteTaskMutation.mutate(task.id);
                              }
                            }}
                            className="px-3 py-1 text-sm text-over-fg hover:text-over-fg/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-control"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-base text-muted mb-4">
                No tasks yet. Generate your timeline or add one.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                Add task
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit task dialog */}
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit task' : 'Add task'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Update task details' : 'Create a new task'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Input
                label="Task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="What needs to be done?"
                required
              />

              <Input
                label="Due date"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                required
              />

              <div>
                <label className="block text-base font-medium text-text mb-2">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="block w-full rounded-control border border-border px-3 py-2 text-base bg-surface text-text"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <Input
                label="Category (optional)"
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
                placeholder="e.g., venue, catering"
              />
            </div>

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={handleCloseDialog}
                disabled={saveTaskMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTask}
                disabled={saveTaskMutation.isPending}
              >
                {saveTaskMutation.isPending ? 'Saving...' : editingTask ? 'Update task' : 'Add task'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </EventShell>
  );
}
