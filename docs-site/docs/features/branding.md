---
sidebar_position: 4
title: Branding System
---

# Branding System

RiDDiX Matrix Control includes a full white-label branding system that lets you customize the public registration page for each server.

## Overview

The branding system supports:
- **Visual Identity** — app title, subtitle, logo, favicon, hero image, background image
- **Theme** — primary/secondary/accent/background/panel/text colors, button and input styles, border radius, shadow intensity, spacing density
- **Layout** — five presets: centered, split-screen, left-image, top-branding, compact
- **Content** — welcome headline, registration text, success message, footer, support text
- **Links** — privacy policy, imprint, terms of service, help page
- **Presentation** — homeserver display name, client recommendation, post-registration instructions

## Workflow

1. **Create** a branding profile (Admin → Branding → Create)
2. **Edit** fields across tabbed sections (Visual Identity, Theme, Layout, Content, Links, Presentation)
3. **Preview** changes in the live preview panel
4. **Save** as draft
5. **Publish** to make it the active profile
6. **Reset** to defaults at any time

All changes are versioned and audit-logged.

## Layout Presets

| Preset | Description |
|---|---|
| **Centered** | Form centered on page (default) |
| **Split Screen** | Image left, form right |
| **Left Image** | Branding image alongside form |
| **Top Branding** | Logo and title above form |
| **Compact** | Minimal invite page |

## Theme Options

### Colors

All colors are hex values (e.g., `#6366f1`):

| Property | Default | Description |
|---|---|---|
| Primary Color | `#6366f1` | Buttons, links, accent elements |
| Secondary Color | `#8b5cf6` | Secondary actions |
| Accent Color | `#f59e0b` | Highlights, warnings |
| Background Color | `#f8fafc` | Page background |
| Panel Color | `#ffffff` | Card/form background |
| Text Color | `#0f172a` | Primary text |

### Styling

| Property | Options | Default |
|---|---|---|
| Button Style | solid, outline, ghost | solid |
| Input Style | default, filled, underline | default |
| Border Radius | none, sm, md, lg, xl, full | md |
| Shadow Intensity | none, sm, md, lg | md |
| Spacing Density | compact, normal, relaxed | normal |

## Asset Uploads

Upload images for the registration page:

| Purpose | Max Size | Formats |
|---|---|---|
| Logo | 2 MB | PNG, JPEG, WebP, GIF |
| Favicon | 256 KB | PNG, JPEG, WebP, ICO |
| Hero Image | 2 MB | PNG, JPEG, WebP, GIF |
| Background Image | 2 MB | PNG, JPEG, WebP, GIF |

:::warning
SVG files are blocked to prevent XSS attacks.
:::

Assets are stored in `data/uploads/branding/` (persisted via the Docker `uploads` volume). Each upload generates a UUID filename. Existing assets for the same purpose are replaced automatically.

## Per-Server Branding

Each managed server can be linked to a branding profile:

1. Create a branding profile in Admin → Branding
2. Publish the profile
3. Go to Admin → Servers → [Server] → Edit
4. Set the **Branding Profile** to the desired profile

When users visit the registration page for that server, the linked branding profile is applied.

## Public Branding API

The active branding configuration is served at `GET /api/branding`. It returns the resolved branding with defaults applied for any unset fields. Asset URLs are returned as `/api/branding/assets/:id` paths.

## Security

- `storagePath` is stripped from all API responses
- Path containment check prevents directory traversal in asset serving
- File type, size, and extension are validated on upload
- All text fields have Zod length limits (no raw HTML injection)
- All branding mutations are audit-logged
