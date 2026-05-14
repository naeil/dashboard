ALTER TABLE order_item
    DROP COLUMN IF EXISTS pay_amount,
    DROP COLUMN IF EXISTS gross_amount,
    DROP COLUMN IF EXISTS discount_amount,
    DROP COLUMN IF EXISTS shipping_fee,
    DROP COLUMN IF EXISTS cancel_amount,
    DROP COLUMN IF EXISTS net_revenue;
