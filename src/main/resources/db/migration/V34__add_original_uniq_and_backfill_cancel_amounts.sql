ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS original_uniq VARCHAR(50);

WITH reversal_orders AS (
    SELECT
        r.uniq,
        COALESCE(src.gross_amt, src.pay_amt, 0) AS source_amount
    FROM orders r
    LEFT JOIN LATERAL (
        SELECT o.gross_amt, o.pay_amt
        FROM orders o
        WHERE o.company_id = r.company_id
          AND o.uniq <> r.uniq
          AND o.ord_status IN (
              '결제완료', '신규주문', '출고대기', '출고보류', '배송지시',
              '출고완료', '배송중', '배송완료', '구매결정', '취소요청',
              '반품요청', '반품접수', '반품회수완료', '교환요청',
              '교환접수', '교환회수완료', '매입취소요청', '주문확인',
              '주문보류', '판매완료'
          )
          AND o.shop_id = r.shop_id
          AND o.product_id = r.product_id
          AND COALESCE(o.sku_cd, '') = COALESCE(r.sku_cd, '')
          AND COALESCE(o.ord_time, o.wdate) <= COALESCE(r.ord_time, r.wdate)
        ORDER BY COALESCE(o.ord_time, o.wdate) DESC
        LIMIT 1
    ) src ON TRUE
    WHERE r.ord_status IN ('취소완료', '반품완료', '교환완료', '매입취소완료', '주문취소')
      AND COALESCE(r.cancel_amt, 0) = 0
      AND COALESCE(r.pay_amt, 0) = 0
)
UPDATE orders o
SET cancel_amt = ABS(ro.source_amount)
FROM reversal_orders ro
WHERE o.uniq = ro.uniq
  AND ABS(ro.source_amount) > 0;

UPDATE daily_sales_stats
SET cancel_amount = 0,
    cancel_count = 0;

WITH cancel_totals AS (
    SELECT
        company_id,
        COALESCE(ord_time::date, wdate::date) AS stat_date,
        shop_id,
        brand_id,
        product_id,
        ROUND(COALESCE(SUM(cancel_amt), 0), 0) AS total_cancel_amount,
        COUNT(*) AS total_cancel_count
    FROM orders
    WHERE ord_status IN ('취소완료', '반품완료', '교환완료', '매입취소완료', '주문취소')
    GROUP BY company_id, COALESCE(ord_time::date, wdate::date), shop_id, brand_id, product_id
)
UPDATE daily_sales_stats d
SET cancel_amount = ct.total_cancel_amount,
    cancel_count = ct.total_cancel_count
FROM cancel_totals ct
WHERE d.company_id = ct.company_id
  AND d.date = ct.stat_date
  AND d.shop_id = ct.shop_id
  AND d.brand_id = ct.brand_id
  AND d.product_id = ct.product_id;
