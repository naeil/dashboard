WITH representative_colors AS (
    SELECT
        s.id,
        CASE
            WHEN UPPER(BTRIM(COALESCE(s.shop_code, ''))) = 'A000'
                OR LOWER(REGEXP_REPLACE(COALESCE(s.shop_name, ''), '\s+', '', 'g')) = '직접입력' THEN '#475569'
            WHEN UPPER(BTRIM(COALESCE(s.shop_code, ''))) = 'A077'
                OR LOWER(REGEXP_REPLACE(COALESCE(s.shop_name, ''), '\s+', '', 'g')) = '스마트스토어' THEN '#03C75A'
            WHEN UPPER(BTRIM(COALESCE(s.shop_code, ''))) = 'B378'
                OR LOWER(REGEXP_REPLACE(COALESCE(s.shop_name, ''), '\s+', '', 'g')) = '쿠팡' THEN '#346AFF'
            WHEN UPPER(BTRIM(COALESCE(s.shop_code, ''))) = 'A112'
                OR LOWER(REGEXP_REPLACE(COALESCE(s.shop_name, ''), '\s+', '', 'g')) = '11번가' THEN '#FF6B00'
            WHEN UPPER(BTRIM(COALESCE(s.shop_code, ''))) = 'A001'
                OR LOWER(REGEXP_REPLACE(COALESCE(s.shop_name, ''), '\s+', '', 'g')) = '옥션' THEN '#E11D48'
            WHEN UPPER(BTRIM(COALESCE(s.shop_code, ''))) = 'A006'
                OR LOWER(REGEXP_REPLACE(COALESCE(s.shop_name, ''), '\s+', '', 'g')) = '지마켓' THEN '#06B6D4'
            WHEN UPPER(BTRIM(COALESCE(s.shop_code, ''))) = 'B688'
                OR LOWER(REGEXP_REPLACE(COALESCE(s.shop_name, ''), '\s+', '', 'g')) = '카카오톡스토어' THEN '#FEE500'
            WHEN UPPER(BTRIM(COALESCE(s.shop_code, ''))) = 'B005'
                OR LOWER(REGEXP_REPLACE(COALESCE(s.shop_name, ''), '\s+', '', 'g')) = '아임웹' THEN '#7C3AED'
            WHEN UPPER(BTRIM(COALESCE(s.shop_code, ''))) = 'A524'
                OR LOWER(REGEXP_REPLACE(COALESCE(s.shop_name, ''), '\s+', '', 'g')) = '롯데on' THEN '#DC2626'
            WHEN UPPER(BTRIM(COALESCE(s.shop_code, ''))) = 'A118'
                OR LOWER(REGEXP_REPLACE(COALESCE(s.shop_name, ''), '\s+', '', 'g')) = '농수산쇼핑몰' THEN '#A16207'
            ELSE NULL
        END AS color
    FROM shop s
),
palette AS (
    SELECT ARRAY[
        '#9A3412', '#7C2D12', '#B91C1C', '#BE123C', '#A21CAF',
        '#7E22CE', '#6D28D9', '#4338CA', '#0F766E', '#0D9488',
        '#15803D', '#3F6212', '#65A30D', '#A16207', '#CA8A04',
        '#C2410C', '#EA580C', '#C026D3', '#DB2777', '#7F1D1D',
        '#4D7C0F', '#166534', '#134E4A', '#701A75', '#5B21B6',
        '#9F1239', '#92400E', '#854D0E', '#1E3A8A'
    ] AS colors
),
non_representative_shops AS (
    SELECT
        s.id,
        ROW_NUMBER() OVER (
            ORDER BY UPPER(BTRIM(COALESCE(s.shop_code, ''))), LOWER(BTRIM(COALESCE(s.shop_name, ''))), s.id
        ) - 1 AS seq
    FROM shop s
    JOIN representative_colors rc ON rc.id = s.id
    WHERE rc.color IS NULL
),
resolved_colors AS (
    SELECT rc.id, rc.color
    FROM representative_colors rc
    WHERE rc.color IS NOT NULL

    UNION ALL

    SELECT
        nrs.id,
        p.colors[(nrs.seq % array_length(p.colors, 1)) + 1] AS color
    FROM non_representative_shops nrs
    CROSS JOIN palette p
)
UPDATE shop s
SET color = rc.color
FROM resolved_colors rc
WHERE s.id = rc.id;
