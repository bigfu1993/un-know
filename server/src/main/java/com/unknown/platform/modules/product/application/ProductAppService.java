package com.unknown.platform.modules.product.application;

import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.product.model.DeliveryMode;
import com.unknown.platform.modules.product.model.ProductSummary;
import com.unknown.platform.modules.product.model.PurchaseRequest;
import com.unknown.platform.modules.product.model.PurchaseResponse;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductAppService {
  private final JdbcTemplate jdbcTemplate;

  public ProductAppService(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<ProductSummary> listProducts(ClientRole role) {
    return jdbcTemplate.query(
        """
            SELECT public_id, title, category, source_label, model, description,
                   price_cents, retail_price_cents, service_fee_cents, stock,
                   location, urgency, delivery_modes
            FROM product
            WHERE visible = TRUE
              AND status = 'ON_SALE'
            ORDER BY source_type, updated_at DESC, id DESC
            """,
        (rs, rowNum) -> {
          List<DeliveryMode> modes = role == ClientRole.parent
              ? List.of(DeliveryMode.express)
              : parseDeliveryModes(rs.getString("delivery_modes"));
          return new ProductSummary(
              rs.getString("public_id"),
              rs.getString("title"),
              rs.getString("category"),
              rs.getString("source_label"),
              rs.getString("model"),
              rs.getString("description"),
              toAmount(rs.getLong("price_cents")),
              toAmount(rs.getLong("retail_price_cents")),
              toAmount(rs.getLong("service_fee_cents")),
              rs.getInt("stock"),
              rs.getString("location"),
              rs.getString("urgency"),
              modes
          );
        }
    );
  }

  @Transactional
  public PurchaseResponse purchase(PurchaseRequest request) {
    ProductRow product = findProductForUpdate(request.productId());
    int quantity = request.quantity() <= 0 ? 1 : request.quantity();
    if (quantity > product.stock()) {
      throw new BusinessException("STOCK_NOT_ENOUGH", "库存不足");
    }

    List<DeliveryMode> deliveryModes = request.role() == ClientRole.parent
        ? List.of(DeliveryMode.express)
        : parseDeliveryModes(product.deliveryModes());
    if (!deliveryModes.contains(request.deliveryMode())) {
      throw new BusinessException("DELIVERY_NOT_ALLOWED", "当前商品不支持该配送方式");
    }

    long buyerUserId = resolveRoleUser(request.role());
    long productAmountCents = product.priceCents() * quantity;
    long serviceFeeCents = product.serviceFeeCents();
    long deliveryFeeCents = deliveryFeeCents(request.deliveryMode());
    long payableAmountCents = productAmountCents + serviceFeeCents + deliveryFeeCents;
    String orderNo = "ORD" + UUID.randomUUID().toString().replace("-", "").substring(0, 18).toUpperCase();
    String status = "待配送/备货中";

    jdbcTemplate.update(
        "UPDATE product SET stock = stock - ?, updated_at = NOW() WHERE id = ?",
        quantity,
        product.id()
    );

    jdbcTemplate.update(
        """
            INSERT INTO purchase_order (
              order_no, buyer_user_id, product_id, quantity,
              product_amount_cents, service_amount_cents, delivery_fee_cents,
              total_amount_cents, status, delivery_mode, payment_method,
              contact_phone, detail, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            """,
        orderNo,
        buyerUserId,
        product.id(),
        quantity,
        productAmountCents,
        serviceFeeCents,
        deliveryFeeCents,
        payableAmountCents,
        status,
        request.deliveryMode().name(),
        request.paymentMethod().name(),
        "400-000-2026",
        "订单已写入云端 PostgreSQL，等待配送履约。"
    );

    jdbcTemplate.update(
        """
            INSERT INTO wallet_record (
              user_id, record_type, direction, amount_cents,
              related_biz_type, title, status
            )
            VALUES (?, 'PURCHASE', 'OUT', ?, 'PURCHASE_ORDER', ?, '已支付')
            """,
        buyerUserId,
        payableAmountCents,
        product.title()
    );

    return new PurchaseResponse(
        orderNo,
        product.publicId(),
        status,
        quantity,
        toAmount(productAmountCents),
        toAmount(serviceFeeCents),
        toAmount(deliveryFeeCents),
        toAmount(payableAmountCents),
        request.deliveryMode(),
        request.paymentMethod(),
        "400-000-2026",
        "真实订单已创建，库存和钱包流水已写入云端数据库。"
    );
  }

  private ProductRow findProductForUpdate(String publicId) {
    List<ProductRow> rows = jdbcTemplate.query(
        """
            SELECT id, public_id, title, price_cents, service_fee_cents, stock, delivery_modes
            FROM product
            WHERE public_id = ?
              AND visible = TRUE
              AND status = 'ON_SALE'
            FOR UPDATE
            """,
        (rs, rowNum) -> new ProductRow(
            rs.getLong("id"),
            rs.getString("public_id"),
            rs.getString("title"),
            rs.getLong("price_cents"),
            rs.getLong("service_fee_cents"),
            rs.getInt("stock"),
            rs.getString("delivery_modes")
        ),
        publicId
    );
    if (rows.isEmpty()) {
      throw new BusinessException("PRODUCT_NOT_FOUND", "商品不存在或不可购买");
    }
    return rows.get(0);
  }

  private long resolveRoleUser(ClientRole role) {
    List<Long> ids = jdbcTemplate.query(
        "SELECT id FROM app_user WHERE role = ? ORDER BY updated_at DESC, id DESC LIMIT 1",
        (rs, rowNum) -> rs.getLong("id"),
        role.name()
    );
    if (!ids.isEmpty()) {
      return ids.get(0);
    }

    return jdbcTemplate.queryForObject(
        """
            INSERT INTO app_user (phone, role, status, nickname, credit_score, profile_completion_required, account_label)
            VALUES (?, ?, 'ACTIVE', ?, ?, ?, ?)
            ON CONFLICT (phone, role) DO UPDATE SET updated_at = NOW()
            RETURNING id
            """,
        Long.class,
        role.name() + "_local",
        role.name(),
        role.name(),
        role == ClientRole.student ? 10 : 0,
        role != ClientRole.merchant,
        role.name()
    );
  }

  private List<DeliveryMode> parseDeliveryModes(String raw) {
    if (raw == null || raw.isBlank()) {
      return List.of(DeliveryMode.scheduled);
    }
    return Arrays.stream(raw.split(","))
        .map(String::trim)
        .filter(value -> !value.isEmpty())
        .map(DeliveryMode::valueOf)
        .toList();
  }

  private BigDecimal toAmount(long cents) {
    return BigDecimal.valueOf(cents, 2);
  }

  private long deliveryFeeCents(DeliveryMode deliveryMode) {
    return switch (deliveryMode) {
      case express -> 600;
      case immediate -> 400;
      case scheduled -> 200;
    };
  }

  private record ProductRow(
      long id,
      String publicId,
      String title,
      long priceCents,
      long serviceFeeCents,
      int stock,
      String deliveryModes
  ) {
  }
}
