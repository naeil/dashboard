package naeil.dashboard.service;

import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import naeil.dashboard.common.exception.CustomException;
import naeil.dashboard.dto.InventoryAlertViewDTO;
import naeil.dashboard.dto.ProductSafeStockUpdateRequest;
import naeil.dashboard.dto.ProductSafeStockUpdateResponseDTO;
import naeil.dashboard.entity.Product;
import naeil.dashboard.repository.ProductRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryManagementService {

    private final ProductRepository productRepository;
    private final JdbcTemplate jdbcTemplate;

    public List<InventoryAlertViewDTO> getActiveInventoryAlerts(Long companyId, Long brandId) {
        String baseSql = """
                SELECT ia.id AS alert_id,
                       p.id AS product_id,
                       p.brand_id AS brand_id,
                       b.brand_name AS brand_name,
                       p.product_name AS product_name,
                       p.sku_cd AS sku_cd,
                       p.prod_no AS prod_no,
                       p.real_stock AS real_stock,
                       p.safe_stock AS safe_stock,
                       ia.message AS message,
                       ia.triggered_at AS triggered_at
                  FROM inventory_alert ia
                  JOIN product p ON p.id = ia.product_id
                  JOIN brand b ON b.id = p.brand_id
                 WHERE ia.company_id = ?
                   AND ia.is_active = TRUE
                   AND p.real_stock >= 0
                   AND p.product_name NOT LIKE '[\uC0D8\uD50C]%'
                   AND b.brand_name <> '미분류'
                """;

        String orderBy = """
                 ORDER BY ia.triggered_at DESC, p.product_name ASC
                """;

        if (brandId == null) {
            return jdbcTemplate.query(
                    baseSql + orderBy,
                    (rs, rowNum) -> new InventoryAlertViewDTO(
                            rs.getLong("alert_id"),
                            rs.getLong("product_id"),
                            rs.getLong("brand_id"),
                            rs.getString("brand_name"),
                            rs.getString("product_name"),
                            rs.getString("sku_cd"),
                            rs.getObject("prod_no", Long.class),
                            rs.getInt("real_stock"),
                            rs.getInt("safe_stock"),
                            rs.getString("message"),
                            rs.getTimestamp("triggered_at").toLocalDateTime()
                    ),
                    companyId
            );
        }

        return jdbcTemplate.query(
                baseSql + " AND p.brand_id = ? " + orderBy,
                (rs, rowNum) -> new InventoryAlertViewDTO(
                        rs.getLong("alert_id"),
                        rs.getLong("product_id"),
                        rs.getLong("brand_id"),
                        rs.getString("brand_name"),
                        rs.getString("product_name"),
                        rs.getString("sku_cd"),
                        rs.getObject("prod_no", Long.class),
                        rs.getInt("real_stock"),
                        rs.getInt("safe_stock"),
                        rs.getString("message"),
                        rs.getTimestamp("triggered_at").toLocalDateTime()
                ),
                companyId,
                brandId
        );
    }

    @Transactional
    public ProductSafeStockUpdateResponseDTO updateSafeStock(
            Long companyId,
            Long productId,
            ProductSafeStockUpdateRequest request
    ) {
        if (request == null || request.safeStock() == null) {
            throw new CustomException(400, "Safe stock is required");
        }

        int safeStock = request.safeStock();
        if (safeStock < 0) {
            throw new CustomException(400, "Safe stock cannot be negative");
        }

        Product product = productRepository.findByIdAndCompanyId(productId, companyId)
                .orElseThrow(() -> new CustomException(404, "Product not found"));

        product.setSafeStock(safeStock);
        product.setMdate(LocalDateTime.now());
        Product saved = productRepository.save(product);

        boolean warning = safeStock > 0 && saved.getRealStock() != null && saved.getRealStock() <= safeStock;
        return new ProductSafeStockUpdateResponseDTO(
                saved.getId(),
                saved.getRealStock(),
                saved.getSafeStock(),
                warning,
                saved.getMdate()
        );
    }
}
