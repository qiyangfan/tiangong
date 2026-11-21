-- 字典键/值保持 MySQL 时期的大小写不敏感唯一性（契约已限制 roleKey/settingKey 等为小写，无需额外 CITEXT）。
ALTER TABLE "dict_type" ALTER COLUMN "dict_key" TYPE CITEXT;
ALTER TABLE "dict_item" ALTER COLUMN "dict_key" TYPE CITEXT;
ALTER TABLE "dict_item" ALTER COLUMN "value" TYPE CITEXT;
