package com.unknown.platform.modules.product.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.common.realtime.ClientRealtimeService;
import com.unknown.platform.common.security.ClientRequestContext;
import com.unknown.platform.modules.product.application.ProductAppService;
import com.unknown.platform.modules.product.model.ProductSummary;
import com.unknown.platform.modules.product.model.PurchaseRequest;
import com.unknown.platform.modules.product.model.PurchaseResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 客户端商品接口，承接学生和家长的优选商品列表与购买下单流程。 */
@RestController
@RequestMapping("/client/products")
public class ProductClientController {
  private final ProductAppService productAppService;
  private final ClientRealtimeService clientRealtimeService;

  public ProductClientController(
      ProductAppService productAppService,
      ClientRealtimeService clientRealtimeService
  ) {
    this.productAppService = productAppService;
    this.clientRealtimeService = clientRealtimeService;
  }

  /**
   * 查询当前角色可见商品。
   *
   * @param context 客户端请求上下文（角色 + 登录令牌）
   * @return 商品列表
   */
  @GetMapping
  public ApiResponse<List<ProductSummary>> list(ClientRequestContext context) {
    return ApiResponse.ok(productAppService.listProducts(context.role()));
  }

  /**
   * 创建商品购买订单。
   *
   * @param context 客户端请求上下文（角色 + 登录令牌）
   * @param request 购买请求
   * @return 订单创建结果
   */
  @PostMapping("/purchase")
  public ApiResponse<PurchaseResponse> purchase(
      ClientRequestContext context,
      @Valid @RequestBody PurchaseRequest request
  ) {
    PurchaseResponse response = productAppService.purchase(request, context.role(), context.authorization());
    clientRealtimeService.publishOngoingOrdersChanged("purchase", response.orderId(), "product_purchased");
    return ApiResponse.ok(response);
  }
}
