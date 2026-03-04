-- Fix duplicated item_description and add customer→contract linking

-- ---------------------------------------------------------------------------
-- 1. Recreate deals_unified with fixed item_description
-- ---------------------------------------------------------------------------
-- dispatch_report.description often duplicates make field content.
-- Use description alone for item_description; fall back to make + model only if
-- description is empty.
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
    -- description: combine make + model as secondary info (separate from item_description)
    NULLIF(CONCAT_WS(' ', NULLIF(dr.make, ''), NULLIF(dr.model, '')), '') AS description,
    COALESCE(safe_numeric(dr.contract_value::text), 0)::bigint AS amount,
    COALESCE(parse_ddmmyyyy(dr.date_opened::text), dr.uploaded_at)::timestamptz AS created_at,
    COALESCE(parse_ddmmyyyy(dr.date_opened::text), dr.uploaded_at)::timestamptz AS updated_at,
    NULL::timestamptz AS archived_at,
    CASE
        WHEN parse_ddmmyyyy(dr.date_opened::text) IS NOT NULL
             AND safe_numeric(dr.term::text) IS NOT NULL
        THEN (parse_ddmmyyyy(dr.date_opened::text) +
              (safe_numeric(dr.term::text) *
               CASE WHEN dr.term_freq = 'f' THEN 14 ELSE 7 END
              )::int * INTERVAL '1 day')::date
        ELSE NULL::date
    END AS expected_closing_date,
    NULL::bigint AS sales_id,
    0::smallint AS index,
    -- item_description: use description only (it already includes make info in most records)
    COALESCE(NULLIF(dr.description, ''), NULLIF(CONCAT_WS(' ', NULLIF(dr.make, ''), NULLIF(dr.model, '')), '')) AS item_description,
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
-- 2. Recreate contacts_summary with legacy_customer_name for linking
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS contacts_summary;

CREATE VIEW contacts_summary AS
-- CRM contacts
SELECT
    co.id,
    co.first_name,
    co.last_name,
    co.gender,
    co.title,
    co.email_jsonb,
    jsonb_path_query_array(co.email_jsonb, '$[*].email')::text AS email_fts,
    co.phone_jsonb,
    jsonb_path_query_array(co.phone_jsonb, '$[*].number')::text AS phone_fts,
    co.background,
    co.avatar,
    co.first_seen,
    co.last_seen,
    co.has_newsletter,
    co.status,
    co.tags,
    co.company_id,
    co.sales_id,
    co.linkedin_url,
    co.preferred_contact_method,
    co.date_of_birth,
    c.name AS company_name,
    COUNT(DISTINCT t.id) AS nb_tasks,
    'new'::text AS source,
    NULL::text AS legacy_customer_name
FROM contacts co
LEFT JOIN tasks t ON co.id = t.contact_id AND t.done_date IS NULL
LEFT JOIN companies c ON co.company_id = c.id
GROUP BY co.id, c.name

UNION ALL

-- Legacy customers from active dispatch_report
SELECT
    sub.id,
    sub.first_name,
    sub.last_name,
    NULL::text AS gender,
    NULL::text AS title,
    sub.email_jsonb,
    COALESCE(sub.customer_email, '')::text AS email_fts,
    sub.phone_jsonb,
    COALESCE(CONCAT_WS(' ', NULLIF(sub.customer_mobile, ''), NULLIF(sub.customer_phone, '')), '')::text AS phone_fts,
    NULLIF(CONCAT_WS(', ', NULLIF(sub.customer_address, ''), NULLIF(sub.customer_suburb, ''), NULLIF(sub.customer_city, ''), NULLIF(sub.customer_postcode, '')), '') AS background,
    NULL AS avatar,
    sub.first_seen,
    sub.first_seen AS last_seen,
    false AS has_newsletter,
    'active'::text AS status,
    ARRAY[]::bigint[] AS tags,
    NULL::bigint AS company_id,
    NULL::bigint AS sales_id,
    NULL::text AS linkedin_url,
    NULL::text AS preferred_contact_method,
    parse_ddmmyyyy(sub.customer_dob::text) AS date_of_birth,
    NULL::text AS company_name,
    0::bigint AS nb_tasks,
    'legacy'::text AS source,
    sub.customer_name AS legacy_customer_name
FROM (
    SELECT DISTINCT ON (customer_name)
        (2000000 + id)::bigint AS id,
        customer_name,
        CASE
            WHEN customer_name LIKE '%,%' THEN TRIM(SPLIT_PART(customer_name, ',', 2))
            ELSE TRIM(customer_name)
        END AS first_name,
        CASE
            WHEN customer_name LIKE '%,%' THEN TRIM(SPLIT_PART(customer_name, ',', 1))
            ELSE ''::text
        END AS last_name,
        customer_email,
        customer_phone,
        customer_mobile,
        customer_dob,
        customer_address,
        customer_suburb,
        customer_city,
        customer_postcode,
        CASE
            WHEN NULLIF(TRIM(customer_email), '') IS NOT NULL
            THEN jsonb_build_array(jsonb_build_object('email', TRIM(customer_email), 'type', 'Home'))
            ELSE '[]'::jsonb
        END AS email_jsonb,
        CASE
            WHEN NULLIF(TRIM(customer_mobile), '') IS NOT NULL AND NULLIF(TRIM(customer_phone), '') IS NOT NULL
            THEN jsonb_build_array(
                jsonb_build_object('number', TRIM(customer_mobile), 'type', 'Mobile'),
                jsonb_build_object('number', TRIM(customer_phone), 'type', 'Home')
            )
            WHEN NULLIF(TRIM(customer_mobile), '') IS NOT NULL
            THEN jsonb_build_array(jsonb_build_object('number', TRIM(customer_mobile), 'type', 'Mobile'))
            WHEN NULLIF(TRIM(customer_phone), '') IS NOT NULL
            THEN jsonb_build_array(jsonb_build_object('number', TRIM(customer_phone), 'type', 'Home'))
            ELSE '[]'::jsonb
        END AS phone_jsonb,
        COALESCE(parse_ddmmyyyy(date_opened::text), uploaded_at::date)::timestamptz AS first_seen
    FROM dispatch_report
    WHERE cancelled IS NULL
    ORDER BY customer_name, id
) sub;

GRANT SELECT ON contacts_summary TO authenticated;
