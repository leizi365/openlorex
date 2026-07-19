-- pages.is_public — 页面公开（已有 pages 表但无 is_public 列时执行一次）
USE wiki;

ALTER TABLE pages
  ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 0 COMMENT '对外公开 0否 1是' AFTER version;
