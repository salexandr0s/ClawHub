-- Manager engine single-mode cutover schema changes.

-- Operations: execution/claim/retry fields
ALTER TABLE "operations" ADD COLUMN "execution_type" TEXT NOT NULL DEFAULT 'single';
ALTER TABLE "operations" ADD COLUMN "loop_config_json" TEXT;
ALTER TABLE "operations" ADD COLUMN "current_story_id" TEXT;
ALTER TABLE "operations" ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "operations" ADD COLUMN "max_retries" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "operations" ADD COLUMN "claimed_by" TEXT;
ALTER TABLE "operations" ADD COLUMN "claim_expires_at" DATETIME;
ALTER TABLE "operations" ADD COLUMN "last_claimed_at" DATETIME;
ALTER TABLE "operations" ADD COLUMN "timeout_count" INTEGER NOT NULL DEFAULT 0;

-- Stories for loop execution
CREATE TABLE IF NOT EXISTS "operation_stories" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "operation_id" TEXT NOT NULL,
  "work_order_id" TEXT NOT NULL,
  "story_index" INTEGER NOT NULL,
  "story_key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "acceptance_criteria_json" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "output_json" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "max_retries" INTEGER NOT NULL DEFAULT 2,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "operation_stories_operation_id_fkey"
    FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "operation_stories_work_order_id_fkey"
    FOREIGN KEY ("work_order_id") REFERENCES "work_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Idempotency tokens for completion endpoint
CREATE TABLE IF NOT EXISTS "operation_completion_tokens" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "token" TEXT NOT NULL,
  "operation_id" TEXT NOT NULL,
  "work_order_id" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS "operations_claim_expires_at_idx" ON "operations"("claim_expires_at");
CREATE INDEX IF NOT EXISTS "operations_execution_type_idx" ON "operations"("execution_type");
CREATE UNIQUE INDEX IF NOT EXISTS "operation_stories_operation_id_story_index_key" ON "operation_stories"("operation_id", "story_index");
CREATE INDEX IF NOT EXISTS "operation_stories_operation_id_status_idx" ON "operation_stories"("operation_id", "status");
CREATE INDEX IF NOT EXISTS "operation_stories_work_order_id_idx" ON "operation_stories"("work_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "operation_completion_tokens_token_key" ON "operation_completion_tokens"("token");
CREATE INDEX IF NOT EXISTS "operation_completion_tokens_operation_id_idx" ON "operation_completion_tokens"("operation_id");

-- Backfill workflow ids for existing non-system work orders.
UPDATE "work_orders"
SET "workflow_id" = CASE
  WHEN LOWER(COALESCE("workflow_id", '')) <> '' THEN "workflow_id"
  WHEN LOWER(COALESCE("routing_template", '')) IN ('bug_fix', 'bug-fix', 'bug fix') THEN 'bug_fix'
  WHEN LOWER(COALESCE("routing_template", '')) IN ('security_audit', 'security-audit', 'security audit') THEN 'security_audit'
  WHEN LOWER(COALESCE("routing_template", '')) IN ('ops_task', 'ops-task', 'ops') THEN 'ops_change'
  WHEN LOWER(COALESCE("routing_template", '')) IN ('content_creation', 'content-creation', 'content') THEN 'content_creation'
  ELSE 'greenfield_project'
END
WHERE "workflow_id" IS NULL
  AND "id" NOT IN ('system', 'console');

UPDATE "operations"
SET "workflow_id" = (
  SELECT "workflow_id"
  FROM "work_orders"
  WHERE "work_orders"."id" = "operations"."work_order_id"
)
WHERE "workflow_id" IS NULL;
