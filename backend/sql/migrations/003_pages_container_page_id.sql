-- pages.container_page_id — 内页归属（已有 pages 表但无 container_page_id 列时执行一次）
USE wiki;

ALTER TABLE pages
  ADD COLUMN container_page_id BIGINT NULL COMMENT '内页宿主；目录页必须为 NULL' AFTER parent_id,
  ADD KEY idx_pages_container (container_page_id, deleted),
  ADD KEY idx_pages_user_container_sort (user_id, container_page_id, sort_order),
  ADD CONSTRAINT fk_pages_container FOREIGN KEY (container_page_id) REFERENCES pages(id);
