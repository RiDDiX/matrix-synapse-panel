import { db } from "./db";
import { BRANDING_DEFAULTS, ALLOWED_ASSET_TYPES, MAX_ASSET_SIZE, MAX_FAVICON_SIZE, ASSET_PURPOSES, type AssetPurpose } from "./branding-defaults";
import type { BrandingProfile, BrandingAsset } from "@prisma/client";
import { randomUUID } from "crypto";
import { writeFile, unlink, mkdir, readFile as fsReadFile } from "fs/promises";
import { join, extname, resolve } from "path";
import { existsSync } from "fs";

export type BrandingProfileWithAssets = BrandingProfile & { assets: BrandingAsset[] };
export type SafeAsset = Omit<BrandingAsset, "storagePath">;
export type SafeProfile = Omit<BrandingProfileWithAssets, "assets"> & { assets: SafeAsset[] };

const UPLOAD_DIR = join(process.cwd(), "data", "uploads", "branding");

export function sanitizeProfile(profile: BrandingProfileWithAssets): SafeProfile {
  return {
    ...profile,
    assets: profile.assets.map(sanitizeAsset),
  };
}

export function sanitizeAsset(asset: BrandingAsset): SafeAsset {
  const { storagePath: _sp, ...safe } = asset;
  void _sp;
  return safe;
}

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function getActiveProfile(): Promise<BrandingProfileWithAssets | null> {
  return db.brandingProfile.findFirst({
    where: { isActive: true },
    include: { assets: true },
  });
}

export async function getProfileById(id: string): Promise<BrandingProfileWithAssets | null> {
  return db.brandingProfile.findUnique({
    where: { id },
    include: { assets: true },
  });
}

export async function listProfiles(): Promise<BrandingProfileWithAssets[]> {
  return db.brandingProfile.findMany({
    include: { assets: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProfile(name: string): Promise<BrandingProfileWithAssets> {
  return db.brandingProfile.create({
    data: { name, isDraft: true, isActive: false },
    include: { assets: true },
  });
}

export async function updateProfile(
  id: string,
  data: Partial<Omit<BrandingProfile, "id" | "createdAt" | "updatedAt" | "publishedAt" | "version">>
): Promise<BrandingProfileWithAssets> {
  return db.brandingProfile.update({
    where: { id },
    data: { ...data, isDraft: true },
    include: { assets: true },
  });
}

export async function publishProfile(id: string): Promise<BrandingProfileWithAssets> {
  return db.$transaction(async (tx) => {
    await tx.brandingProfile.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    return tx.brandingProfile.update({
      where: { id },
      data: {
        isActive: true,
        isDraft: false,
        publishedAt: new Date(),
        version: { increment: 1 },
      },
      include: { assets: true },
    });
  });
}

export async function resetProfile(id: string): Promise<BrandingProfileWithAssets> {
  return db.brandingProfile.update({
    where: { id },
    data: {
      appTitle: null,
      subtitle: null,
      primaryColor: null,
      secondaryColor: null,
      accentColor: null,
      backgroundColor: null,
      panelColor: null,
      textColor: null,
      buttonStyle: null,
      inputStyle: null,
      borderRadius: null,
      shadowIntensity: null,
      spacingDensity: null,
      layoutPreset: null,
      welcomeHeadline: null,
      registrationText: null,
      successMessage: null,
      footerText: null,
      supportText: null,
      privacyPolicyUrl: null,
      imprintUrl: null,
      termsUrl: null,
      helpUrl: null,
      homeserverDisplayName: null,
      homeserverUrlText: null,
      clientRecommendation: null,
      postRegistrationText: null,
      isDraft: true,
    },
    include: { assets: true },
  });
}

export async function deleteProfile(id: string): Promise<void> {
  const profile = await db.brandingProfile.findUnique({
    where: { id },
    include: { assets: true },
  });

  if (profile) {
    for (const asset of profile.assets) {
      await removeAssetFile(asset.storagePath);
    }
    await db.brandingProfile.delete({ where: { id } });
  }
}

export function resolvePublicBranding(profile: BrandingProfileWithAssets | null) {
  const d = BRANDING_DEFAULTS;
  const p = profile;
  const assetUrl = (purpose: string) => {
    const asset = p?.assets.find((a) => a.purpose === purpose);
    return asset ? `/api/branding/assets/${asset.id}` : null;
  };

  return {
    appTitle: p?.appTitle ?? d.appTitle,
    subtitle: p?.subtitle ?? d.subtitle,
    logoUrl: assetUrl("logo"),
    faviconUrl: assetUrl("favicon"),
    heroImageUrl: assetUrl("hero"),
    backgroundImageUrl: assetUrl("background"),
    primaryColor: p?.primaryColor ?? d.primaryColor,
    secondaryColor: p?.secondaryColor ?? d.secondaryColor,
    accentColor: p?.accentColor ?? d.accentColor,
    backgroundColor: p?.backgroundColor ?? d.backgroundColor,
    panelColor: p?.panelColor ?? d.panelColor,
    textColor: p?.textColor ?? d.textColor,
    buttonStyle: p?.buttonStyle ?? d.buttonStyle,
    inputStyle: p?.inputStyle ?? d.inputStyle,
    borderRadius: p?.borderRadius ?? d.borderRadius,
    shadowIntensity: p?.shadowIntensity ?? d.shadowIntensity,
    spacingDensity: p?.spacingDensity ?? d.spacingDensity,
    layoutPreset: p?.layoutPreset ?? d.layoutPreset,
    welcomeHeadline: p?.welcomeHeadline ?? d.welcomeHeadline,
    registrationText: p?.registrationText ?? d.registrationText,
    successMessage: p?.successMessage ?? d.successMessage,
    footerText: p?.footerText ?? d.footerText,
    supportText: p?.supportText ?? d.supportText,
    privacyPolicyUrl: p?.privacyPolicyUrl ?? null,
    imprintUrl: p?.imprintUrl ?? null,
    termsUrl: p?.termsUrl ?? null,
    helpUrl: p?.helpUrl ?? null,
    homeserverDisplayName: p?.homeserverDisplayName ?? d.homeserverDisplayName,
    homeserverUrlText: p?.homeserverUrlText ?? null,
    clientRecommendation: p?.clientRecommendation ?? d.clientRecommendation,
    postRegistrationText: p?.postRegistrationText ?? d.postRegistrationText,
  };
}

export type PublicBranding = ReturnType<typeof resolvePublicBranding>;

export function validateAssetUpload(
  file: File,
  purpose: AssetPurpose
): { valid: true } | { valid: false; error: string } {
  if (!ASSET_PURPOSES.includes(purpose)) {
    return { valid: false, error: `Invalid asset purpose: ${purpose}` };
  }

  const maxSize = purpose === "favicon" ? MAX_FAVICON_SIZE : MAX_ASSET_SIZE;
  if (file.size > maxSize) {
    const limit = purpose === "favicon" ? "256 KB" : "2 MB";
    return { valid: false, error: `File exceeds ${limit} limit` };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  const allowed = Object.keys(ALLOWED_ASSET_TYPES);
  if (!allowed.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed. Use PNG, JPEG, WebP, GIF, or ICO.` };
  }

  const ext = extname(file.name).toLowerCase();
  const validExts = ALLOWED_ASSET_TYPES[file.type];
  if (validExts && !validExts.includes(ext)) {
    return { valid: false, error: `File extension ${ext} does not match content type ${file.type}` };
  }

  return { valid: true };
}

export async function storeAsset(
  profileId: string,
  purpose: AssetPurpose,
  file: File
): Promise<BrandingAsset> {
  await ensureUploadDir();

  const existing = await db.brandingAsset.findFirst({
    where: { profileId, purpose },
  });
  if (existing) {
    await removeAssetFile(existing.storagePath);
    await db.brandingAsset.delete({ where: { id: existing.id } });
  }

  const ext = extname(file.name).toLowerCase();
  const safeName = `${randomUUID()}${ext}`;
  const storagePath = join(UPLOAD_DIR, safeName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  return db.brandingAsset.create({
    data: {
      profileId,
      purpose,
      filename: safeName,
      storagePath,
      mimeType: file.type,
      size: file.size,
    },
  });
}

export async function deleteAsset(assetId: string): Promise<void> {
  const asset = await db.brandingAsset.findUnique({ where: { id: assetId } });
  if (asset) {
    await removeAssetFile(asset.storagePath);
    await db.brandingAsset.delete({ where: { id: assetId } });
  }
}

export async function getAssetById(assetId: string): Promise<BrandingAsset | null> {
  return db.brandingAsset.findUnique({ where: { id: assetId } });
}

export async function readAssetFile(asset: BrandingAsset): Promise<Buffer | null> {
  const resolved = resolve(asset.storagePath);
  if (!resolved.startsWith(resolve(UPLOAD_DIR))) {
    return null;
  }
  if (!existsSync(resolved)) {
    return null;
  }
  return fsReadFile(resolved);
}

async function removeAssetFile(path: string) {
  try {
    await unlink(path);
  } catch {
    // file may already be gone
  }
}
