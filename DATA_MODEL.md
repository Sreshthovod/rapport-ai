# DATA_MODEL.md — Local Storage Schema & Entity Specification

> **Storage Paradigm**: Client-Side IndexedDB (Dexie.js Wrapper)  
> **Privacy Mandate**: 100% On-Device Persistence, Zero Cloud Retention, Local Encryption for Keys  

---

## 1. Entity Specifications

### 1.1 Contact Entity
* **Purpose**: Represents an individual recipient across platforms (Slack / WhatsApp).
* **Attributes**: `id` (string, PK), `platform` (enum: 'slack'|'whatsapp'), `platformUserId` (string), `name` (string), `avatarUrl` (string), `styleTags` (array of strings), `formalityScore` (number 0-1), `brevityPreference` (enum: 'concise'|'detailed'), `createdAt` (timestamp), `updatedAt` (timestamp).
* **Relationships**: Has many `Conversations`, `Memories`, `Commitments`.
* **Lifecycle**: Created on first thread focus; updated post-message dispatch; deleted on explicit user purge.
* **Validation**: `platform` and `platformUserId` required unique compound index.
* **Retention**: Persistent until user purges contact memory.
* **Privacy**: Hashed identifiers stored locally; never synced to remote servers.

### 1.2 Conversation Entity
* **Purpose**: Represents a chat thread session.
* **Attributes**: `id` (string, PK), `contactId` (string, FK), `platform` (string), `lastMessageTimestamp` (timestamp), `sentimentTrend` (string), `activeTopic` (string).
* **Relationships**: Belongs to `Contact`; has many `Commitments`, `RiskSignals`.
* **Lifecycle**: Ephemeral session metadata updated on thread activity.
* **Validation**: Valid `contactId` required.
* **Retention**: Auto-pruned after 90 days of inactivity.
* **Privacy**: Stored locally in IndexedDB.

### 1.3 Goal Entity
* **Purpose**: Defines strategic communication intent templates.
* **Attributes**: `id` (string, PK), `key` (string, unique), `label` (string), `description` (string), `promptDirective` (string), `isPreset` (boolean).
* **Relationships**: Referenced by `ConversationState`.
* **Lifecycle**: System presets loaded on install; custom user goals added dynamically.
* **Validation**: Unique `key` constraint.
* **Retention**: Permanent system presets; user goals kept until deleted.
* **Privacy**: Local settings data.

### 1.4 Memory Entity
* **Purpose**: Atomic rapport notes and relationship insights per contact.
* **Attributes**: `id` (string, PK), `contactId` (string, FK), `note` (string), `source` (enum: 'auto_extracted'|'user_manual'), `confidence` (number 0-1), `createdAt` (timestamp).
* **Relationships**: Belongs to `Contact`.
* **Lifecycle**: Created during conversation analysis or manually via Sidepanel Memory Inspector.
* **Validation**: `contactId` and non-empty `note` required.
* **Retention**: User controllable; editable/deletable in Sidepanel.
* **Privacy**: Stored exclusively in local IndexedDB.

### 1.5 Commitment Entity
* **Purpose**: Tracks informal promises made by or to a contact.
* **Attributes**: `id` (string, PK), `contactId` (string, FK), `conversationId` (string, FK), `text` (string), `type` (enum: 'user_promised'|'contact_promised'), `status` (enum: 'pending'|'fulfilled'|'dismissed'), `dueDate` (timestamp, optional), `createdAt` (timestamp).
* **Relationships**: Belongs to `Contact` and `Conversation`.
* **Lifecycle**: Created by Risk/Memory Engine; marked fulfilled on message dispatch or manual click.
* **Validation**: `status` must be valid enum.
* **Retention**: Kept for 30 days post-fulfillment then archived.
* **Privacy**: Local IndexedDB entity.

### 1.6 Preferences Entity
* **Purpose**: User's tone preferences and UI defaults.
* **Attributes**: `id` (string, PK), `defaultTone` (string), `autoDeescalate` (boolean), `showCommitmentWarnings` (boolean), `shortcutKey` (string).
* **Relationships**: Global single record.
* **Lifecycle**: Initialized on install.
* **Validation**: Valid shortcut syntax.
* **Retention**: Permanent local config.
* **Privacy**: Local only.

### 1.7 Settings Entity
* **Purpose**: Security, API key, and domain configuration.
* **Attributes**: `id` (string, PK), `encryptedApiKey` (string), `llmProvider` (enum: 'openai'|'anthropic'|'gemini'), `blacklistedDomains` (array of strings), `localFirstOnly` (boolean).
* **Relationships**: Global single record.
* **Lifecycle**: Created on onboarding; updated in Settings sidepanel.
* **Validation**: Encrypted payload string validation.
* **Retention**: Permanent until extension reset.
* **Privacy**: API Key encrypted with Web Crypto API (`AES-GCM`).

### 1.8 Conversation State Entity
* **Purpose**: In-memory UI state of the active DOM thread.
* **Attributes**: `activeContactId` (string), `currentDraft` (string), `selectedGoalId` (string), `activeRiskLevel` (enum: 'none'|'warning'|'critical'), `isStreaming` (boolean).
* **Relationships**: Ephemeral runtime object.
* **Lifecycle**: Resets on thread switch or tab close.
* **Validation**: N/A.
* **Retention**: Memory-only (Zustand state store).
* **Privacy**: Non-persistent.

### 1.9 Risk Signals Entity
* **Purpose**: Transient risk events detected during typing.
* **Attributes**: `id` (string, PK), `conversationId` (string, FK), `riskType` (enum: 'hostility'|'unfulfilled_commitment'|'pii_leak'), `severity` (enum: 'low'|'medium'|'high'), `detectedSnippet` (string), `createdAt` (timestamp).
* **Relationships**: Linked to `Conversation`.
* **Lifecycle**: Created on typing evaluation; cleared on message send/dismiss.
* **Validation**: Valid `riskType` enum.
* **Retention**: 7-day transient log for local calibration.
* **Privacy**: Local IndexedDB entity.

---

## 2. Storage & Migration Strategy

### Dexie.js Database Versioning & Schema

```text
Database Name: RapportLocalDB
Version: 1

Stores:
- contacts: 'id, [platform+platformUserId], name, updatedAt'
- conversations: 'id, contactId, lastMessageTimestamp'
- memories: 'id, contactId, createdAt'
- commitments: 'id, contactId, status, dueDate'
- settings: 'id'
- risk_signals: 'id, conversationId, riskType, createdAt'
```

### Migration Pipeline
- Schema changes handled via Dexie versioned upgrade migrations (`db.version(2).stores(...)`).
- Backward-compatible field additions default to `null` or safe fallback values.
