ALTER TABLE product_cost_component
    ADD COLUMN specification VARCHAR(160),
    ADD COLUMN unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN production_quantity NUMERIC(12,2) NOT NULL DEFAULT 0;

UPDATE product_cost_component
SET unit_price = amount,
    quantity = CASE WHEN quantity = 0 THEN 1 ELSE quantity END,
    total_amount = CASE WHEN total_amount = 0 THEN amount ELSE total_amount END,
    production_quantity = CASE WHEN production_quantity = 0 THEN 1 ELSE production_quantity END
WHERE amount > 0;
