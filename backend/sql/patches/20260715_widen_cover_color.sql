-- Widen pages.cover_color to store image URLs as well as hex colors.
-- Run once against existing databases:
--   mysql -u ... -p wiki < sql/patches/20260715_widen_cover_color.sql

ALTER TABLE pages
  MODIFY COLUMN cover_color VARCHAR(2048) NULL;
