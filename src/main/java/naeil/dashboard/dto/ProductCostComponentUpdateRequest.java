package naeil.dashboard.dto;

import java.math.BigDecimal;

public record ProductCostComponentUpdateRequest(
        String componentName,
        String specification,
        BigDecimal specificationQuantity,
        String specificationUnit,
        BigDecimal unitPrice,
        BigDecimal quantity,
        BigDecimal totalAmount,
        BigDecimal productionQuantity,
        BigDecimal amount,
        Integer sortOrder
) {
}
