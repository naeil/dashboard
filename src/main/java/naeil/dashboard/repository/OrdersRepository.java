package naeil.dashboard.repository;

import naeil.dashboard.entity.Orders;
import naeil.dashboard.dto.OrderClaimStatusCountDTO;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrdersRepository extends JpaRepository<Orders, String> {
    Optional<Orders> findByUniq(String uniq);
    List<Orders> findAllByCompanyId(Long companyId);

    @Query("""
        SELECT o
        FROM Orders o
        WHERE o.companyId = :companyId
          AND o.uniq <> :excludeUniq
          AND o.ordStatus IN :includedStatuses
          AND (:shopId IS NULL OR o.shopId = :shopId)
          AND (:productId IS NULL OR o.productId = :productId)
          AND (:skuCd IS NULL OR o.skuCd = :skuCd)
          AND COALESCE(o.ordTime, o.wdate) <= :referenceDateTime
        ORDER BY COALESCE(o.ordTime, o.wdate) DESC
        """)
    List<Orders> findRevenueCandidatesForReversal(
            @Param("companyId") Long companyId,
            @Param("excludeUniq") String excludeUniq,
            @Param("shopId") Long shopId,
            @Param("productId") Long productId,
            @Param("skuCd") String skuCd,
            @Param("referenceDateTime") LocalDateTime referenceDateTime,
            @Param("includedStatuses") List<String> includedStatuses,
            Pageable pageable
    );

    @Query("""
        SELECT COUNT(o) > 0
        FROM Orders o
        WHERE o.companyId = :companyId
          AND o.uniq <> :excludeUniq
          AND o.ordStatus IN :reversalStatuses
          AND (:shopId IS NULL OR o.shopId = :shopId)
          AND (:productId IS NULL OR o.productId = :productId)
          AND (:skuCd IS NULL OR o.skuCd = :skuCd)
          AND COALESCE(o.ordTime, o.wdate) >= :dayStart
          AND COALESCE(o.ordTime, o.wdate) < :dayEnd
        """)
    boolean existsCompletedReversalCandidate(
            @Param("companyId") Long companyId,
            @Param("excludeUniq") String excludeUniq,
            @Param("shopId") Long shopId,
            @Param("productId") Long productId,
            @Param("skuCd") String skuCd,
            @Param("dayStart") LocalDateTime dayStart,
            @Param("dayEnd") LocalDateTime dayEnd,
            @Param("reversalStatuses") List<String> reversalStatuses
    );

    @Query("""
        SELECT COUNT(DISTINCT o.customerId)
        FROM Orders o
        WHERE o.companyId = :companyId
          AND (:brandId IS NULL OR o.brandId = :brandId)
          AND o.customerId IS NOT NULL
          AND COALESCE(o.ordTime, o.wdate) >= :startDateTime
          AND COALESCE(o.ordTime, o.wdate) < :endDateTime
        """)
    Long countDistinctCustomersInPeriod(
            @Param("companyId") Long companyId,
            @Param("brandId") Long brandId,
            @Param("startDateTime") LocalDateTime startDateTime,
            @Param("endDateTime") LocalDateTime endDateTime
    );

    @Query("""
        SELECT COALESCE(SUM(CASE WHEN o.ordStatus = '취소완료' THEN 1 ELSE 0 END), 0) AS cancelStatusCount,
               COALESCE(SUM(CASE
                   WHEN o.ordStatus = '반품완료' THEN 1
                   ELSE 0
               END), 0) AS returnStatusCount
        FROM Orders o
        WHERE o.companyId = :companyId
          AND (:brandId IS NULL OR o.brandId = :brandId)
          AND COALESCE(o.ordTime, o.wdate) >= :startDateTime
          AND COALESCE(o.ordTime, o.wdate) < :endDateTime
        """)
    OrderClaimStatusCountDTO countClaimStatusesInPeriod(
            @Param("companyId") Long companyId,
            @Param("brandId") Long brandId,
            @Param("startDateTime") LocalDateTime startDateTime,
            @Param("endDateTime") LocalDateTime endDateTime
    );
}
