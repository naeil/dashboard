ALTER TABLE product_cost_component
    ADD COLUMN specification_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN specification_unit VARCHAR(80);

UPDATE product_cost_component
SET specification_quantity = CASE
        WHEN specification ~ '^\s*\d+(\.\d+)?' THEN CAST(substring(specification FROM '^\s*(\d+(?:\.\d+)?)') AS NUMERIC(12,2))
        ELSE 0
    END,
    specification_unit = NULLIF(
        BTRIM(
            regexp_replace(
                COALESCE(specification, ''),
                '^\s*\d+(?:\.\d+)?\s*',
                ''
            )
        ),
        ''
    )
WHERE specification IS NOT NULL
  AND BTRIM(specification) <> '';
