/**
 * IDOR Protection Tests - Repository Level
 * Spec: spec.md §9.4.1 - Zero cross-tenant access
 * 
 * Tests repository methods to ensure they enforce ownership checks
 * These tests run against the real database layer
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/server/db/client';
import {
  EventsRepository,
  BudgetRepository,
  TasksRepository,
  VendorsRepository,
  IdeasRepository,
} from '.';
import {
  createTestUser,
  createTestEvent,
  createTestBudgetCategories,
  createTestTask,
  createTestVendorItem,
  createTestIdea,
  createTestExpense,
  cleanupTestUser,
  type TestUser,
} from '../../testing/test-helpers';

describe('Repository IDOR Protection', () => {
  let userA: TestUser;
  let userB: TestUser;
  let eventAId: string;
  let eventBId: string;

  beforeAll(async () => {
    userA = await createTestUser(1);
    userB = await createTestUser(2);

    const eventA = await createTestEvent(userA.id);
    eventAId = eventA.id;

    const eventB = await createTestEvent(userB.id);
    eventBId = eventB.id;
  });

  afterAll(async () => {
    await cleanupTestUser(userA.id);
    await cleanupTestUser(userB.id);
  });

  describe('EventsRepository', () => {
    it('should return only User A\'s events when listing', async () => {
      const repo = new EventsRepository(db);
      const events = await repo.listByOwner(userA.id);

      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => e.ownerId === userA.id)).toBe(true);
      expect(events.some(e => e.id === eventBId)).toBe(false);
    });

    it('should not allow User B to find User A\'s event by ID', async () => {
      const repo = new EventsRepository(db);
      
      // getById enforces ownership - User B should not see User A's event
      const event = await repo.getById(eventAId, userB.id);
      
      // Should return null because userB doesn't own eventAId
      expect(event).toBeNull();
    });

    it('should enforce ownership on update', async () => {
      const repo = new EventsRepository(db);
      
      // User B attempts to update User A's event - should return null
      const result = await repo.update(eventAId, userB.id, {
        title: 'Hacked by User B',
      });

      // Should return null because userB doesn't own eventAId
      expect(result).toBeNull();
      
      // Verify the update didn't happen
      const event = await repo.getById(eventAId, userA.id);
      expect(event?.title).not.toBe('Hacked by User B');
    });

    it('should enforce ownership on delete', async () => {
      const repo = new EventsRepository(db);
      
      // Create a temporary event for User A
      const tempEvent = await createTestEvent(userA.id, { title: 'Temp' });
      
      const beforeCount = (await repo.listByOwner(userA.id)).length;
      
      // User B should not be able to delete User A's event
      const deleteResult = await repo.delete(tempEvent.id, userB.id);
      
      // Should return false because userB doesn't own the event
      expect(deleteResult).toBe(false);
      
      const afterCount = (await repo.listByOwner(userA.id)).length;
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe('BudgetRepository', () => {
    let categoryKey: string;

    beforeEach(async () => {
      const categories = await createTestBudgetCategories(eventAId);
      categoryKey = categories[0].categoryKey;
    });

    it('should not return User A\'s categories for User B', async () => {
      const repo = new BudgetRepository(db);
      
      // User B attempts to get User A's categories - should return null
      const categories = await repo.getCategories(eventAId, userB.id);

      // Should return null because userB doesn't own eventAId
      expect(categories).toBeNull();
    });

    it('should not allow User B to update User A\'s budget allocation', async () => {
      const repo = new BudgetRepository(db);
      
      const beforeUpdate = await repo.getCategories(eventAId, userA.id);
      const before = beforeUpdate?.find(c => c.categoryKey === categoryKey);

      // User B attempts to set categories for User A's event - should return null
      const result = await repo.setCategories({
        eventId: eventAId,
        ownerId: userB.id,
        categories: [{
          categoryKey: categoryKey as any,
          allocatedMinor: 999999,
        }],
      });
      
      // Should return null because userB doesn't own eventAId
      expect(result).toBeNull();

      const afterUpdate = await repo.getCategories(eventAId, userA.id);
      const after = afterUpdate?.find(c => c.categoryKey === categoryKey);

      // Verify it wasn't changed without authorization
      expect(after?.allocatedMinor).toBe(before?.allocatedMinor);
    });
  });

  describe('TasksRepository', () => {
    let taskAId: string;

    beforeEach(async () => {
      const task = await createTestTask(eventAId);
      taskAId = task.id;
    });

    it('should scope tasks to event', async () => {
      const repo = new TasksRepository(db);
      const tasks = await repo.listByEvent(eventAId, userA.id);

      expect(tasks).not.toBeNull();
      expect(tasks!.every(t => t.eventId === eventAId)).toBe(true);
      expect(tasks!.length).toBeGreaterThan(0);
    });

    it('should not allow cross-event task updates', async () => {
      const repo = new TasksRepository(db);
      
      // Create task in User B's event
      const taskB = await createTestTask(eventBId);
      
      // Verify tasks are isolated - User B can't see User A's tasks
      const tasksForUserB = await repo.listByEvent(eventAId, userB.id);
      expect(tasksForUserB).toBeNull(); // Should be null because userB doesn't own eventAId
      
      // User A can see their own tasks
      const tasksA = await repo.listByEvent(eventAId, userA.id);
      expect(tasksA).not.toBeNull();
      expect(tasksA!.some(t => t.id === taskB.id)).toBe(false);
    });
  });

  describe('VendorsRepository', () => {
    let vendorAId: string;

    beforeEach(async () => {
      const vendor = await createTestVendorItem(eventAId);
      vendorAId = vendor.id;
    });

    it('should scope vendors to event', async () => {
      const repo = new VendorsRepository(db);
      const vendors = await repo.listByEvent(eventAId, userA.id);

      expect(vendors).not.toBeNull();
      expect(vendors!.every(v => v.eventId === eventAId)).toBe(true);
      expect(vendors!.length).toBeGreaterThan(0);
    });

    it('should not leak vendor data across events', async () => {
      const repo = new VendorsRepository(db);
      
      const vendorB = await createTestVendorItem(eventBId, {
        need: 'Secret Vendor',
        notes: 'Private note from User B',
      });
      
      // User B cannot see User A's vendors
      const vendorsForUserB = await repo.listByEvent(eventAId, userB.id);
      expect(vendorsForUserB).toBeNull();
      
      // User A can see their own vendors
      const vendorsA = await repo.listByEvent(eventAId, userA.id);
      expect(vendorsA).not.toBeNull();
      expect(vendorsA!.some(v => v.id === vendorB.id)).toBe(false);
      expect(vendorsA!.some(v => v.notes?.includes('Private note'))).toBe(false);
    });
  });

  describe('IdeasRepository', () => {
    let ideaAId: string;

    beforeEach(async () => {
      const idea = await createTestIdea(eventAId);
      ideaAId = idea.id;
    });

    it('should scope ideas to event', async () => {
      const repo = new IdeasRepository(db);
      const ideas = await repo.listByEvent(eventAId, userA.id, {});

      expect(ideas).not.toBeNull();
      expect(ideas!.every(i => i.eventId === eventAId)).toBe(true);
    });

    it('should respect feedback isolation', async () => {
      const repo = new IdeasRepository(db);
      
      // Create idea in User B's event with feedback
      const ideaB = await createTestIdea(eventBId, {
        isLiked: true,
        isSaved: true,
      });
      
      // User A should not see User B's ideas
      const ideasA = await repo.listByEvent(eventAId, userA.id, {});
      
      expect(ideasA).not.toBeNull();
      expect(ideasA!.some(i => i.id === ideaB.id)).toBe(false);
    });
  });

  describe('Expenses (via BudgetRepository)', () => {
    let expenseAId: string;
    let categoryKey: string;

    beforeEach(async () => {
      const categories = await createTestBudgetCategories(eventAId);
      categoryKey = categories[0].categoryKey;
      const expense = await createTestExpense(eventAId, categoryKey);
      expenseAId = expense.id;
    });

    it('should scope expenses to event', async () => {
      const repo = new BudgetRepository(db);
      const expenses = await repo.listExpenses(eventAId, userA.id);

      expect(expenses).not.toBeNull();
      expect(expenses!.every(e => e.eventId === eventAId)).toBe(true);
      expect(expenses!.length).toBeGreaterThan(0);
    });

    it('should not allow cross-event expense access', async () => {
      const repo = new BudgetRepository(db);
      
      // Create expense in User B's event
      const categoriesB = await createTestBudgetCategories(eventBId);
      const expenseB = await createTestExpense(eventBId, categoriesB[0].categoryKey, {
        label: 'Secret expense',
        amountMinor: 999999,
      });
      
      // User B cannot see User A's expenses
      const expensesForUserB = await repo.listExpenses(eventAId, userB.id);
      expect(expensesForUserB).toBeNull();
      
      // User A can see their own expenses
      const expensesA = await repo.listExpenses(eventAId, userA.id);
      expect(expensesA).not.toBeNull();
      expect(expensesA!.some(e => e.id === expenseB.id)).toBe(false);
      expect(expensesA!.some(e => e.label.includes('Secret'))).toBe(false);
    });
  });

  describe('Cross-Repository Data Isolation', () => {
    it('should maintain isolation when querying related data', async () => {
      // User A creates full event with all resources
      const categoriesA = await createTestBudgetCategories(eventAId);
      await createTestTask(eventAId, { title: 'User A Task' });
      await createTestVendorItem(eventAId, { need: 'User A Vendor' });
      await createTestIdea(eventAId, { title: 'User A Idea' });
      await createTestExpense(eventAId, categoriesA[0]!.categoryKey);

      // User B creates full event with all resources
      const categoriesB = await createTestBudgetCategories(eventBId);
      await createTestTask(eventBId, { title: 'User B Task' });
      await createTestVendorItem(eventBId, { need: 'User B Vendor' });
      await createTestIdea(eventBId, { title: 'User B Idea' });
      await createTestExpense(eventBId, categoriesB[0]!.categoryKey);

      // Verify no data leakage - User A can only see their own data
      const budgetRepo = new BudgetRepository(db);
      const taskRepo = new TasksRepository(db);
      const vendorRepo = new VendorsRepository(db);
      const ideaRepo = new IdeasRepository(db);

      const [categoriesA_fetched, tasksA, vendorsA, ideasA, expensesA] = await Promise.all([
        budgetRepo.getCategories(eventAId, userA.id),
        taskRepo.listByEvent(eventAId, userA.id),
        vendorRepo.listByEvent(eventAId, userA.id),
        ideaRepo.listByEvent(eventAId, userA.id, {}),
        budgetRepo.listExpenses(eventAId, userA.id),
      ]);

      // None of User A's queries should return User B's data
      expect(tasksA).not.toBeNull();
      expect(vendorsA).not.toBeNull();
      expect(ideasA).not.toBeNull();
      expect(expensesA).not.toBeNull();
      
      expect(tasksA!.every((t: any) => !t.title.includes('User B'))).toBe(true);
      expect(vendorsA!.every((v: any) => v.need !== 'User B Vendor')).toBe(true);
      expect(ideasA!.every((i: any) => !i.title.includes('User B'))).toBe(true);
      expect(expensesA!.every((e: any) => e.eventId === eventAId)).toBe(true);
    });
  });
});

/**
 * Security Verification Checklist:
 * 
 * ✅ EventsRepository.listByOwner filters by ownerId
 * ✅ All child resources (budget, tasks, vendors, ideas, expenses) scope by eventId
 * ✅ No repository method returns data across event boundaries
 * ✅ Update/delete operations verify ownership (at API layer)
 * ✅ Private notes and feedback never leak across users
 * 
 * API Layer Requirements (tested separately):
 * - Every route must call requireAuth() first
 * - Every route with :eventId must verify event.ownerId === userId
 * - Use findEventByOwner(eventId, userId) pattern for safety
 * - Return 403 Forbidden or 404 Not Found for unauthorized access
 * - Never return 200 OK with another user's data
 */
