package naeil.dashboard.dto;

import java.math.BigDecimal;

public class SalesSummaryDTO {

    private final BigDecimal totalGrossAmount;
    private final BigDecimal totalDiscountAmount;
    private final BigDecimal totalNetRevenue;
    private final BigDecimal totalShippingFee;
    private final BigDecimal totalCancelAmount;
    private final Long cancelCount;
    private final Long cancelStatusCount;
    private final Long returnStatusCount;
    private final Long totalOrderCount;
    private final Long totalCustomerCount;
    private final BigDecimal profitAmount;

    public SalesSummaryDTO(
            BigDecimal totalGrossAmount,
            BigDecimal totalDiscountAmount,
            BigDecimal totalNetRevenue,
            BigDecimal totalShippingFee,
            BigDecimal totalCancelAmount,
            Long cancelCount,
            Long cancelStatusCount,
            Long returnStatusCount,
            Long totalOrderCount,
            Long totalCustomerCount,
            BigDecimal profitAmount
    ) {
        this.totalGrossAmount = totalGrossAmount;
        this.totalDiscountAmount = totalDiscountAmount;
        this.totalNetRevenue = totalNetRevenue;
        this.totalShippingFee = totalShippingFee;
        this.totalCancelAmount = totalCancelAmount;
        this.cancelCount = cancelCount;
        this.cancelStatusCount = cancelStatusCount;
        this.returnStatusCount = returnStatusCount;
        this.totalOrderCount = totalOrderCount;
        this.totalCustomerCount = totalCustomerCount;
        this.profitAmount = profitAmount;
    }

    public BigDecimal getTotalGrossAmount() {
        return totalGrossAmount;
    }

    public BigDecimal getTotalDiscountAmount() {
        return totalDiscountAmount;
    }

    public BigDecimal getTotalNetRevenue() {
        return totalNetRevenue;
    }

    public BigDecimal getTotalShippingFee() {
        return totalShippingFee;
    }

    public BigDecimal getTotalCancelAmount() {
        return totalCancelAmount;
    }

    public Long getCancelCount() {
        return cancelCount;
    }

    public Long getCancelStatusCount() {
        return cancelStatusCount;
    }

    public Long getReturnStatusCount() {
        return returnStatusCount;
    }

    public Long getTotalOrderCount() {
        return totalOrderCount;
    }

    public Long getTotalCustomerCount() {
        return totalCustomerCount;
    }

    public BigDecimal getProfitAmount() {
        return profitAmount;
    }
}
