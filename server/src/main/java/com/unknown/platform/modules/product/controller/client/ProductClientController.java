package com.unknown.platform.modules.product.controller.client;

import com.unknown.platform.common.api.ApiResponse;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 客户端商品接口，承接学生和家长的优选商品列表与购买下单流程。 */
@RestController
@RequestMapping("/api/client/products")
public class ProductClientController {
  private final ProductAppService productAppService;

  public ProductClientController(ProductAppService productAppService) {
    this.productAppService = productAppService;
  }

  /**
   * 查询当前角色可见商品。
   *
   * @param role 当前角色
   * @return 商品列表
   */
  @GetMapping
  public ApiResponse<List<ProductSummary>> list(@RequestParam(defaultValue = "student") ClientRole role) {
    return ApiResponse.ok(productAppService.listProducts(role));
  }

  /**
   * 创建商品购买订单。
   *
   * @param request 购买请求
   * @return 订单创建结果
   */
  @PostMapping("/purchase")
  public ApiResponse<PurchaseResponse> purchase(@Valid @RequestBody PurchaseRequest request) {
    return ApiResponse.ok(productAppService.purchase(request));
  }
}
