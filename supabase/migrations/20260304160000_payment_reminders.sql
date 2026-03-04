-- Function to process payment reminders daily
-- Creates tasks for staff when payments are upcoming or overdue
-- Escalates contracts that are severely overdue
create or replace function process_payment_reminders(
  days_before_due integer default 3,
  overdue_grace_days integer default 14,
  default_after_days integer default 30
)
returns jsonb
language plpgsql
security definer
as $$
declare
  reminder_count integer := 0;
  overdue_count integer := 0;
  defaulted_count integer := 0;
begin
  -- 1. Mark overdue schedule items
  update payment_schedule
  set status = 'overdue'
  where status = 'pending'
    and due_date < current_date;

  get diagnostics overdue_count = row_count;

  -- 2. Create reminder tasks for upcoming payments (due in X days)
  insert into tasks (contact_id, type, text, due_date, sales_id)
  select
    d.contact_ids[1],
    'payment-reminder',
    'Payment reminder: ' || d.name || ' - ' ||
      to_char(ps.amount / 100.0, 'FM$999,999,990.00') ||
      ' due ' || to_char(ps.due_date, 'DD Mon YYYY'),
    ps.due_date,
    d.sales_id
  from payment_schedule ps
  join deals d on d.id = ps.deal_id
  where ps.status = 'pending'
    and ps.due_date = current_date + days_before_due
    and d.archived_at is null
    -- Avoid duplicate tasks for the same installment
    and not exists (
      select 1 from tasks t
      where t.text like 'Payment reminder: ' || d.name || '%'
        and t.due_date = ps.due_date
        and t.done_date is null
    );

  get diagnostics reminder_count = row_count;

  -- 3. Create overdue notice tasks
  insert into tasks (contact_id, type, text, due_date, sales_id)
  select
    d.contact_ids[1],
    'overdue-notice',
    'OVERDUE: ' || d.name || ' - ' ||
      to_char(ps.amount / 100.0, 'FM$999,999,990.00') ||
      ' was due ' || to_char(ps.due_date, 'DD Mon YYYY'),
    current_date,
    d.sales_id
  from payment_schedule ps
  join deals d on d.id = ps.deal_id
  where ps.status = 'overdue'
    and ps.due_date = current_date - 1
    and d.archived_at is null
    and d.stage not in ('defaulted', 'cancelled', 'collected', 'paid-in-full')
    and not exists (
      select 1 from tasks t
      where t.text like 'OVERDUE: ' || d.name || '%'
        and t.due_date = current_date
        and t.done_date is null
    );

  -- 4. Create escalation tasks for payments overdue beyond grace period
  insert into tasks (contact_id, type, text, due_date, sales_id)
  select distinct on (d.id)
    d.contact_ids[1],
    'overdue-escalation',
    'ESCALATION: ' || d.name ||
      ' has payments overdue by ' ||
      (current_date - min(ps.due_date)) || ' days - contact manager',
    current_date,
    d.sales_id
  from payment_schedule ps
  join deals d on d.id = ps.deal_id
  where ps.status = 'overdue'
    and ps.due_date < current_date - overdue_grace_days
    and d.archived_at is null
    and d.stage not in ('defaulted', 'cancelled', 'collected', 'paid-in-full')
    and not exists (
      select 1 from tasks t
      where t.text like 'ESCALATION: ' || d.name || '%'
        and t.due_date = current_date
        and t.done_date is null
    )
  group by d.id, d.contact_ids, d.name, d.sales_id;

  -- 5. Auto-default contracts with no payment for 30+ days
  update deals
  set stage = 'defaulted',
      updated_at = now()
  where stage in ('deposit-paid', 'in-progress')
    and archived_at is null
    and id in (
      select distinct ps.deal_id
      from payment_schedule ps
      where ps.status = 'overdue'
        and ps.due_date < current_date - default_after_days
    )
    -- Only default if ALL remaining installments are overdue beyond threshold
    and not exists (
      select 1 from payment_schedule ps2
      where ps2.deal_id = deals.id
        and ps2.status = 'pending'
    );

  get diagnostics defaulted_count = row_count;

  return jsonb_build_object(
    'reminders_created', reminder_count,
    'overdue_marked', overdue_count,
    'contracts_defaulted', defaulted_count,
    'processed_at', now()
  );
end;
$$;
