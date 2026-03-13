-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "server_id" TEXT,
    "last_status" INTEGER,
    "last_error" TEXT,
    "last_fired_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "server_id" TEXT,
    "permission" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_endpoints_server_id_idx" ON "webhook_endpoints"("server_id");
CREATE INDEX "webhook_endpoints_enabled_idx" ON "webhook_endpoints"("enabled");

CREATE INDEX "admin_permissions_user_id_idx" ON "admin_permissions"("user_id");
CREATE INDEX "admin_permissions_server_id_idx" ON "admin_permissions"("server_id");
CREATE UNIQUE INDEX "admin_permissions_user_id_server_id_permission_key" ON "admin_permissions"("user_id", "server_id", "permission");

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "managed_servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "managed_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
