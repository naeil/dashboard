package naeil.dashboard.dto;

import java.math.BigDecimal;

public record ProductCostComponentViewDTO(
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
