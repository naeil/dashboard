package naeil.dashboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(
        name = "order_item",
        indexes = {
                @Index(name = "idx_order_item_company_date", columnList = "company_id, order_date"),
                @Index(name = "idx_order_item_order_uniq", columnList = "order_uniq"),
                @Index(name = "idx_order_item_product", columnList = "product_id"),
                @Index(name = "idx_order_item_shop", columnList = "shop_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "order_uniq", nullable = false, length = 50)
    private String orderUniq;

    @Column(name = "shop_id", nullable = false)
    private Long shopId;

    @Column(name = "brand_id", nullable = false)
    private Long brandId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "order_date", nullable = false)
    private LocalDate orderDate;

    @Column(name = "sku_cd", length = 100)
    private String skuCd;

    @Column(name = "prod_no")
    private Long prodNo;

    @Column(name = "product_name", nullable = false, length = 255)
    private String productName;

    @Column(name = "ord_opt_seq")
    private Integer ordOptSeq;

    @Column(name = "pack_unit", nullable = false)
    private Integer packUnit;

    @Column(name = "opt_sale_cnt", nullable = false)
    private Integer optSaleCnt;

    @Column(name = "item_quantity", nullable = false)
    private Integer itemQuantity;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
