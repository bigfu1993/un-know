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

@RestController
@RequestMapping("/api/client/products")
public class ProductClientController {
  private final ProductAppService productAppService;

  public ProductClientController(ProductAppService productAppService) {
    this.productAppService = productAppService;
  }

  @GetMapping
  public ApiResponse<List<ProductSummary>> list(@RequestParam(defaultValue = "student") ClientRole role) {
    return ApiResponse.ok(productAppService.listProducts(role));
  }

  @PostMapping("/purchase")
  public ApiResponse<PurchaseResponse> purchase(@Valid @RequestBody PurchaseRequest request) {
    return ApiResponse.ok(productAppService.purchase(request));
  }
}
