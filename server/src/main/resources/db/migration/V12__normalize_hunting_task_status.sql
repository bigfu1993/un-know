UPDATE hunting_task
SET status = CASE
  WHEN status IN ('待领取', '已发布') THEN '发布'
  WHEN status IN ('报价中', '待协商', '报价待确认', '待确认金额') THEN '报价'
  WHEN status IN ('进行中', '已领取') THEN '履约中'
  WHEN status IN ('已完成') THEN '完成'
  WHEN status IN ('已取消') THEN '取消'
  WHEN status IN ('争议') THEN '异常'
  ELSE status
END
WHERE status IN (
  '待领取', '已发布', '报价中', '待协商', '报价待确认', '待确认金额',
  '进行中', '已领取', '已完成', '已取消', '争议'
);
