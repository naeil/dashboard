package naeil.dashboard.dto;

import java.time.LocalDateTime;

public record InventoryAlertViewDTO(
        Long alertId,
        Long productId,
        Long brandId,
        String brandName,
        String productName,
        String skuCd,
        Long prodNo,
        Integer realStock,
        Integer safeStock,
        String message,
        LocalDateTime triggeredAt
) {
}
