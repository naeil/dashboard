CREATE TEMP TABLE tmp_cost_component_products AS
SELECT DISTINCT product_id
FROM product_cost_component;

DELETE FROM product_cost_component
WHERE COALESCE(BTRIM(component_name), '') = ''
   OR COALESCE(specification_quantity, 0) <= 0
   OR COALESCE(BTRIM(specification_unit), '') = ''
   OR COALESCE(unit_price, 0) <= 0
   OR COALESCE(quantity, 0) <= 0
   OR COALESCE(production_quantity, 0) <= 0
   OR COALESCE(amount, 0) <= 0;

UPDATE product p
SET cost_price = COALESCE(component_sum.total_amount, 0)
FROM (
    SELECT affected.product_id,
           SUM(COALESCE(component.amount, 0)) AS total_amount
    FROM tmp_cost_component_products affected
    LEFT JOIN product_cost_component component
           ON component.product_id = affected.product_id
    GROUP BY affected.product_id
) component_sum
WHERE p.id = component_sum.product_id;

DROP TABLE tmp_cost_component_products;
