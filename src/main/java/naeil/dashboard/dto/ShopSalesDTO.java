package naeil.dashboard.dto;

import java.math.BigDecimal;

/**
 * JPA projection interface for shop-level sales aggregation.
 */
public interface ShopSalesDTO {
    Long getShopId();
    String getShopName();
    String getShopCode();
    String getColor();
    BigDecimal getTotalGrossAmount();
    BigDecimal getTotalDiscountAmount();
    BigDecimal getTotalNetRevenue();
    BigDecimal getTotalShippingFee();
}
