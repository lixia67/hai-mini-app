-- CreateTable
CREATE TABLE `consumer_users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `wechat_open_id` VARCHAR(128) NOT NULL,
  `wechat_union_id` VARCHAR(128) NULL,
  `phone` VARCHAR(32) NULL,
  `nickname` VARCHAR(128) NULL,
  `avatar_url` VARCHAR(1024) NULL,
  `status` ENUM('ACTIVE', 'DISABLED', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  `last_login_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `consumer_users_wechat_open_id_key`(`wechat_open_id`),
  UNIQUE INDEX `consumer_users_wechat_union_id_key`(`wechat_union_id`),
  UNIQUE INDEX `consumer_users_phone_key`(`phone`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `consumer_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `consumer_user_id` BIGINT NOT NULL,
  `refresh_token_hash` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `revoked_at` DATETIME(3) NULL,
  `ip_address` VARCHAR(64) NULL,
  `user_agent` VARCHAR(512) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `consumer_sessions_refresh_token_hash_key`(`refresh_token_hash`),
  INDEX `consumer_sessions_consumer_user_id_expires_at_idx`(`consumer_user_id`, `expires_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `consumer_sessions_consumer_user_id_fkey` FOREIGN KEY (`consumer_user_id`) REFERENCES `consumer_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `staff_users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(64) NOT NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(32) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(128) NOT NULL,
  `status` ENUM('ACTIVE', 'DISABLED', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  `last_login_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `staff_users_username_key`(`username`),
  UNIQUE INDEX `staff_users_email_key`(`email`),
  UNIQUE INDEX `staff_users_phone_key`(`phone`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `staff_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `staff_user_id` BIGINT NOT NULL,
  `refresh_token_hash` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `revoked_at` DATETIME(3) NULL,
  `ip_address` VARCHAR(64) NULL,
  `user_agent` VARCHAR(512) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `staff_sessions_refresh_token_hash_key`(`refresh_token_hash`),
  INDEX `staff_sessions_staff_user_id_expires_at_idx`(`staff_user_id`, `expires_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `staff_sessions_staff_user_id_fkey` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `description` VARCHAR(512) NULL,
  `data_scope_type` ENUM('GLOBAL', 'ASSIGNED_STORES', 'SELF') NOT NULL DEFAULT 'SELF',
  `is_system` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `roles_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `permissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(128) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `resource` VARCHAR(64) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `description` VARCHAR(512) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `permissions_code_key`(`code`),
  INDEX `permissions_resource_action_idx`(`resource`, `action`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `staff_user_roles` (
  `staff_user_id` BIGINT NOT NULL,
  `role_id` BIGINT NOT NULL,
  `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `staff_user_roles_role_id_idx`(`role_id`),
  PRIMARY KEY (`staff_user_id`, `role_id`),
  CONSTRAINT `staff_user_roles_staff_user_id_fkey` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `staff_user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
  `role_id` BIGINT NOT NULL,
  `permission_id` BIGINT NOT NULL,
  INDEX `role_permissions_permission_id_idx`(`permission_id`),
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `staff_store_scopes` (
  `staff_user_id` BIGINT NOT NULL,
  `store_id` BIGINT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `staff_store_scopes_store_id_idx`(`store_id`),
  PRIMARY KEY (`staff_user_id`, `store_id`),
  CONSTRAINT `staff_store_scopes_staff_user_id_fkey` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
