-- Fix performance of unified views by limiting legacy data to active contracts only.
-- Active = cancelled IS NULL (~6.3K rows instead of 131K).
-- Closed legacy contracts will be added later via materialized views.

-- ---------------------------------------------------------------------------
-- 1. deals_unified — filter legacy to active contracts only
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS deals_unified;

CREATE OR REPLACE VIEW deals_unified AS
-- CRM deals (new records)
SELECT
    d.id,
    d.name,
    d.company_id,
    d.contact_ids,
    d.category,
    d.stage,
    d.description,
    d.amount,
    d.created_at,
    d.updated_at,
    d.archived_at,
    d.expected_closing_date,
    d.sales_id,
    d.index,
    d.item_description,
    d.deposit_amount,
    d.payment_frequency,
    d.next_payment_date,
    d.total_paid,
    d.contract_end_date,
    d.item_held_location,
    COALESCE(d.source, 'new') AS source,
    d.legacy_id
FROM deals d

UNION ALL

-- Legacy dispatch_report records (active only)
SELECT
    (1000000 + dr.id)::bigint AS id,
    dr.customer_name AS name,
    NULL::bigint AS company_id,
    ARRAY[]::bigint[] AS contact_ids,
    NULL::text AS category,
    CASE
        WHEN COALESCE(safe_numeric(dr.balance::text), 0) = 0 THEN 'paid-in-full'
        WHEN COALESCE(NULLIF(dr.payments_received, ''), '0') != '0' THEN 'in-progress'
        ELSE 'new'
    END AS stage,
    NULLIF(CONCAT_WS(' - ', NULLIF(dr.description, ''), NULLIF(CONCAT_WS(' ', NULLIF(dr.make, ''), NULLIF(dr.model, '')), '')), '') AS description,
    COALESCE(safe_numeric(dr.contract_value::text), 0)::bigint AS amount,
    COALESCE(parse_ddmmyyyy(dr.date_opened::text), dr.uploaded_at)::timestamptz AS created_at,
    COALESCE(parse_ddmmyyyy(dr.date_opened::text), dr.uploaded_at)::timestamptz AS updated_at,
    NULL::timestamptz AS archived_at,
    parse_ddmmyyyy(dr.date_opened::text)::date AS expected_closing_date,
    NULL::bigint AS sales_id,
    0::smallint AS index,
    NULLIF(CONCAT_WS(' ', NULLIF(dr.description, ''), NULLIF(dr.make, ''), NULLIF(dr.model, '')), '') AS item_description,
    COALESCE(safe_numeric(dr.installment_value::text), 0)::bigint AS deposit_amount,
    CASE
        WHEN dr.term_freq = 'w' THEN 'weekly'
        WHEN dr.term_freq = 'f' THEN 'fortnightly'
        ELSE 'weekly'
    END AS payment_frequency,
    NULL::date AS next_payment_date,
    (COALESCE(safe_numeric(dr.contract_value::text), 0) - COALESCE(safe_numeric(dr.balance::text), 0))::bigint AS total_paid,
    NULL::date AS contract_end_date,
    NULL::text AS item_held_location,
    'legacy'::text AS source,
    dr.plan_id AS legacy_id
FROM dispatch_report dr
WHERE dr.cancelled IS NULL;

GRANT SELECT ON deals_unified TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. payments_crm — filter legacy to active contracts only
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS payments_crm;

CREATE OR REPLACE VIEW payments_crm AS
-- CRM payments (new records)
SELECT
    cp.id,
    cp.deal_id,
    cp.amount,
    cp.payment_date,
    cp.payment_method,
    cp.receipt_number,
    cp.notes,
    cp.sales_id,
    cp.created_at,
    'new'::text AS source
FROM crm_payments cp

UNION ALL

-- Legacy payments (completed, active contracts only)
SELECT
    (10000000 + lp.id)::bigint AS id,
    (1000000 + dr.id)::bigint AS deal_id,
    COALESCE(safe_numeric(lp.actual_amount::text), safe_numeric(lp.scheduled_amount::text), 0)::bigint AS amount,
    COALESCE(parse_ddmmyyyy(lp.actual_date::text), parse_ddmmyyyy(lp.scheduled_date::text), now()::date) AS payment_date,
    COALESCE(lp.payment_method, 'Direct Debit') AS payment_method,
    lp.dd_transaction_id AS receipt_number,
    lp.notes,
    NULL::bigint AS sales_id,
    COALESCE(parse_ddmmyyyy(lp.actual_date::text), now())::timestamptz AS created_at,
    'legacy'::text AS source
FROM legacy_payments lp
JOIN dispatch_report dr ON lp.dd_plan_id = dr.plan_id
WHERE lp.status = 'completed'
  AND dr.cancelled IS NULL;

GRANT SELECT ON payments_crm TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. payment_schedule_crm — filter legacy to active contracts only
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS payment_schedule_crm;

CREATE OR REPLACE VIEW payment_schedule_crm AS
-- CRM payment schedule (new records)
SELECT
    ps.id,
    ps.deal_id,
    ps.installment_number,
    ps.due_date,
    ps.amount,
    ps.status,
    ps.paid_date,
    ps.payment_id,
    'new'::text AS source
FROM payment_schedule ps

UNION ALL

-- Legacy payments as schedule items (active contracts only)
SELECT
    (10000000 + lp.id)::bigint AS id,
    (1000000 + dr.id)::bigint AS deal_id,
    COALESCE(safe_numeric(lp.payment_number::text), 0)::smallint AS installment_number,
    COALESCE(parse_ddmmyyyy(lp.scheduled_date::text), now()::date) AS due_date,
    COALESCE(safe_numeric(lp.scheduled_amount::text), 0)::bigint AS amount,
    CASE
        WHEN lp.status = 'completed' THEN 'paid'
        WHEN lp.status = 'failed' THEN 'overdue'
        ELSE 'pending'
    END::text AS status,
    CASE
        WHEN lp.status = 'completed' THEN parse_ddmmyyyy(lp.actual_date::text)
        ELSE NULL::date
    END AS paid_date,
    NULL::bigint AS payment_id,
    'legacy'::text AS source
FROM legacy_payments lp
JOIN dispatch_report dr ON lp.dd_plan_id = dr.plan_id
WHERE dr.cancelled IS NULL;

GRANT SELECT ON payment_schedule_crm TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Add index on dispatch_report.cancelled for filtering performance
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dispatch_report_cancelled
    ON dispatch_report (cancelled)
    WHERE cancelled IS NULL;
