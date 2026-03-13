import { db } from "@/lib/db";
import crypto from "crypto";

export interface WebhookPayload {
  event: string;
  timestamp: string;
  serverId?: string;
  data: Record<string, unknown>;
}

export async function fireWebhooks(
  event: string,
  data: Record<string, unknown>,
  serverId?: string
): Promise<void> {
  try {
    const webhooks = await db.webhookEndpoint.findMany({
      where: {
        enabled: true,
        ...(serverId ? { OR: [{ serverId }, { serverId: null }] } : {}),
      },
    });

    const matching = webhooks.filter((w: { events: string; [key: string]: unknown }) => {
      const events: string[] = JSON.parse(w.events);
      return events.includes("*") || events.includes(event);
    });

    if (matching.length === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      serverId,
      data,
    };

    const body = JSON.stringify(payload);

    await Promise.allSettled(
      matching.map(async (webhook: { id: string; url: string; secret: string | null; [key: string]: unknown }) => {
        try {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "User-Agent": "MatrixSynapsePanel/1.0",
          };

          if (webhook.secret) {
            const signature = crypto
              .createHmac("sha256", webhook.secret)
              .update(body)
              .digest("hex");
            headers["X-Webhook-Signature"] = `sha256=${signature}`;
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(webhook.url, {
            method: "POST",
            headers,
            body,
            signal: controller.signal,
          });

          clearTimeout(timeout);

          await db.webhookEndpoint.update({
            where: { id: webhook.id },
            data: {
              lastStatus: res.status,
              lastError: res.ok ? null : `HTTP ${res.status}`,
              lastFiredAt: new Date(),
            },
          });
        } catch (err) {
          await db.webhookEndpoint.update({
            where: { id: webhook.id },
            data: {
              lastStatus: 0,
              lastError: err instanceof Error ? err.message : "Unknown error",
              lastFiredAt: new Date(),
            },
          });
        }
      })
    );
  } catch {
    // Webhook failures must never break the main request
  }
}
