-- 社区开放/私密 + 加入申请（已有 communities 表但无 is_public 列时执行一次）
USE wiki;

ALTER TABLE communities
  ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 0 COMMENT '开放社区 0私密 1开放' AFTER owner_id,
  ADD KEY idx_communities_public (is_public, deleted);

CREATE TABLE IF NOT EXISTS community_join_applications (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  code           VARCHAR(32)  NOT NULL COMMENT '对外业务编码',
  community_id   BIGINT       NOT NULL,
  applicant_id   BIGINT       NOT NULL COMMENT '申请人用户 id',
  status         VARCHAR(16)  NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  message        TEXT         NULL COMMENT '申请留言',
  reviewed_by    BIGINT       NULL COMMENT '审核人用户 id',
  reviewed_at    DATETIME(3)  NULL,
  deleted        TINYINT(1)   NOT NULL DEFAULT 0,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_community_join_applications_code (code),
  KEY idx_cja_community_status (community_id, status, deleted),
  KEY idx_cja_applicant (applicant_id, status, deleted),
  CONSTRAINT fk_cja_community FOREIGN KEY (community_id) REFERENCES communities(id),
  CONSTRAINT fk_cja_applicant FOREIGN KEY (applicant_id) REFERENCES users(id),
  CONSTRAINT fk_cja_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
