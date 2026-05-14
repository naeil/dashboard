ALTER TABLE shop
    ADD COLUMN IF NOT EXISTS color VARCHAR(32);

UPDATE shop
SET color = 'hsl('
    || (ABS((('x' || SUBSTR(MD5(COALESCE(shop_code, shop_name, id::text)), 1, 8))::bit(32)::int)) % 360)::text
    || ', '
    || (62 + ABS((('x' || SUBSTR(MD5(COALESCE(shop_code, shop_name, id::text)), 1, 8))::bit(32)::int)) % 10)::text
    || '%, '
    || (48 + ((ABS((('x' || SUBSTR(MD5(COALESCE(shop_code, shop_name, id::text)), 1, 8))::bit(32)::int)) / 10) % 8))::text
    || '%)'
WHERE color IS NULL OR BTRIM(color) = '';

ALTER TABLE shop
    ALTER COLUMN color SET NOT NULL;
