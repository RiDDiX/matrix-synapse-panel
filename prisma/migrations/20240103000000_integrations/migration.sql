-- CreateTable
CREATE TABLE "installed_integrations" (
    "id" TEXT NOT NULL,
    "catalog_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "deployment_mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'installed',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "config_json" TEXT,
    "status_detail" TEXT,
    "health_endpoint" TEXT,
    "last_health_at" TIMESTAMP(3),
    "last_health_ok" BOOLEAN,
    "container_name" TEXT,
    "service_name" TEXT,
    "network_name" TEXT,
    "volume_names" TEXT,
    "appservice_id" TEXT,
    "appservice_file" TEXT,
    "installed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installed_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_secrets" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encrypted_value" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "rotated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "config_json" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_definitions" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "localpart" TEXT,
    "matrix_user_id" TEXT,
    "avatar_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config_json" TEXT,
    "access_token_enc" TEXT,
    "access_token_iv" TEXT,
    "access_token_tag" TEXT,
    "last_active_at" TIMESTAMP(3),
    "status_detail" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_room_assignments" (
    "id" TEXT NOT NULL,
    "bot_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "room_alias" TEXT,
    "config_json" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_room_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_feature_flags" (
    "id" TEXT NOT NULL,
    "bot_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config_json" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "scope_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "installed_integrations_catalog_id_idx" ON "installed_integrations"("catalog_id");
CREATE INDEX "installed_integrations_type_idx" ON "installed_integrations"("type");
CREATE INDEX "installed_integrations_status_idx" ON "installed_integrations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_secrets_integration_id_key_key" ON "integration_secrets"("integration_id", "key");

-- CreateIndex
CREATE INDEX "integration_configs_integration_id_idx" ON "integration_configs"("integration_id");

-- CreateIndex
CREATE UNIQUE INDEX "bot_definitions_localpart_key" ON "bot_definitions"("localpart");
CREATE INDEX "bot_definitions_template_id_idx" ON "bot_definitions"("template_id");
CREATE INDEX "bot_definitions_status_idx" ON "bot_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bot_room_assignments_bot_id_room_id_key" ON "bot_room_assignments"("bot_id", "room_id");
CREATE INDEX "bot_room_assignments_bot_id_idx" ON "bot_room_assignments"("bot_id");

-- CreateIndex
CREATE UNIQUE INDEX "bot_feature_flags_bot_id_feature_key_scope_scope_id_key" ON "bot_feature_flags"("bot_id", "feature_key", "scope", "scope_id");
CREATE INDEX "bot_feature_flags_bot_id_idx" ON "bot_feature_flags"("bot_id");

-- AddForeignKey
ALTER TABLE "integration_secrets" ADD CONSTRAINT "integration_secrets_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "installed_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "installed_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_room_assignments" ADD CONSTRAINT "bot_room_assignments_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bot_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_feature_flags" ADD CONSTRAINT "bot_feature_flags_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bot_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
