package naeil.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface ShopTrendSalesRowDTO {
    LocalDate getDate();
    String getShopCode();
    String getShopName();
    String getColor();
    BigDecimal getNetRevenue();
}
