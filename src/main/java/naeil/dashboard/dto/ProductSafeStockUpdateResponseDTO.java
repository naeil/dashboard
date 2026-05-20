package naeil.dashboard.dto;

import java.time.LocalDateTime;

public record ProductSafeStockUpdateResponseDTO(
        Long productId,
        Integer realStock,
        Integer safeStock,
        Boolean warning,
        LocalDateTime mdate
) {
}
