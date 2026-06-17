-- =====================================================================
-- 遷移：後台可管理「學制 / 活動大類 / 活動類型」選項 + 三指標視圖改用 metric_group
-- 在既有資料庫上執行（Supabase SQL Editor 貼上即可）。可重複執行（idempotent）。
-- 版本：v1.1.0
-- =====================================================================

-- ---------- 選項表（學制 / 活動大類 / 活動類型）----------
create table if not exists options (
  id           bigint generated always as identity primary key,
  kind         text not null check (kind in ('degree','category','type')),
  value        text not null,                 -- 實際存入 activities 的字串（建立後不可改）
  label        text,                          -- 顯示文字（留空＝同 value）
  parent       text,                          -- 僅「活動類型」使用：所屬大類的 value
  metric_group text check (metric_group in ('outbound','conference')), -- 僅「活動大類」使用：歸入哪組指標
  sort_order   int  not null default 0,
  active       boolean not null default true,  -- 停用＝不再出現在填報下拉（但保留以維持歷史對應）
  created_at   timestamptz not null default now()
);
create unique index if not exists uq_options_kind_value_parent
  on options(kind, value, coalesce(parent, ''));

alter table options enable row level security;

-- ---------- 移除 activities 的固定 CHECK，改由選項表 + API 驗證 ----------
alter table activities drop constraint if exists activities_degree_check;
alter table activities drop constraint if exists activities_category_check;

-- ---------- 重建三指標視圖：依大類的 metric_group 分組（支援自訂大類）----------
-- 找不到對應大類時預設歸 conference（與舊行為相容：只有「出國交流」計入出國人次）。
-- 注意：act_count 放在最後一欄，CREATE OR REPLACE 才能在既有視圖上追加欄位（不可在中間插入）。
create or replace view v_activity_metrics as
select
  a.period_id,
  a.unit_id,
  coalesce(sum(a.headcount) filter (where coalesce(c.metric_group, 'conference') = 'outbound'), 0)     as outbound_pax,
  count(*)                  filter (where coalesce(c.metric_group, 'conference') = 'conference')       as conf_sessions,
  coalesce(sum(a.headcount) filter (where coalesce(c.metric_group, 'conference') = 'conference'), 0)   as conf_pax,
  count(*)                                                                                             as act_count
from activities a
left join options c on c.kind = 'category' and c.value = a.category
group by a.period_id, a.unit_id;

-- ---------- 選項種子（對應目前硬編碼的預設值）----------
insert into options (kind, value, label, parent, metric_group, sort_order) values
 ('degree','學士',         null, null, null, 1),
 ('degree','碩士',         null, null, null, 2),
 ('degree','博士',         null, null, null, 3),
 ('degree','碩士在職專班', null, null, null, 4),
 ('category','出國交流',           '出國交流',              null, 'outbound',   1),
 ('category','研討會工作營工作坊', '研討會 / 工作營 / 工作坊', null, 'conference', 2),
 ('type','移地教學',     null, '出國交流', null, 1),
 ('type','文化交流團',   null, '出國交流', null, 2),
 ('type','國際參訪',     null, '出國交流', null, 3),
 ('type','境外實習',     null, '出國交流', null, 4),
 ('type','境外工作營',   null, '出國交流', null, 5),
 ('type','國際競賽及展演', null, '出國交流', null, 6),
 ('type','國際研討會',   null, '研討會工作營工作坊', null, 1),
 ('type','工作營',       null, '研討會工作營工作坊', null, 2),
 ('type','工作坊',       null, '研討會工作營工作坊', null, 3)
on conflict do nothing;
