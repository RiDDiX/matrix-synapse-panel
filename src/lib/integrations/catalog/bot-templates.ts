export interface BotTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultFeatures: string[];
  configFields: BotConfigField[];
  capabilities: string[];
  threadAware: boolean;
  threadAwareNote?: string;
}

export interface BotConfigField {
  key: string;
  label: string;
  description: string;
  type: "string" | "number" | "boolean" | "textarea" | "select";
  required: boolean;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string }[];
  section?: string;
}

export const BOT_FEATURES = [
  { key: "command_handling", label: "Command Handling", description: "Respond to !commands in rooms" },
  { key: "keyword_triggers", label: "Keyword Triggers", description: "React to specific keywords in messages" },
  { key: "webhook_notifications", label: "Webhook Notifications", description: "Receive and relay webhook payloads to rooms" },
  { key: "scheduled_messages", label: "Scheduled Messages", description: "Send messages on a schedule" },
  { key: "moderation_actions", label: "Moderation Actions", description: "Kick/ban/mute users based on rules" },
  { key: "room_auto_join", label: "Room Auto-Join", description: "Automatically join rooms when invited" },
  { key: "room_responses", label: "Room-Specific Responses", description: "Custom responses per room" },
  { key: "thread_replies", label: "Thread-Aware Replies", description: "Reply in threads where supported by the SDK" },
  { key: "message_relay", label: "Message Relay", description: "Relay messages between rooms or to external systems" },
  { key: "admin_commands", label: "Admin-Only Commands", description: "Commands restricted to admin users" },
] as const;

export type BotFeatureKey = (typeof BOT_FEATURES)[number]["key"];

export const BOT_TEMPLATES: BotTemplate[] = [
  {
    id: "welcome",
    name: "Welcome Bot",
    description: "Greets new members when they join a room with a configurable welcome message.",
    icon: "HandMetal",
    defaultFeatures: ["room_auto_join", "room_responses"],
    configFields: [
      {
        key: "welcome_message",
        label: "Welcome Message",
        description: "Message sent to new members. Use {user} for the username and {room} for the room name.",
        type: "textarea",
        required: true,
        defaultValue: "Welcome to {room}, {user}! Please read the room rules.",
        section: "Messages",
      },
      {
        key: "send_dm",
        label: "Send as DM",
        description: "Send the welcome message as a direct message instead of in the room.",
        type: "boolean",
        required: false,
        defaultValue: false,
        section: "Behavior",
      },
    ],
    capabilities: ["Greet new members", "Room-specific messages", "Optional DM delivery"],
    threadAware: false,
    threadAwareNote: "Welcome messages are sent as top-level room messages.",
  },
  {
    id: "moderation",
    name: "Moderation Helper",
    description: "Assists with room moderation: word filters, spam detection, and admin commands.",
    icon: "ShieldCheck",
    defaultFeatures: ["command_handling", "keyword_triggers", "moderation_actions", "admin_commands"],
    configFields: [
      {
        key: "banned_words",
        label: "Banned Words",
        description: "Comma-separated list of words to filter.",
        type: "textarea",
        required: false,
        section: "Filters",
      },
      {
        key: "action_on_violation",
        label: "Action on Violation",
        description: "What to do when a filter is triggered.",
        type: "select",
        required: true,
        defaultValue: "warn",
        options: [
          { label: "Warn user", value: "warn" },
          { label: "Delete message", value: "redact" },
          { label: "Mute user", value: "mute" },
          { label: "Kick user", value: "kick" },
        ],
        section: "Actions",
      },
      {
        key: "spam_threshold",
        label: "Spam Threshold",
        description: "Number of messages per minute before spam detection triggers.",
        type: "number",
        required: false,
        defaultValue: 10,
        section: "Spam",
      },
    ],
    capabilities: ["Word filtering", "Spam detection", "User warnings", "Admin commands"],
    threadAware: false,
    threadAwareNote: "Moderation applies at the room level. Thread-level moderation is not currently supported by the Matrix spec.",
  },
  {
    id: "keyword_responder",
    name: "Keyword Responder",
    description: "Responds to configurable keywords or phrases with predefined messages.",
    icon: "MessageSquareText",
    defaultFeatures: ["keyword_triggers", "room_responses", "thread_replies"],
    configFields: [
      {
        key: "triggers",
        label: "Trigger Rules (JSON)",
        description: 'Array of {keyword, response} objects. Example: [{"keyword":"help","response":"Visit our FAQ at ..."}]',
        type: "textarea",
        required: true,
        defaultValue: '[]',
        section: "Triggers",
      },
      {
        key: "case_sensitive",
        label: "Case Sensitive",
        description: "Whether keyword matching is case-sensitive.",
        type: "boolean",
        required: false,
        defaultValue: false,
        section: "Behavior",
      },
    ],
    capabilities: ["Keyword matching", "Custom responses", "Thread-aware replies where SDK supports it"],
    threadAware: true,
    threadAwareNote: "Replies in threads if the triggering message is in a thread and the Matrix SDK supports it.",
  },
  {
    id: "webhook_relay",
    name: "Webhook Relay",
    description: "Receives external webhook payloads and posts formatted messages to assigned rooms.",
    icon: "Webhook",
    defaultFeatures: ["webhook_notifications", "room_responses"],
    configFields: [
      {
        key: "webhook_path",
        label: "Webhook Path",
        description: "URL path for incoming webhooks (auto-generated).",
        type: "string",
        required: false,
        section: "Endpoint",
      },
      {
        key: "message_template",
        label: "Message Template",
        description: "Template for formatting webhook payloads. Use {payload.field} for substitution.",
        type: "textarea",
        required: false,
        defaultValue: "Webhook received: {payload.text}",
        section: "Formatting",
      },
      {
        key: "allowed_sources",
        label: "Allowed Source IPs",
        description: "Comma-separated list of allowed source IPs. Empty = all allowed.",
        type: "string",
        required: false,
        section: "Security",
      },
    ],
    capabilities: ["Receive webhooks", "Format and relay messages", "Source IP filtering"],
    threadAware: false,
    threadAwareNote: "Webhook messages are posted as top-level room messages.",
  },
  {
    id: "notification",
    name: "Notification Bot",
    description: "Sends scheduled or event-driven notifications to assigned rooms.",
    icon: "Bell",
    defaultFeatures: ["scheduled_messages", "room_responses"],
    configFields: [
      {
        key: "schedule_cron",
        label: "Schedule (Cron)",
        description: "Cron expression for scheduled messages. Leave empty for event-driven only.",
        type: "string",
        required: false,
        section: "Schedule",
      },
      {
        key: "notification_message",
        label: "Notification Message",
        description: "Default message to send on schedule.",
        type: "textarea",
        required: false,
        section: "Messages",
      },
    ],
    capabilities: ["Scheduled messages", "Room-specific notifications"],
    threadAware: false,
  },
  {
    id: "bridge_support",
    name: "Bridge Support Bot",
    description: "Provides help and status information for installed bridges in assigned rooms.",
    icon: "LifeBuoy",
    defaultFeatures: ["command_handling", "room_responses", "admin_commands"],
    configFields: [],
    capabilities: ["Bridge status commands", "Help text", "Admin diagnostics"],
    threadAware: false,
  },
  {
    id: "custom",
    name: "Custom Command Bot",
    description: "A blank bot template for defining custom commands and behaviors.",
    icon: "Terminal",
    defaultFeatures: ["command_handling", "admin_commands"],
    configFields: [
      {
        key: "command_prefix",
        label: "Command Prefix",
        description: "Prefix for bot commands (e.g., ! or /).",
        type: "string",
        required: true,
        defaultValue: "!",
        section: "Commands",
      },
      {
        key: "commands_json",
        label: "Commands (JSON)",
        description: 'Array of {command, response, adminOnly} objects.',
        type: "textarea",
        required: false,
        defaultValue: '[]',
        section: "Commands",
      },
    ],
    capabilities: ["Custom commands", "Admin-only commands", "Extensible"],
    threadAware: true,
    threadAwareNote: "Thread-aware replies depend on the Matrix SDK capabilities at runtime.",
  },
];

export function getBotTemplate(id: string): BotTemplate | undefined {
  return BOT_TEMPLATES.find((t) => t.id === id);
}
