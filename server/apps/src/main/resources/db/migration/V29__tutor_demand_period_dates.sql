ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS period_dates TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN tutor_demand.period_dates IS '家教计划周期实际选中的日期集合，顿号分隔的 YYYY-MM-DD 列表，允许不连续的零散日期；period_start/period_end 只是这个集合里的最早和最晚日期，仅作连续区间摘要展示用，不代表期间每天都被选中。';

-- 回填历史数据：把已有的连续 period_start~period_end 区间展开成完整日期集合，保持既有数据的语义（历史发布本来就是连续选择，展开后集合等价于原区间）。
UPDATE tutor_demand
SET period_dates = (
  SELECT string_agg(to_char(d, 'YYYY-MM-DD'), '、')
  FROM generate_series(period_start::date, period_end::date, interval '1 day') AS d
)
WHERE period_start ~ '^\d{4}-\d{2}-\d{2}$'
  AND period_end ~ '^\d{4}-\d{2}-\d{2}$'
  AND period_end::date >= period_start::date
  AND period_dates = '';
