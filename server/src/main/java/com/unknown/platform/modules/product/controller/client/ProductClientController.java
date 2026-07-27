package com.unknown.platform.modules.product.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.common.realtime.ClientRealtimeService;
import com.unknown.platform.common.security.ClientSessionService;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.product.application.ProductAppService;
import com.unknown.platform.modules.product.model.ProductSummary;
import com.unknown.platform.modules.product.model.PurchaseRequest;
import com.unknown.platform.modules.product.model.PurchaseResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 客户端商品接口，承接学生和家长的优选商品列表与购买下单流程。 */
@RestController
@RequestMapping("/api/client/products")
public class ProductClientController {
  private final ProductAppService productAppService;
  private final ClientSessionService clientSessionService;
  private final ClientRealtimeService clientRealtimeService;

  public ProductClientController(
      ProductAppService productAppService,
      ClientSessionService clientSessionService,
      ClientRealtimeService clientRealtimeService
  ) {
    this.productAppService = productAppService;
    this.clientSessionService = clientSessionService;
    this.clientRealtimeService = clientRealtimeService;
  }

  /**
   * 查询当前角色可见商品。
   *
   * @param authorization 登录访问令牌，可为空
   * @param clientRoleHeader 登录用户角色请求头
   * @return 商品列表
   */
  @GetMapping
  public ApiResponse<List<ProductSummary>> list(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = ClientSessionService.CLIENT_USER_ROLE_HEADER, required = false) String clientRoleHeader
  ) {
    ClientRole role = clientSessionService.resolveClientRole(authorization, clientRoleHeader);
    return ApiResponse.ok(productAppService.listProducts(role));
  }

  /**
   * 创建商品购买订单。
   *
   * @param authorization 登录访问令牌
   * @param clientRoleHeader 登录用户角色请求头
   * @param request 购买请求
   * @return 订单创建结果
   */
  @PostMapping("/purchase")
  public ApiResponse<PurchaseResponse> purchase(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = ClientSessionService.CLIENT_USER_ROLE_HEADER, required = false) String clientRoleHeader,
      @Valid @RequestBody PurchaseRequest request
  ) {
    ClientRole role = clientSessionService.resolveClientRole(authorization, clientRoleHeader);
    PurchaseResponse response = productAppService.purchase(request, role, authorization);
    clientRealtimeService.publishOngoingOrdersChanged("purchase", response.orderId(), "product_purchased");
    return ApiResponse.ok(response);
  }
}
