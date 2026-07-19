-- pages.version — 乐观锁（已有 pages 表但无 version 列时执行一次）
USE wiki;

ALTER TABLE pages
  ADD COLUMN version BIGINT NOT NULL DEFAULT 1 COMMENT '乐观锁版本号' AFTER content;
