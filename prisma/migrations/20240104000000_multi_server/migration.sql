-- CreateTable: managed_servers
CREATE TABLE "managed_servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "server_name" TEXT NOT NULL,
    "internal_url" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "admin_token_enc" TEXT,
    "admin_token_iv" TEXT,
    "admin_token_tag" TEXT,
    "capability_mode" TEXT,
    "last_diag_at" TIMESTAMP(3),
    "last_diag_ok" BOOLEAN,
    "diag_json" TEXT,
    "public_domain" TEXT,
    "route_prefix" TEXT,
    "registration_mode" TEXT,
    "managed_mode" TEXT,
    "branding_profile_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "managed_servers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "managed_servers_slug_key" ON "managed_servers"("slug");
CREATE INDEX "managed_servers_server_name_idx" ON "managed_servers"("server_name");
CREATE INDEX "managed_servers_slug_idx" ON "managed_servers"("slug");
CREATE INDEX "managed_servers_status_idx" ON "managed_servers"("status");

-- AddForeignKey: managed_servers -> branding_profiles
ALTER TABLE "managed_servers" ADD CONSTRAINT "managed_servers_branding_profile_id_fkey" FOREIGN KEY ("branding_profile_id") REFERENCES "branding_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddColumn: admin_users.role
ALTER TABLE "admin_users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'global_admin';

-- Migrate token_meta: drop old unique, add server_id
-- Step 1: Add server_id column (nullable first for migration)
ALTER TABLE "token_meta" ADD COLUMN "server_id" TEXT;

-- Step 2: Drop old unique constraint on token
ALTER TABLE "token_meta" DROP CONSTRAINT IF EXISTS "token_meta_token_key";

-- Step 3: Create new composite unique
CREATE UNIQUE INDEX "token_meta_server_id_token_key" ON "token_meta"("server_id", "token");
CREATE INDEX "token_meta_server_id_idx" ON "token_meta"("server_id");

-- AddColumn: audit_logs.server_id
ALTER TABLE "audit_logs" ADD COLUMN "server_id" TEXT;
CREATE INDEX "audit_logs_server_id_idx" ON "audit_logs"("server_id");

-- AddColumn: installed_integrations.server_id
ALTER TABLE "installed_integrations" ADD COLUMN "server_id" TEXT;
CREATE INDEX "installed_integrations_server_id_idx" ON "installed_integrations"("server_id");

-- AddColumn: bot_definitions.server_id
ALTER TABLE "bot_definitions" ADD COLUMN "server_id" TEXT;

-- Drop old unique on localpart, add server-scoped unique
ALTER TABLE "bot_definitions" DROP CONSTRAINT IF EXISTS "bot_definitions_localpart_key";
CREATE UNIQUE INDEX "bot_definitions_server_id_localpart_key" ON "bot_definitions"("server_id", "localpart");
CREATE INDEX "bot_definitions_server_id_idx" ON "bot_definitions"("server_id");

-- Note: Foreign key constraints for server_id on token_meta, audit_logs,
-- installed_integrations, and bot_definitions are added after the default
-- server is created. For new installations, all these columns will be
-- populated. For existing installations, a data migration script should:
-- 1. Create a default ManagedServer from env vars
-- 2. UPDATE token_meta SET server_id = <default_server_id>
-- 3. UPDATE installed_integrations SET server_id = <default_server_id>
-- 4. UPDATE bot_definitions SET server_id = <default_server_id>
-- 5. ALTER TABLE token_meta ALTER COLUMN server_id SET NOT NULL
-- 6. ALTER TABLE installed_integrations ALTER COLUMN server_id SET NOT NULL
-- 7. ALTER TABLE bot_definitions ALTER COLUMN server_id SET NOT NULL
-- 8. Add foreign key constraints

-- AddForeignKey constraints (server_id nullable for audit_logs, required for others after migration)
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "managed_servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
