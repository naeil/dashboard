package naeil.dashboard.repository;

import java.time.LocalDate;
import java.util.List;
import naeil.dashboard.dto.ProductMarketSalesDTO;
import naeil.dashboard.dto.ProductSalesDTO;
import naeil.dashboard.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    @Modifying
    void deleteByCompanyIdAndOrderUniq(Long companyId, String orderUniq);

    @Query(value = """
        WITH order_item_base AS (
            SELECT oi.company_id,
                   oi.order_uniq,
                   oi.shop_id,
                   oi.brand_id,
                   oi.product_id,
                   oi.order_date,
                   GREATEST(COALESCE(oi.pack_unit, 1), 1) AS weight_unit,
                   GREATEST(COALESCE(oi.item_quantity, 1), 1) AS item_quantity,
                   COALESCE(o.pay_amt, 0) AS order_pay_amount,
                   COALESCE(o.discount_amt, 0) AS order_discount_amount,
                   COALESCE(o.shipping_fee, 0) AS order_shipping_fee,
                   COALESCE(p.product_price, 0) AS product_price,
                   COALESCE(p.cost_price, 0) AS cost_price,
                   COALESCE(p.supply_price, 0) AS supply_price,
                   COALESCE(NULLIF(TRIM(p.product_group), ''), p.product_name) AS product_group,
                   p.product_name,
                   p.sku_cd AS external_product_id,
                   p.real_stock AS current_real_stock,
                   COALESCE(profile.sgna_cost, 0) AS sgna_cost,
                   COALESCE(profile.logistics_cost, 0) AS logistics_cost,
                   COALESCE(profile.packaging_cost, 0) AS packaging_cost,
                   COALESCE(profile.other_cost, 0) AS other_cost,
                   COALESCE(channel_cost.channel_fee_type, 'RATE') AS channel_fee_type,
                   COALESCE(channel_cost.channel_fee_value, 0) AS channel_fee_value,
                   COALESCE(channel_cost.ad_cost, 0) AS ad_cost,
                   COALESCE(channel_cost.return_exchange_cost, 0) AS return_exchange_cost,
                   SUM(GREATEST(COALESCE(oi.pack_unit, 1), 1))
                       OVER (PARTITION BY oi.company_id, oi.order_uniq) AS total_weight_unit
            FROM order_item oi
            JOIN orders o
              ON o.uniq = oi.order_uniq
             AND o.company_id = oi.company_id
            JOIN product p
              ON p.id = oi.product_id
            LEFT JOIN product_cost_profile profile
              ON profile.company_id = oi.company_id
             AND profile.product_id = oi.product_id
            LEFT JOIN product_channel_cost channel_cost
              ON channel_cost.company_id = oi.company_id
             AND channel_cost.product_id = oi.product_id
             AND channel_cost.shop_id = oi.shop_id
            WHERE oi.company_id = :companyId
              AND (:brandId IS NULL OR oi.brand_id = :brandId)
              AND oi.order_date BETWEEN :startDate AND :endDate
        ),
        order_item_metrics AS (
            SELECT *,
                   CASE
                       WHEN product_price > 0
                           THEN product_price * item_quantity
                       ELSE order_pay_amount * weight_unit / NULLIF(total_weight_unit, 0)
                   END AS sale_base_amount,
                   order_discount_amount * weight_unit / NULLIF(total_weight_unit, 0) AS allocated_discount_amount,
                   order_shipping_fee * weight_unit / NULLIF(total_weight_unit, 0) AS allocated_shipping_amount
            FROM order_item_base
        )
        SELECT MIN(product_id) AS productId,
               product_group AS productGroup,
               product_group AS productName,
               CASE
                   WHEN COUNT(DISTINCT external_product_id) = 1 THEN MAX(external_product_id)
                   ELSE NULL
               END AS externalProductId,
               COUNT(DISTINCT product_id) AS skuCount,
               CAST(COALESCE(SUM(current_real_stock), 0) AS integer) AS currentRealStock,
               COUNT(DISTINCT order_uniq) AS totalOrderCount,
               ROUND(COALESCE(SUM(sale_base_amount + allocated_shipping_amount - allocated_discount_amount), 0), 0) AS totalGrossAmount,
               ROUND(COALESCE(SUM(allocated_discount_amount), 0), 0) AS totalDiscountAmount,
               ROUND(COALESCE(SUM(sale_base_amount - allocated_discount_amount), 0), 0) AS totalNetRevenue,
               ROUND(COALESCE(SUM(allocated_shipping_amount), 0), 0) AS totalShippingFee,
               ROUND(
                   CASE
                       WHEN COUNT(DISTINCT order_uniq) = 0 THEN 0
                       ELSE COALESCE(SUM(sale_base_amount + allocated_shipping_amount - allocated_discount_amount), 0)
                            / COUNT(DISTINCT order_uniq)
                   END,
                   0
               ) AS averageOrderValue,
               ROUND(COALESCE(SUM(
                   (sale_base_amount + allocated_shipping_amount - allocated_discount_amount)
                   - (
                       (cost_price + sgna_cost + logistics_cost + packaging_cost + other_cost) * item_quantity
                   )
                   - (
                       CASE
                           WHEN channel_fee_type = 'RATE'
                               THEN (sale_base_amount + allocated_shipping_amount - allocated_discount_amount)
                                    * channel_fee_value / 100
                           ELSE channel_fee_value
                       END
                   )
                   - ad_cost
                   - return_exchange_cost
               ), 0), 0) AS profitAmount
        FROM order_item_metrics
        GROUP BY product_group
        ORDER BY totalGrossAmount DESC, product_group ASC
        """, nativeQuery = true)
    List<ProductSalesDTO> findSalesByProduct(
            @Param("companyId") Long companyId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("brandId") Long brandId
    );

    @Query(value = """
        WITH order_item_base AS (
            SELECT oi.company_id,
                   oi.order_uniq,
                   oi.shop_id,
                   oi.product_id,
                   oi.order_date,
                   GREATEST(COALESCE(oi.pack_unit, 1), 1) AS weight_unit,
                   GREATEST(COALESCE(oi.item_quantity, 1), 1) AS item_quantity,
                   COALESCE(o.pay_amt, 0) AS order_pay_amount,
                   COALESCE(o.discount_amt, 0) AS order_discount_amount,
                   COALESCE(o.shipping_fee, 0) AS order_shipping_fee,
                   COALESCE(p.product_price, 0) AS product_price,
                   COALESCE(p.cost_price, 0) AS cost_price,
                   COALESCE(p.supply_price, 0) AS supply_price,
                   COALESCE(NULLIF(TRIM(p.product_group), ''), p.product_name) AS product_group,
                   COALESCE(profile.sgna_cost, 0) AS sgna_cost,
                   COALESCE(profile.logistics_cost, 0) AS logistics_cost,
                   COALESCE(profile.packaging_cost, 0) AS packaging_cost,
                   COALESCE(profile.other_cost, 0) AS other_cost,
                   COALESCE(channel_cost.channel_fee_type, 'RATE') AS channel_fee_type,
                   COALESCE(channel_cost.channel_fee_value, 0) AS channel_fee_value,
                   COALESCE(channel_cost.ad_cost, 0) AS ad_cost,
                   COALESCE(channel_cost.return_exchange_cost, 0) AS return_exchange_cost,
                   s.shop_name,
                   s.shop_code,
                   SUM(GREATEST(COALESCE(oi.pack_unit, 1), 1))
                       OVER (PARTITION BY oi.company_id, oi.order_uniq) AS total_weight_unit
            FROM order_item oi
            JOIN orders o
              ON o.uniq = oi.order_uniq
             AND o.company_id = oi.company_id
            JOIN product p
              ON p.id = oi.product_id
            JOIN shop s
              ON s.id = oi.shop_id
            LEFT JOIN product_cost_profile profile
              ON profile.company_id = oi.company_id
             AND profile.product_id = oi.product_id
            LEFT JOIN product_channel_cost channel_cost
              ON channel_cost.company_id = oi.company_id
             AND channel_cost.product_id = oi.product_id
             AND channel_cost.shop_id = oi.shop_id
            WHERE oi.company_id = :companyId
              AND COALESCE(NULLIF(TRIM(p.product_group), ''), p.product_name) = :productGroup
              AND oi.order_date BETWEEN :startDate AND :endDate
        ),
        order_item_metrics AS (
            SELECT *,
                   CASE
                       WHEN product_price > 0
                           THEN product_price * item_quantity
                       ELSE order_pay_amount * weight_unit / NULLIF(total_weight_unit, 0)
                   END AS sale_base_amount,
                   order_discount_amount * weight_unit / NULLIF(total_weight_unit, 0) AS allocated_discount_amount,
                   order_shipping_fee * weight_unit / NULLIF(total_weight_unit, 0) AS allocated_shipping_amount
            FROM order_item_base
        )
        SELECT shop_id AS shopId,
               shop_name AS shopName,
               shop_code AS shopCode,
               COUNT(DISTINCT order_uniq) AS totalOrderCount,
               ROUND(COALESCE(SUM(sale_base_amount + allocated_shipping_amount - allocated_discount_amount), 0), 0) AS totalGrossAmount,
               ROUND(COALESCE(SUM(allocated_discount_amount), 0), 0) AS totalDiscountAmount,
               ROUND(COALESCE(SUM(sale_base_amount - allocated_discount_amount), 0), 0) AS totalNetRevenue,
               ROUND(COALESCE(SUM(allocated_shipping_amount), 0), 0) AS totalShippingFee,
               ROUND(
                   CASE
                       WHEN COUNT(DISTINCT order_uniq) = 0 THEN 0
                       ELSE COALESCE(SUM(sale_base_amount + allocated_shipping_amount - allocated_discount_amount), 0)
                            / COUNT(DISTINCT order_uniq)
                   END,
                   0
               ) AS averageOrderValue,
               ROUND(COALESCE(SUM(
                   (cost_price + sgna_cost + logistics_cost + packaging_cost + other_cost) * item_quantity
               ), 0), 0) AS baseCostAmount,
               ROUND(COALESCE(SUM(
                   CASE
                       WHEN channel_fee_type = 'RATE'
                           THEN (sale_base_amount + allocated_shipping_amount - allocated_discount_amount)
                                * channel_fee_value / 100
                       ELSE channel_fee_value
                   END
               ), 0), 0) AS channelFeeAmount,
               ROUND(COALESCE(SUM(ad_cost), 0), 0) AS adCostAmount,
               ROUND(COALESCE(SUM(return_exchange_cost), 0), 0) AS returnExchangeCostAmount,
               ROUND(COALESCE(SUM(
                   (sale_base_amount + allocated_shipping_amount - allocated_discount_amount)
                   - (
                       (cost_price + sgna_cost + logistics_cost + packaging_cost + other_cost) * item_quantity
                   )
                   - (
                       CASE
                           WHEN channel_fee_type = 'RATE'
                               THEN (sale_base_amount + allocated_shipping_amount - allocated_discount_amount)
                                    * channel_fee_value / 100
                           ELSE channel_fee_value
                       END
                   )
                   - ad_cost
                   - return_exchange_cost
               ), 0), 0) AS profitAmount,
               CASE
                   WHEN COUNT(DISTINCT channel_fee_type || ':' || channel_fee_value) = 1 THEN MAX(channel_fee_type)
                   ELSE 'MIXED'
               END AS channelFeeType,
               ROUND(
                   CASE
                       WHEN COUNT(DISTINCT channel_fee_type || ':' || channel_fee_value) = 1 THEN MAX(channel_fee_value)
                       ELSE 0
                   END,
                   2
               ) AS channelFeeValue,
               ROUND(CASE WHEN COUNT(DISTINCT ad_cost) = 1 THEN MAX(ad_cost) ELSE 0 END, 2) AS adCost,
               ROUND(CASE WHEN COUNT(DISTINCT return_exchange_cost) = 1 THEN MAX(return_exchange_cost) ELSE 0 END, 2) AS returnExchangeCost,
               CAST(NULL AS numeric) AS salePrice,
               CAST(NULL AS numeric) AS costPrice,
               CAST(NULL AS numeric) AS supplyPrice,
               CAST(NULL AS numeric) AS sgnaCost,
               CAST(NULL AS numeric) AS logisticsCost,
               CAST(NULL AS numeric) AS packagingCost,
               CAST(NULL AS numeric) AS otherCost
        FROM order_item_metrics
        GROUP BY shop_id, shop_name, shop_code
        ORDER BY totalGrossAmount DESC, shop_name ASC
        """, nativeQuery = true)
    List<ProductMarketSalesDTO> findSalesByProductGroupAndShop(
            @Param("companyId") Long companyId,
            @Param("productGroup") String productGroup,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
