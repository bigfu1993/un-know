package com.unknown.platform.common.security;

import com.unknown.platform.modules.auth.model.ClientRole;

/**
 * 客户端请求上下文，收敛 Authorization 令牌和已解析角色，供 Controller 方法直接声明参数注入使用，
 * 替代逐个方法手写 {@code @RequestHeader} 取两个原始请求头再手动调用
 * {@link ClientSessionService#resolveClientRole} 的重复写法。
 *
 * <p>目前只在新增/改造的接口上使用，存量接口仍保留原有的 {@code @RequestHeader} 写法，
 * 尚未做全项目迁移。</p>
 *
 * @param role 当前请求解析出的客户端角色
 * @param authorization 原始 Authorization 头，供需要登录用户 ID 的下游服务方法使用
 */
public record ClientRequestContext(ClientRole role, String authorization) {
}
