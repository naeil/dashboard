package naeil.dashboard.dto;

import java.math.BigDecimal;

/**
 * JPA projection interface for product-level sales aggregation.
 * Used with Spring Data JPA interface-based projections without entity loading.
 */
public interface ProductSalesDTO {
    Long getProductId();
    String getProductGroup();
    String getProductName();
    String getExternalProductId();
    Long getSkuCount();
    Integer getCurrentRealStock();
    Long getTotalOrderCount();
    BigDecimal getTotalGrossAmount();
    BigDecimal getTotalDiscountAmount();
    BigDecimal getTotalNetRevenue();
    BigDecimal getTotalShippingFee();
    BigDecimal getAverageOrderValue();
    BigDecimal getProfitAmount();
}
