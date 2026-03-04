-- Add layby-specific fields to deals table
alter table deals add column if not exists item_description text;
alter table deals add column if not exists deposit_amount bigint default 0;
alter table deals add column if not exists payment_frequency text default 'weekly';
alter table deals add column if not exists next_payment_date date;
alter table deals add column if not exists total_paid bigint default 0;
alter table deals add column if not exists contract_end_date date;
alter table deals add column if not exists item_held_location text;
