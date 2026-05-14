ALTER TABLE product
    ADD COLUMN IF NOT EXISTS product_group VARCHAR(200);

UPDATE product
SET product_group = TRIM(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(product_name, '^\s*(\[[^]]+\]\s*)+', '', 'g'),
                    '\s*,.*$',
                    '',
                    'g'
                ),
                '\s*\([^)]*\)',
                '',
                'g'
            ),
            '\s+\d+([.,]\d+)?\s*(g|kg|ml|l|개|장|팩|박스|포|입|봉|캔|ea)\b.*$',
            '',
            'i'
        ),
        '\s+',
        ' ',
        'g'
    )
)
WHERE COALESCE(TRIM(product_group), '') = '';

UPDATE product
SET product_group = product_name
WHERE COALESCE(TRIM(product_group), '') = '';
