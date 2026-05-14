UPDATE product
SET product_group = TRIM(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        REGEXP_REPLACE(
                            REGEXP_REPLACE(product_name, '^\s*(\[[^]]+\]\s*)+', '', 'g'),
                            '\[([^]]+)\]',
                            ' \1 ',
                            'g'
                        ),
                        '\s*,.*$',
                        '',
                        'g'
                    ),
                    '\s*\(\s*[0-9A-Za-z.,/\- xX*]*(개|팩|박스|입|세트|캔|봉|장|g|kg|ml|l)[^)]*\)\s*$',
                    '',
                    'ig'
                ),
                '\s+\d+\s*장\s*[xX*]\s*\d+\s*팩\s*$',
                '',
                'ig'
            ),
            '\s+\d+([.,]\d+)?\s*(g|kg|ml|l)\s*$',
            '',
            'ig'
        ),
        '\s+\d+\s*(개|팩|박스|입|세트|캔|봉|장)\s*$',
        '',
        'ig'
    )
);

UPDATE product
SET product_group = TRIM(REGEXP_REPLACE(product_group, '[\s\-_\/]+$', '', 'g'))
WHERE product_group IS NOT NULL;

UPDATE product
SET product_group = TRIM(REGEXP_REPLACE(product_group, '\s+', ' ', 'g'))
WHERE product_group IS NOT NULL;

UPDATE product
SET product_group = product_name
WHERE COALESCE(TRIM(product_group), '') = '';
