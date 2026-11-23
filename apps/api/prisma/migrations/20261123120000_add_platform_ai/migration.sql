-- CreateTable
CREATE TABLE "ai_conversation" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_message" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "role" VARCHAR(16) NOT NULL,
    "content" VARCHAR(16000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_action" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "tool_name" VARCHAR(255) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "request_id" VARCHAR(36),
    "error_code" VARCHAR(64),
    "result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_confirmation" (
    "id" SERIAL NOT NULL,
    "action_id" INTEGER NOT NULL,
    "ticket_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_confirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_conversation_user_id_created_at_idx" ON "ai_conversation"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_message_conversation_id_created_at_idx" ON "ai_message"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_action_conversation_id_created_at_idx" ON "ai_action"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_confirmation_action_id_key" ON "ai_confirmation"("action_id");

-- AddForeignKey
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_message" ADD CONSTRAINT "ai_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_action" ADD CONSTRAINT "ai_action_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_confirmation" ADD CONSTRAINT "ai_confirmation_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "ai_action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
