---
sidebar_position: 4
title: Admin — Branding
---

# Admin API — Branding

All endpoints require authentication.

## List Branding Profiles

```
GET /api/admin/branding
```

Returns all branding profiles with their assets. Storage paths are stripped from responses.

**Response:**

```json
{
  "profiles": [
    {
      "id": "clx...",
      "name": "Default",
      "isActive": true,
      "isDraft": false,
      "version": 2,
      "appTitle": "My Portal",
      "primaryColor": "#6366f1",
      "layoutPreset": "centered",
      "assets": [
        {
          "id": "clx...",
          "purpose": "logo",
          "filename": "abc-123.png",
          "mimeType": "image/png",
          "size": 45000
        }
      ]
    }
  ]
}
```

---

## Create Profile

```
POST /api/admin/branding
```

**Request Body:**

```json
{
  "name": "My Brand"
}
```

Creates a draft profile with default values.

**Audit:** `branding.created`

---

## Get Profile

```
GET /api/admin/branding/:id
```

Returns a single profile with assets.

---

## Update Profile

```
PUT /api/admin/branding/:id
```

**Request Body:** Partial object with any branding fields:

```json
{
  "appTitle": "My Portal",
  "primaryColor": "#3b82f6",
  "layoutPreset": "split",
  "welcomeHeadline": "Welcome!",
  "registrationText": "Enter your invite code below."
}
```

See the [Branding System](../features/branding) docs for the full list of fields.

**Audit:** `branding.updated`

---

## Publish Profile

```
PATCH /api/admin/branding/:id
```

**Request Body:**

```json
{
  "action": "publish"
}
```

Makes this profile the active one. Any previously active profile is deactivated. Increments the version number.

**Audit:** `branding.published`

---

## Reset Profile

```
PATCH /api/admin/branding/:id
```

**Request Body:**

```json
{
  "action": "reset"
}
```

Clears all customizations, reverting to defaults. Marks the profile as draft.

**Audit:** `branding.reset`

---

## Delete Profile

```
DELETE /api/admin/branding/:id
```

Deletes the profile and all associated assets (files removed from disk).

**Audit:** `branding.deleted`

---

## Upload Asset

```
POST /api/admin/branding/:id/assets
```

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Image file (PNG, JPEG, WebP, GIF, ICO) |
| `purpose` | string | Yes | One of: `logo`, `favicon`, `hero`, `background` |

**Size limits:**
- Favicon: 256 KB
- All others: 2 MB

**Blocked formats:** SVG (XSS risk)

If an asset with the same purpose already exists for this profile, it is replaced.

**Audit:** `branding.asset.uploaded`

---

## Delete Asset

```
DELETE /api/admin/branding/:id/assets/:assetId
```

Removes the asset file from disk and deletes the database record.

**Audit:** `branding.asset.deleted`
