CREATE TABLE IF NOT EXISTS order_item (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    order_uniq VARCHAR(50) NOT NULL,
    shop_id BIGINT NOT NULL,
    brand_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    order_date DATE NOT NULL,
    sku_cd VARCHAR(100),
    prod_no BIGINT,
    product_name VARCHAR(255) NOT NULL,
    ord_opt_seq INTEGER,
    pack_unit INTEGER NOT NULL DEFAULT 1,
    opt_sale_cnt INTEGER NOT NULL DEFAULT 1,
    item_quantity INTEGER NOT NULL DEFAULT 1,
    pay_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    gross_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    shipping_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
    cancel_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    net_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_item_company_date
    ON order_item (company_id, order_date);

CREATE INDEX IF NOT EXISTS idx_order_item_order_uniq
    ON order_item (order_uniq);

CREATE INDEX IF NOT EXISTS idx_order_item_product
    ON order_item (product_id);

CREATE INDEX IF NOT EXISTS idx_order_item_shop
    ON order_item (shop_id);

INSERT INTO order_item (
    company_id,
    order_uniq,
    shop_id,
    brand_id,
    product_id,
    order_date,
    sku_cd,
    prod_no,
    product_name,
    ord_opt_seq,
    pack_unit,
    opt_sale_cnt,
    item_quantity,
    pay_amount,
    gross_amount,
    discount_amount,
    shipping_fee,
    cancel_amount,
    net_revenue
)
SELECT
    o.company_id,
    o.uniq,
    o.shop_id,
    o.brand_id,
    o.product_id,
    COALESCE((o.ord_time AT TIME ZONE 'Asia/Seoul')::date, (o.wdate AT TIME ZONE 'Asia/Seoul')::date),
    o.sku_cd,
    p.prod_no,
    COALESCE(p.product_name, o.sku_cd, o.uniq),
    1,
    1,
    1,
    1,
    COALESCE(o.pay_amt, 0),
    COALESCE(o.gross_amt, 0),
    COALESCE(o.discount_amt, 0),
    COALESCE(o.shipping_fee, 0),
    COALESCE(o.cancel_amt, 0),
    COALESCE(o.pay_amt, 0) + COALESCE(o.shipping_fee, 0) - COALESCE(o.discount_amt, 0)
FROM orders o
LEFT JOIN product p
       ON p.id = o.product_id
WHERE o.product_id IS NOT NULL
  AND COALESCE((o.ord_time AT TIME ZONE 'Asia/Seoul')::date, (o.wdate AT TIME ZONE 'Asia/Seoul')::date) IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM order_item oi
      WHERE oi.company_id = o.company_id
        AND oi.order_uniq = o.uniq
  );
