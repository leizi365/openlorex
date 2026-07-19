-- pages.cover_color — 支持图片 URL（原 VARCHAR 较短时执行一次）
USE wiki;

ALTER TABLE pages
  MODIFY COLUMN cover_color VARCHAR(2048) NULL COMMENT '封面色或图片 URL';
