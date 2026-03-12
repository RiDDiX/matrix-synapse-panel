---
sidebar_position: 3
title: Public Registration
---

# Public Registration

RiDDiX Matrix Control provides a branded public registration page where invited users can create their Matrix accounts using invitation tokens.

## Registration Flow

The registration process follows the standard Matrix User-Interactive Authentication (UIA) flow:

1. **User opens the registration page** — optionally with a server slug and pre-filled token in the URL
2. **Server resolution** — the portal determines which Synapse homeserver to register against
3. **Token validation** — the invitation code is verified against Synapse before submission
4. **Registration submission** — a multi-stage UIA flow:
   - Initiate registration with username and password
   - Complete `m.login.registration_token` stage with the invitation code
   - Complete `m.login.dummy` stage if required
   - Complete `m.login.terms` stage if required
5. **Success** — the user receives confirmation with their Matrix ID and post-registration instructions

## Registration URL Format

```
https://portal.example.com/register?server=<slug>&token=<code>
```

| Parameter | Required | Description |
|---|---|---|
| `server` | No | Server slug (e.g., `main-server`). Falls back to default server. |
| `serverId` | No | Server ID (alternative to slug). |
| `token` | No | Pre-fills the invitation code field. |

Examples:
- `https://portal.example.com/register` — uses default server
- `https://portal.example.com/register?server=main-server` — specific server
- `https://portal.example.com/register?server=main-server&token=abc123` — pre-filled code

## Registration Form Fields

| Field | Validation | Description |
|---|---|---|
| **Invitation Code** | Required, validated against Synapse | The registration token |
| **Username** | Required, `[a-z0-9._=-]+`, max 255 | Matrix localpart |
| **Password** | Required, min 8 characters | Account password |
| **Confirm Password** | Must match password | Password confirmation |
| **Display Name** | Optional, max 255 | Initial display name |

## Server Resolution

When the registration page loads, it resolves the target server:

1. Check `serverId` query parameter → look up by ID
2. Check `server` query parameter → look up by slug
3. Check domain → match against `publicDomain` field
4. Fall back to the default enabled server

If no server can be resolved, an error message is shown.

## Branding Integration

The registration page dynamically applies the server's branding profile:

- **Theme colors** — primary, secondary, accent, background, panel, text
- **Typography and styling** — button style, input style, border radius, shadows, spacing
- **Layout** — centered, split-screen, left-image, top-branding, or compact
- **Content** — welcome headline, registration text, success message, footer, support text
- **Assets** — logo, favicon, hero image, background image
- **Links** — privacy policy, imprint, terms of service, help page
- **Post-registration** — homeserver display name, client recommendation, instructions

See [Branding](./branding) for details.

## Error Handling

The portal provides user-friendly error messages for common Synapse errors:

| Synapse Error | User Message |
|---|---|
| `M_USER_IN_USE` | This username is already taken. |
| `M_INVALID_USERNAME` | The username contains invalid characters. |
| `M_EXCLUSIVE` | This username is reserved by the server. |
| `M_WEAK_PASSWORD` | The password is too weak. |
| `M_FORBIDDEN` | Registration is not permitted. |
| `M_LIMIT_EXCEEDED` | Too many requests. Please try again later. |
| `M_UNKNOWN_TOKEN` | The invitation code is invalid or has expired. |

Additional portal-specific errors:

| Code | Description |
|---|---|
| `MSC3861_INCOMPATIBLE` | Server uses delegated auth — token registration not available |
| `TOKEN_FLOW_UNAVAILABLE` | `registration_requires_token` not enabled in Synapse |
| `ADDITIONAL_STAGES_REQUIRED` | UIA requires stages the portal doesn't support |

## Rate Limiting

Registration and token validation endpoints are rate-limited:
- Default: 15 requests per 15-minute window per IP
- Configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`
