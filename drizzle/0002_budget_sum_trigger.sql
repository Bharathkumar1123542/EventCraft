-- Migration 0002: Budget sum trigger
-- Spec: spec.md §5.2, DD-16
-- Enforces: SUM(budget_categories.allocated_minor) = events.total_budget_minor

-- Function to validate budget sum
CREATE OR REPLACE FUNCTION check_budget_sum()
RETURNS TRIGGER AS $$
DECLARE
  event_total BIGINT;
  category_sum BIGINT;
BEGIN
  -- Get the event's total budget
  SELECT total_budget_minor INTO event_total
  FROM events
  WHERE id = NEW.event_id;

  -- Calculate sum of all categories for this event
  SELECT COALESCE(SUM(allocated_minor), 0) INTO category_sum
  FROM budget_categories
  WHERE event_id = NEW.event_id;

  -- Enforce invariant
  IF category_sum != event_total THEN
    RAISE EXCEPTION 'Budget sum violation: categories sum to %, event total is %', 
      category_sum, event_total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT or UPDATE
CREATE TRIGGER budget_sum_check
  AFTER INSERT OR UPDATE ON budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION check_budget_sum();

-- Also prevent total_budget_minor changes if categories exist
CREATE OR REPLACE FUNCTION prevent_budget_change()
RETURNS TRIGGER AS $$
DECLARE
  category_count INTEGER;
BEGIN
  -- Only check if total_budget_minor changed
  IF NEW.total_budget_minor != OLD.total_budget_minor THEN
    SELECT COUNT(*) INTO category_count
    FROM budget_categories
    WHERE event_id = NEW.id;

    IF category_count > 0 THEN
      RAISE EXCEPTION 'Cannot change total_budget_minor after categories allocated';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_budget_change_check
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_budget_change();
