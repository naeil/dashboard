package naeil.dashboard.dto;

import java.time.LocalDateTime;

public record RegisteredOpenMarketDto(
        Long shopId,
        String shopName,
        String shopCode,
        String color,
        LocalDateTime createdAt
) {
}
