package com.unknown.platform.modules.clientworkspace.model;

/**
 * 委托/狩猎业务的任务状态和报价协商状态常量。
 *
 * <p>任务主状态对外保持“发布、报价、履约中、完成、取消、异常”六类；报价状态用于描述双方协商权归属，
 * 不直接替代任务主状态。</p>
 */
public final class HuntingWorkflowStatus {
  public static final String TASK_PUBLISHED = "发布";
  public static final String TASK_QUOTE = "报价";
  public static final String TASK_FULFILLING = "履约中";
  public static final String TASK_COMPLETED = "完成";
  public static final String TASK_CANCELLED = "取消";
  public static final String TASK_EXCEPTION = "异常";

  public static final String QUOTE_LEGACY_WAITING = "待确认";
  public static final String QUOTE_WAITING_PUBLISHER = "待发布方确认";
  public static final String QUOTE_WAITING_HUNTER = "待服务方确认";
  public static final String QUOTE_CONFIRMED = "已确认";
  public static final String QUOTE_REJECTED = "已拒绝";
  public static final String QUOTE_NOT_SELECTED = "未选中";

  private HuntingWorkflowStatus() {
    throw new IllegalStateException("状态常量类不允许实例化");
  }
}
