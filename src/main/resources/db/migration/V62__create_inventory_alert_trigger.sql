CREATE TABLE IF NOT EXISTS inventory_alert (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    real_stock INTEGER NOT NULL DEFAULT 0,
    safe_stock INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_inventory_alert_product_type UNIQUE (product_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_inventory_alert_company_active
    ON inventory_alert(company_id, is_active);

CREATE OR REPLACE FUNCTION sync_inventory_low_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
    IF COALESCE(NEW.safe_stock, 0) > 0
       AND COALESCE(NEW.real_stock, 0) <= COALESCE(NEW.safe_stock, 0) THEN
        INSERT INTO inventory_alert (
            company_id,
            product_id,
            alert_type,
            message,
            real_stock,
            safe_stock,
            is_active,
            triggered_at,
            resolved_at,
            created_at,
            updated_at
        )
        VALUES (
            NEW.company_id,
            NEW.id,
            'LOW_SAFE_STOCK',
            CONCAT(NEW.product_name, ' 상품의 재고가 안전재고 이하입니다.'),
            COALESCE(NEW.real_stock, 0),
            COALESCE(NEW.safe_stock, 0),
            TRUE,
            CURRENT_TIMESTAMP,
            NULL,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (product_id, alert_type) DO UPDATE
        SET company_id = EXCLUDED.company_id,
            message = EXCLUDED.message,
            real_stock = EXCLUDED.real_stock,
            safe_stock = EXCLUDED.safe_stock,
            is_active = TRUE,
            resolved_at = NULL,
            triggered_at = CASE
                WHEN inventory_alert.is_active THEN inventory_alert.triggered_at
                ELSE CURRENT_TIMESTAMP
            END,
            updated_at = CURRENT_TIMESTAMP;
    ELSE
        UPDATE inventory_alert
           SET real_stock = COALESCE(NEW.real_stock, 0),
               safe_stock = COALESCE(NEW.safe_stock, 0),
               is_active = FALSE,
               resolved_at = CASE
                   WHEN is_active THEN CURRENT_TIMESTAMP
                   ELSE resolved_at
               END,
               updated_at = CURRENT_TIMESTAMP
         WHERE product_id = NEW.id
           AND alert_type = 'LOW_SAFE_STOCK';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_inventory_low_stock_alert ON product;

CREATE TRIGGER trg_sync_inventory_low_stock_alert
AFTER INSERT OR UPDATE OF real_stock, safe_stock ON product
FOR EACH ROW
EXECUTE FUNCTION sync_inventory_low_stock_alert();

INSERT INTO inventory_alert (
    company_id,
    product_id,
    alert_type,
    message,
    real_stock,
    safe_stock,
    is_active,
    triggered_at,
    resolved_at,
    created_at,
    updated_at
)
SELECT
    p.company_id,
    p.id,
    'LOW_SAFE_STOCK',
    CONCAT(p.product_name, ' 상품의 재고가 안전재고 이하입니다.'),
    COALESCE(p.real_stock, 0),
    COALESCE(p.safe_stock, 0),
    TRUE,
    COALESCE(p.mdate, CURRENT_TIMESTAMP),
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM product p
WHERE COALESCE(p.safe_stock, 0) > 0
  AND COALESCE(p.real_stock, 0) <= COALESCE(p.safe_stock, 0)
ON CONFLICT (product_id, alert_type) DO UPDATE
SET company_id = EXCLUDED.company_id,
    message = EXCLUDED.message,
    real_stock = EXCLUDED.real_stock,
    safe_stock = EXCLUDED.safe_stock,
    is_active = TRUE,
    resolved_at = NULL,
    triggered_at = EXCLUDED.triggered_at,
    updated_at = CURRENT_TIMESTAMP;
