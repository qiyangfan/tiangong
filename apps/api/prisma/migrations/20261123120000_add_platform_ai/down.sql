-- 人工回滚脚本（Prisma 不自动执行）：删除 AI 入口全部表与权限种子；不影响既有表与人工路径。
DROP TABLE IF EXISTS "ai_confirmation";
DROP TABLE IF EXISTS "ai_action";
DROP TABLE IF EXISTS "ai_message";
DROP TABLE IF EXISTS "ai_conversation";

DELETE FROM "permission"
WHERE "resource" = 'ai' AND "action" IN ('chat', 'confirm');
