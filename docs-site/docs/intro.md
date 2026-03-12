---
sidebar_position: 1
slug: /intro
title: Introduction
---

# RiDDiX Matrix Control

**RiDDiX Matrix Control** is a multi-server administration platform for [Matrix Synapse](https://github.com/element-hq/synapse) homeservers. It provides an admin dashboard for managing registration tokens and a branded public registration page for invited users.

## What It Does

- **Manages multiple Synapse homeservers** from a single deployment
- **Creates and controls invitation tokens** via the Synapse Admin API
- **Provides a public registration page** where invited users can create their Matrix accounts
- **White-labels the registration experience** with full branding customization
- **Manages bridges and bots** for your Matrix infrastructure

## Key Features

| Feature | Description |
|---|---|
| **Multi-Server** | Add, configure, enable/disable, and monitor multiple Synapse homeservers |
| **Token Management** | Create, update, disable, and delete registration tokens with labels and notes |
| **Public Registration** | Branded form with invitation code validation and Matrix UIA registration flow |
| **Branding** | Full white-label system: colors, layout presets, logos, content, footer links |
| **Integrations** | Install and configure bridges (WhatsApp, Signal, Telegram) from a catalog |
| **Bots** | Create bots from templates (welcome, moderation, keyword responder, etc.) |
| **Audit Log** | Complete audit trail for all admin and registration activity |
| **Diagnostics** | Real-time Synapse connectivity and configuration checks |
| **Security** | AES-256-GCM encryption, Zod validation, rate limiting, security headers |
| **Dark Mode** | Full light/dark theme support in the admin dashboard |

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **UI:** React 19, Tailwind CSS 4, shadcn/ui, Lucide icons
- **Auth:** iron-session (encrypted cookies)
- **Validation:** Zod
- **Encryption:** AES-256-GCM (Node.js crypto)
- **Container:** Docker (multi-stage build), Docker Compose

## Requirements

- Node.js 20+
- PostgreSQL 14+
- One or more Matrix Synapse homeservers with:
  - `enable_registration: true`
  - `registration_requires_token: true`
  - An admin user access token per server

## Next Steps

- [Quick Start with Docker](./getting-started/docker)
- [Development Setup](./getting-started/development)
- [Multi-Server Management](./features/multi-server)
