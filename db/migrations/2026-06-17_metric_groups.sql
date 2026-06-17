-- =====================================================================
-- 遷移：指標歸組（metric_groups）改為後台可增刪 + 指標彙總改為依歸組動態化
-- 在既有資料庫上執行（Supabase SQL Editor）。可重複執行（idempotent）。
-- 版本：v1.2.0
-- =====================================================================

-- ---------- 指標歸組 ----------
create table if not exists metric_groups (
  id             bigint generated always as identity primary key,
  key            text not null unique,            -- options.metric_group 所存的值
  label          text not null,                   -- 歸組顯示名稱
  count_sessions boolean not null default false,  -- 是否計「場次」（活動筆數）
  count_pax      boolean not null default true,   -- 是否計「人次」（人數加總）
  sessions_label text,                            -- 場次指標顯示名稱（留空＝{label}場次）
  pax_label      text,                            -- 人次指標顯示名稱（留空＝{label}人次）
  sort_order     int not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);
alter table metric_groups enable row level security;

-- ---------- 解除 options.metric_group 的固定限制（改為對應 metric_groups.key，由 API 驗證）----------
alter table options drop constraint if exists options_metric_group_check;

-- ---------- 內建兩組（對應原本的硬編碼行為）----------
insert into metric_groups (key, label, count_sessions, count_pax, sessions_label, pax_label, sort_order) values
 ('outbound',  '出國交流',                false, true, null,                          '出國交流人次',              1),
 ('conference','研討會 / 工作營 / 工作坊',  true,  true, '研討會/工作營/工作坊場次',     '研討會/工作營/工作坊人數',   2)
on conflict (key) do nothing;

-- ---------- 各系 × 期別 × 歸組 的彙總（場次＝活動筆數、人次＝人數加總）----------
create or replace view v_unit_group_metrics as
select
  a.period_id,
  a.unit_id,
  c.metric_group as group_key,
  count(*)                     as sessions,
  coalesce(sum(a.headcount),0) as pax
from activities a
join options c on c.kind = 'category' and c.value = a.category
where c.metric_group is not null
group by a.period_id, a.unit_id, c.metric_group;
