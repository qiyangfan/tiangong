-- 天工 PostgreSQL 18 初始基线（2026-11-20 由 MySQL 迁移；citext 保留用户名/邮箱大小写不敏感语义）
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" CITEXT NOT NULL,
    "nickname" VARCHAR(30) NOT NULL,
    "email" CITEXT,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "avatar_file_id" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "lock_until" TIMESTAMP(3),
    "last_login_ip" VARCHAR(64),
    "last_login_at" TIMESTAMP(3),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "role_key" VARCHAR(100) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "builtin" BOOLEAN NOT NULL DEFAULT false,
    "remark" VARCHAR(500),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" SERIAL NOT NULL,
    "resource" VARCHAR(64) NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER NOT NULL DEFAULT 0,
    "name" VARCHAR(50) NOT NULL,
    "menu_type" VARCHAR(1) NOT NULL,
    "path" VARCHAR(200),
    "component" VARCHAR(255),
    "perms" VARCHAR(100),
    "icon" VARCHAR(100),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "dict_type" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "dict_key" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dict_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dict_item" (
    "id" SERIAL NOT NULL,
    "dict_key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "value" VARCHAR(100) NOT NULL,
    "tag_type" VARCHAR(20),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dict_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setting" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "setting_key" VARCHAR(100) NOT NULL,
    "value" VARCHAR(500) NOT NULL,
    "builtin" BOOLEAN NOT NULL DEFAULT false,
    "remark" VARCHAR(500),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oper_log" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(50) NOT NULL,
    "business_type" VARCHAR(20) NOT NULL,
    "method" VARCHAR(200) NOT NULL,
    "request_method" VARCHAR(10) NOT NULL,
    "request_path" VARCHAR(255) NOT NULL,
    "user_id" INTEGER,
    "username" VARCHAR(50) NOT NULL,
    "client" VARCHAR(10) NOT NULL DEFAULT '-',
    "ip" VARCHAR(64) NOT NULL DEFAULT '',
    "params" VARCHAR(4000),
    "result" VARCHAR(2000),
    "status" VARCHAR(10) NOT NULL,
    "error_msg" VARCHAR(2000),
    "cost_ms" INTEGER NOT NULL,
    "request_id" VARCHAR(36) NOT NULL,
    "operated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oper_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_log" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "user_id" INTEGER,
    "client" VARCHAR(10) NOT NULL DEFAULT '-',
    "ip" VARCHAR(64) NOT NULL DEFAULT '',
    "status" VARCHAR(10) NOT NULL,
    "message" VARCHAR(255),
    "request_id" VARCHAR(36) NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" SERIAL NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "client" VARCHAR(10) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_hash" VARCHAR(128),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_object" (
    "id" SERIAL NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "suffix" VARCHAR(10) NOT NULL DEFAULT '',
    "mime_type" VARCHAR(100) NOT NULL DEFAULT '',
    "size_bytes" INTEGER NOT NULL,
    "storage" VARCHAR(20) NOT NULL DEFAULT 'local',
    "checksum_sha256" VARCHAR(64),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_object_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_record" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50),
    "amount" DECIMAL(12,2),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sample_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gen_definition" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(50) NOT NULL,
    "fields" JSONB NOT NULL,
    "remark" VARCHAR(500),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gen_definition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_enabled_idx" ON "user"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "role_role_key_key" ON "role"("role_key");

-- CreateIndex
CREATE UNIQUE INDEX "permission_resource_action_key" ON "permission"("resource", "action");

-- CreateIndex
CREATE INDEX "menu_parent_id_idx" ON "menu"("parent_id");

-- CreateIndex
CREATE INDEX "user_role_role_id_idx" ON "user_role"("role_id");

-- CreateIndex
CREATE INDEX "role_permission_permission_id_idx" ON "role_permission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "dict_type_dict_key_key" ON "dict_type"("dict_key");

-- CreateIndex
CREATE INDEX "dict_item_dict_key_idx" ON "dict_item"("dict_key");

-- CreateIndex
CREATE UNIQUE INDEX "dict_item_dict_key_value_key" ON "dict_item"("dict_key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "setting_setting_key_key" ON "setting"("setting_key");

-- CreateIndex
CREATE INDEX "oper_log_operated_at_idx" ON "oper_log"("operated_at");

-- CreateIndex
CREATE INDEX "oper_log_username_idx" ON "oper_log"("username");

-- CreateIndex
CREATE INDEX "login_log_logged_at_idx" ON "login_log"("logged_at");

-- CreateIndex
CREATE INDEX "login_log_username_idx" ON "login_log"("username");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_idx" ON "refresh_token"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "file_object_storage_key_key" ON "file_object"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "gen_definition_name_key" ON "gen_definition"("name");

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oper_log" ADD CONSTRAINT "oper_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

