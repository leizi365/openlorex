-- Wiki MySQL 完整建库脚本（MySQL 8.x）
-- 用途：新库初始化；docker compose --profile with-db 首次启动会自动执行
--
-- 约定：
--   - id (BIGINT)：内部主键，不对外暴露
--   - code (VARCHAR)：对外业务编码
--   - deleted (TINYINT)：软删除，0=否 1=是
--
-- 用法：
--   mysql -u root -p < backend/sql/schema.sql
--   或
--   mysql -u root -p wiki < backend/sql/schema.sql   # 若库已存在可省略 CREATE DATABASE

CREATE DATABASE IF NOT EXISTS wiki
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE wiki;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT       NOT NULL AUTO_INCREMENT COMMENT '内部主键',
  code          VARCHAR(32)  NOT NULL COMMENT '对外业务编码',
  email         VARCHAR(255) NOT NULL COMMENT '邮箱',
  name          VARCHAR(100) NOT NULL COMMENT '昵称',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  deleted       TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '软删除 0否 1是',
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_code (code),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_deleted (deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- pages（目录页 parent_id 非空；内页 container_page_id 非空，parent_id 必须为 NULL）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pages (
  id                  BIGINT       NOT NULL AUTO_INCREMENT COMMENT '内部主键',
  code                VARCHAR(32)  NOT NULL COMMENT '对外业务编码',
  user_id             BIGINT       NOT NULL COMMENT '所属用户 id',
  parent_id           BIGINT       NULL COMMENT '目录父页；内页必须为 NULL',
  container_page_id   BIGINT       NULL COMMENT '内页宿主；目录页必须为 NULL',
  title               VARCHAR(255) NOT NULL DEFAULT '无标题',
  icon                VARCHAR(32)  NULL,
  cover_color         VARCHAR(2048) NULL COMMENT '封面色或图片 URL',
  sort_order          INT          NOT NULL DEFAULT 0,
  content             JSON         NOT NULL,
  version             BIGINT       NOT NULL DEFAULT 1 COMMENT '乐观锁版本号，每次内容/元数据更新递增',
  is_public           TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '对外公开 0否 1是（不沿 container 穿透）',
  deleted             TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '软删除',
  created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_pages_code (code),
  KEY idx_pages_user_parent_sort (user_id, parent_id, sort_order),
  KEY idx_pages_container (container_page_id, deleted),
  KEY idx_pages_user_container_sort (user_id, container_page_id, sort_order),
  KEY idx_pages_deleted (deleted),
  CONSTRAINT fk_pages_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_pages_parent FOREIGN KEY (parent_id) REFERENCES pages(id),
  CONSTRAINT fk_pages_container FOREIGN KEY (container_page_id) REFERENCES pages(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- assets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
  id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '内部主键',
  code         VARCHAR(32)  NOT NULL COMMENT '对外业务编码',
  user_id      BIGINT       NOT NULL,
  page_id      BIGINT       NULL,
  name         VARCHAR(255) NOT NULL,
  mime_type    VARCHAR(127) NOT NULL,
  size_bytes   BIGINT       NOT NULL,
  storage_key  VARCHAR(512) NOT NULL,
  deleted      TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '软删除',
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_assets_code (code),
  KEY idx_assets_user (user_id),
  KEY idx_assets_deleted (deleted),
  CONSTRAINT fk_assets_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_assets_page FOREIGN KEY (page_id) REFERENCES pages(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- communities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS communities (
  id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '内部主键',
  code         VARCHAR(32)  NOT NULL COMMENT '对外业务编码',
  name         VARCHAR(100) NOT NULL COMMENT '社区名称',
  description  TEXT         NULL COMMENT '社区描述',
  owner_id     BIGINT       NOT NULL COMMENT '创建者 id',
  is_public    TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '开放社区 0私密 1开放（可见并可申请加入）',
  deleted      TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '软删除',
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_communities_code (code),
  KEY idx_communities_owner (owner_id),
  KEY idx_communities_public (is_public, deleted),
  KEY idx_communities_deleted (deleted),
  CONSTRAINT fk_communities_owner FOREIGN KEY (owner_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- community_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_members (
  id            BIGINT      NOT NULL AUTO_INCREMENT,
  community_id  BIGINT      NOT NULL,
  user_id       BIGINT      NOT NULL,
  role          VARCHAR(16) NOT NULL DEFAULT 'member' COMMENT 'owner/admin/member',
  deleted       TINYINT(1)  NOT NULL DEFAULT 0,
  joined_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_community_members (community_id, user_id),
  KEY idx_community_members_user (user_id, deleted, community_id),
  CONSTRAINT fk_cm_community FOREIGN KEY (community_id) REFERENCES communities(id),
  CONSTRAINT fk_cm_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- community_invitations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_invitations (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  code           VARCHAR(32)  NOT NULL COMMENT '对外业务编码',
  community_id   BIGINT       NOT NULL,
  inviter_id     BIGINT       NOT NULL,
  invitee_email  VARCHAR(255) NOT NULL,
  status         VARCHAR(16)  NOT NULL DEFAULT 'pending' COMMENT 'pending/accepted/expired/revoked',
  token_hash     VARCHAR(64)  NOT NULL,
  expires_at     DATETIME(3)  NOT NULL,
  accepted_at    DATETIME(3)  NULL,
  deleted        TINYINT(1)   NOT NULL DEFAULT 0,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_community_invitations_code (code),
  KEY idx_invitations_email_status (invitee_email, status, deleted),
  CONSTRAINT fk_inv_community FOREIGN KEY (community_id) REFERENCES communities(id),
  CONSTRAINT fk_inv_inviter FOREIGN KEY (inviter_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- community_join_applications
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- page_permissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_permissions (
  id            BIGINT      NOT NULL AUTO_INCREMENT,
  page_id       BIGINT      NOT NULL,
  grantee_type  VARCHAR(16) NOT NULL COMMENT 'user/community',
  grantee_id    BIGINT      NOT NULL,
  permission    VARCHAR(8)  NOT NULL COMMENT 'view/edit',
  granted_by    BIGINT      NOT NULL,
  deleted       TINYINT(1)  NOT NULL DEFAULT 0,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_page_permissions (page_id, grantee_type, grantee_id),
  KEY idx_page_permissions_grantee (grantee_type, grantee_id, deleted, page_id),
  CONSTRAINT fk_pp_page FOREIGN KEY (page_id) REFERENCES pages(id),
  CONSTRAINT fk_pp_granted_by FOREIGN KEY (granted_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
