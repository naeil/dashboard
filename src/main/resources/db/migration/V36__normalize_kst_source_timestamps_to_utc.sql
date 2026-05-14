UPDATE orders
SET ord_time = ord_time - INTERVAL '9 hours'
WHERE ord_time IS NOT NULL;

UPDATE orders
SET pay_time = pay_time - INTERVAL '9 hours'
WHERE pay_time IS NOT NULL;

UPDATE orders
SET wdate = wdate - INTERVAL '9 hours'
WHERE wdate IS NOT NULL;

UPDATE product
SET wdate = wdate - INTERVAL '9 hours'
WHERE wdate IS NOT NULL;

UPDATE product
SET mdate = mdate - INTERVAL '9 hours'
WHERE mdate IS NOT NULL;
