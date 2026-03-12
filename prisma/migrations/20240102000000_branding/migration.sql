-- CreateTable
CREATE TABLE "branding_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_draft" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "app_title" TEXT,
    "subtitle" TEXT,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "accent_color" TEXT,
    "background_color" TEXT,
    "panel_color" TEXT,
    "text_color" TEXT,
    "button_style" TEXT,
    "input_style" TEXT,
    "border_radius" TEXT,
    "shadow_intensity" TEXT,
    "spacing_density" TEXT,
    "layout_preset" TEXT,
    "welcome_headline" TEXT,
    "registration_text" TEXT,
    "success_message" TEXT,
    "footer_text" TEXT,
    "support_text" TEXT,
    "privacy_policy_url" TEXT,
    "imprint_url" TEXT,
    "terms_url" TEXT,
    "help_url" TEXT,
    "homeserver_display_name" TEXT,
    "homeserver_url_text" TEXT,
    "client_recommendation" TEXT,
    "post_registration_text" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branding_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branding_assets" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branding_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branding_assets_profile_id_idx" ON "branding_assets"("profile_id");

-- AddForeignKey
ALTER TABLE "branding_assets" ADD CONSTRAINT "branding_assets_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "branding_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
