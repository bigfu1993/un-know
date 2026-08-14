package com.unknown.platform.modules.clientworkspace.model;

/**
 * 委托履约阶段动作请求体。
 *
 * <p>第一版使用一个动作字段承接服务方发起取消/完成、发布方确认取消/完成以及再次发布，避免为每个按钮拆分
 * 零散接口。服务层会根据当前登录用户身份和任务状态校验动作是否允许。</p>
 */
public record HuntingTaskFulfillmentActionRequest(
    String action
) {
}
