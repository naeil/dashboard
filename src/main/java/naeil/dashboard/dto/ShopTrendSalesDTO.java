package naeil.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ShopTrendSalesDTO(
        LocalDate date,
        String shopCode,
        String shopName,
        String color,
        BigDecimal netRevenue
) {
}
