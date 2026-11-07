-- Ensure all IQD list prices are whole dinars (no fractional fils drift).
UPDATE public.services
SET price = ROUND(price)
WHERE price IS DISTINCT FROM ROUND(price);

UPDATE public.courses
SET price = ROUND(price)
WHERE price IS DISTINCT FROM ROUND(price);
