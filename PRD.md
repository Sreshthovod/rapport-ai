# PRD.md: Product Requirements Document

> **Product Name**: Rapport AI (AI Conversation Copilot)  
> **Document Status**: Source of Truth & Strategic Blueprint  
> **Authors**: Senior PM (OpenAI), YC Partner, & Staff PM (Linear)  
> **Target Audience**: Product, Engineering, Design, and Executive Stakeholders  

---

## 1. Executive Summary

Rapport AI is the world's first **Interpersonal Intelligence Engine**—a local-first browser copilot embedded directly into real-time web messaging platforms (Slack Web and WhatsApp Web) that aligns human intent, tone, and contact relationship history in every message sent. Modern digital communication is fast, fragmented, and fraught with misinterpretation, context loss, and cognitive fatigue. Unlike generic AI wrappers or syntax checkers that operate statelessly, Rapport AI maintains a privacy-first, on-device relational memory graph that understands who you are communicating with, tracks informal commitments, and provides real-time line-of-sight guidance before messages are dispatched. By bridging the gap between human emotional intelligence and real-time chat speed, Rapport AI ensures that high-stakes digital conversations build long-term trust, resolve conflict, and achieve intended outcomes.

---

## 2. Problem Statement

### 2.1 The Crisis in High-Velocity Digital Communication
Modern work and personal lives are conducted across real-time web messaging tools like Slack Web and WhatsApp Web. However, high-speed asynchronous text introduces severe structural pain points:
1. **Context Loss & Fragmentation**: Critical recipient history, past promises, communication nuances, and rapport baselines are scattered across hundreds of chat threads.
2. **Tone Mismatch & Emotional Friction**: Text lacks body language, vocal cadence, and facial cues. Annoyed or brief messages are frequently misinterpreted as hostile, defensive, or passive-aggressive.
3. **Cognitive Fatigue & Context Switching**: Users spend immense mental energy deciding *how* to frame sensitive responses, declining scope creep, or formulating delicate pushbacks.
4. **Dropped Commitments**: Informal promises made in fast-moving chat channels (*"I'll send that deck by 3 PM"*) are easily forgotten, degrading professional credibility over time.

### 2.2 Why Existing Solutions Fail

| Existing Solution | Primary Failure Mode | Strategic Gap |
| :--- | :--- | :--- |
| **ChatGPT / Gemini** | **Stateless & Disconnected** | Require manual context switching (copy-pasting chat threads). Zero awareness of *who* you are talking to or past commitment history. |
| **Grammarly** | **Mechanistic, Not Relational** | Focuses on spelling, syntax, and dictionary rules. Treats text as isolated sentences without understanding interpersonal goals or recipient dynamics. |
| **Apple Intelligence** | **Superficial & Platform-Locked** | Offers generic 3-word canned responses ("Sounds good!") locked to Apple hardware, absent from web-based Slack/WhatsApp. |
| **AI Keyboards / Wrappers** | **The "AI Uncanny Valley"** | Generate robotic, over-polished corporate speak that recipients immediately flag as synthetic, damaging authentic rapport. |

### 2.3 The Cost of Failure
- **Financial**: Lost client contracts, billable scope creep, and churned accounts due to communication misalignments.
- **Career**: Damaged internal workplace relationships, team friction, and missed promotions caused by impulse or defensive messaging.
- **Mental**: Persistent workplace anxiety, dread of opening messaging apps, and cognitive burnout.

---

## 3. Target User Personas

### Persona 1: The Remote Professional & Team Lead
* **Profile**: Alex, Senior Engineering Manager managing a distributed team of 12 across 4 time zones on Slack Web.
* **Goals**: Maintain team alignment, deliver constructive feedback safely, and prevent team burnout without sounding harsh.
* **Pain Points**: Messages sent late at night sound snappy; struggles to balance firmness with empathy during high-stress pushes.
* **Current Workflow**: Drafts sensitive Slack messages in Apple Notes, rewrites them twice, pastes them into Slack.
* **Existing Alternatives**: Grammarly, ChatGPT copy-paste.

### Persona 2: The Freelancer & Agency Owner
* **Profile**: Maya, Independent Brand Strategist managing 8 client accounts simultaneously over WhatsApp Web and Slack.
* **Goals**: Protect project scope, decline unpaid client requests politely, and ensure zero dropped promises.
* **Pain Points**: Clients push boundaries over chat; forgets informal commitments made during rapid WhatsApp exchanges.
* **Current Workflow**: Manually tags tasks in Notion after reading chats; spends 15 minutes drafting uncomfortable price pushbacks.
* **Existing Alternatives**: Manual email templates, Notion databases.

### Persona 3: The Tech Founder & Executive
* **Profile**: David, CEO of a 20-person startup pitching investors, managing engineers, and handling key customer escalations.
* **Goals**: Move extremely fast without breaking key investor, board, or customer relationships.
* **Pain Points**: High risk of sending impulse, defensive, or unfiltered responses during stressful crises.
* **Current Workflow**: Dictates rough messages to assistants or sends abrupt 1-line Slack messages that trigger team panic.
* **Existing Alternatives**: Executive assistants, raw unassisted typing.

### Persona 4: The Recruiter & Talent Manager
* **Profile**: Sarah, High-Volume Tech Recruiter communicating with 50+ candidates daily across LinkedIn and WhatsApp Web.
* **Goals**: Build rapid rapport, adapt tone to different candidate seniority levels, and maintain warm relationships.
* **Pain Points**: High cognitive fatigue from repetitive phrasing; candidate ghosting due to cold outreach tone.
* **Current Workflow**: Copy-pasting text macros; manual re-reading of past candidate chat history.
* **Existing Alternatives**: LinkedIn Recruiter templates, text expansion snippets.

### Persona 5: The Non-Native English Communicator
* **Profile**: Kenji, Senior Product Designer working at a US tech company from Tokyo.
* **Goals**: Communicate with native-level idiomatic precision, understand subtle American workplace subtext, and express complex ideas confidently.
* **Pain Points**: Constant fear of sounding rude, misinterpreting passive-aggressive Slack feedback from colleagues.
* **Current Workflow**: Translates messages via DeepL, runs through Grammarly, pastes into Slack.
* **Existing Alternatives**: DeepL, Grammarly, ChatGPT.

### Persona 6: The Student & Early-Career Professional
* **Profile**: Elena, Final-year University Student messaging professors, recruiters, and internship managers.
* **Goals**: Sound professional, respectful, and articulate without sounding overly stiff or inexperienced.
* **Pain Points**: Imposter syndrome; uncertainty around formal vs informal digital etiquette.
* **Current Workflow**: Asks peers to review important emails/chats before sending.
* **Existing Alternatives**: Google Search, generic ChatGPT prompts.

---

## 4. Product Vision & Identity

### 4.1 Mission
To elevate human digital communication by embedding interpersonal intelligence, goal alignment, and local context into every message sent across the web.

### 4.2 Long-Term Vision (5-Year Horizon)
Rapport AI will become the universal, privacy-first **Interpersonal Intelligence Layer** across all digital touchpoints—an autonomous relational memory that ensures human communication is clear, empathetic, and aligned with long-term human trust.

### 4.3 Core Philosophy
Text is not just syntax; it is the medium of human relationships. AI should never replace human voice—it should calibrate intent, surface context, and prevent emotional missteps.

### 4.4 North Star Metric
**High-Trust Message Rate**: The percentage of user messages sent with 100% tone alignment and zero unaddressed commitment warnings.

### 4.5 Category Definition
Creating the **Interpersonal Intelligence Engine** category (moving beyond generic "AI Writing Assistants").

---

## 5. Product Principles

1. **Privacy First & Non-Negotiable**: User conversation history belongs strictly to the user. Zero cloud retention of raw chat logs.
2. **Human Voice First**: AI calibrates and refines the user's authentic voice; it never generates generic corporate fluff that sounds like a bot.
3. **AI Assists, Never Replaces**: The user is always in the driver's seat. Suggestions require explicit 1-action approval (`Tab` or Click).
4. **Intent Before Replies**: Always understand *what* outcome the user wants to achieve before generating or rephrasing text.
5. **Local-First Architecture**: Storage, relationship indexing, and memory graphs run on-device inside browser IndexedDB.
6. **Zero-Friction Line of Sight**: Guidance lives directly in the active typing viewport (Shadow DOM). Never force modal context switching.
7. **Trust Through Transparency**: Always show *why* a suggestion or commitment alert was surfaced.
8. **Relational Memory Over Raw Speed**: Prioritize understanding recipient history over generating rapid 1-click canned responses.

---

## 6. Product Goals

### 6.1 Business Goals
- **Category Leadership**: Establish Rapport AI as the premier privacy-first relationship copilot for high-stakes professionals.
- **Conversion & Retention**: Achieve a 45%+ 30-day user retention rate driven by the compounding local memory graph moat.
- **Monetization**: Build a sustainable BYOK / Freemium SaaS model targeting power professionals and agencies.

### 6.2 User Goals
- **Zero Miscommunication**: Eliminate embarrassing tone mishaps, angry impulse sends, and defensive chat escalations.
- **Zero Dropped Commitments**: 100% tracking of informal promises made in chat threads.
- **Cognitive Relief**: Reduce time spent agonizing over delicate message phrasing by 60%.

### 6.3 Engineering Goals
- **Sub-800ms Latency**: Real-time streaming response delivery from API gateway to browser DOM.
- **Zero DOM Bleeding**: 100% Shadow DOM encapsulation preventing layout shifts on host web apps.
- **Sub-15ms Local Queries**: Instant IndexedDB local memory graph retrieval.

### 6.4 Hackathon Goals
- **Judges' "WOW" Factor**: Deliver a 2-minute live demo on Slack Web showing instant **De-escalation Interception** and **Commitment Guardrail Alerting**.
- **Flawless Execution**: Zero layout crashes or failed DOM event dispatches during live evaluation.

---

## 7. Non-Goals (What We Are NOT Building)

- **NOT Another Chatbot**: We do not provide a conversational Q&A window where users type "Tell me a joke."
- **NOT Another AI Keyboard**: We do not replace system-wide software keyboards with generic prompt buttons.
- **NOT a CRM System**: We do not build complex corporate sales pipelines, lead scoring, or deal stages.
- **NOT an Autonomous Messaging Bot**: We will NEVER auto-send messages on behalf of a user without explicit human trigger and approval.
- **NOT a Heavy Cloud Database**: We do not store, scrape, or sell user chat logs on centralized cloud infrastructure.

---

## 8. Success Metrics Framework

```text
+-----------------------------------------------------------------------+
|                         SUCCESS METRIC TREE                           |
+-----------------------------------------------------------------------+
|  NORTH STAR: High-Trust Message Rate (% messages with 0 tone alerts)  |
+-----------------------------------------------------------------------+
           │                                          │
           ▼                                          ▼
[ Retention & Engagement ]                  [ Feature Adoption ]
  • WAU / MAU Ratio > 55%                     • Guardrail Accept Rate > 75%
  • 30-Day Retention > 45%                    • Tone Selector Usage > 4x/day
  • Daily Active Chats > 8                    • Commitment Check Dismiss < 10%
```

### Key Performance Indicators:
- **User Engagement**: >8 active conversation interactions per user per day.
- **Retention**: >45% 30-day retention curve (beating standard extension 15% averages).
- **Feature Adoption**: >75% acceptance rate of suggested De-escalation rewrites.
- **Performance**: <800ms generation stream delivery; 0ms typing input lag.

---

## 9. Risk & Mitigation Matrix

| Risk Category | Specific Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Technical** | Host web app (Slack/WhatsApp) updates DOM selectors, breaking scraper script. | High | Implement resilient multi-fallback DOM selector engine & MutationObservers. |
| **Product** | "AI Uncanny Valley" — suggestions sound synthetic or robotic. | High | Focus prompts on micro-edits and diff-calibrations of the user's authentic draft. |
| **Privacy** | Users fear sensitive chat logs are stored in cloud databases. | Critical | Strict local-first architecture (IndexedDB); explicit "0 Cloud Storage" UI badges. |
| **Adoption** | Users find typing manual responses faster than checking AI suggestions. | Medium | Keyboard-first UX (`Tab` to accept, `Cmd+K` palette); zero-modal line-of-sight UI. |
| **Competitive** | Big tech platforms (Apple, Google, Slack) release native basic writing tools. | Medium | Double down on cross-platform neutrality and persistent recipient-specific memory graph. |

---

## 10. Future Vision (3–5 Year Horizon)

Over the next 3–5 years, Rapport AI will evolve beyond a browser extension into the **Universal Interpersonal Layer**:

- **Year 1**: Dominion over web-based real-time messaging (Slack, WhatsApp, Telegram, Discord, LinkedIn).
- **Year 2**: Ambient OS-level integration (Mac/Windows desktop app) monitoring all text inputs across native desktop tools.
- **Year 3**: Cross-device encrypted peer-to-peer memory sync, allowing relationship profiles to move seamlessly between mobile and desktop without cloud servers.
- **Year 5**: Multimodal relational intelligence—analyzing voice tone during video calls (Zoom/Google Meet) to provide real-time private coaching on empathy and negotiation dynamics.

---

## 11. One-Page Executive Summary (Read in Under 2 Minutes)

> **Rapport AI** is an **Interpersonal Intelligence Engine** designed to solve the crisis of modern digital communication—where fast, fragmented chat across Slack and WhatsApp leads to tone misalignments, dropped commitments, and burnout.
> 
> Unlike generic AI writing tools (Grammarly, ChatGPT) that operate statelessly on isolated sentences, Rapport AI maintains a **privacy-first, local-first Relational Memory Graph** inside browser IndexedDB. It understands *who* you are talking to, remembers past thread commitments, and provides line-of-sight guidance directly inside chat input areas.
> 
> **Core Differentiators**:
> 1. **The Commitment Guardrail**: Passively tracks informal promises (*"I'll send that deck by 3 PM"*) and warns users before they sign off without fulfilling them.
> 2. **The De-Escalation Brake**: Intercepts hostile or defensive drafts in real time with 1-click calm rephrasings.
> 3. **Strict Local-First Privacy**: Zero cloud retention of conversation history.
> 
> **Target Audience**: Remote leaders, freelancers, founders, recruiters, non-native English communicators, and anyone managing high-stakes relationships.
> 
> **Category Definition**: Establishing the *Interpersonal Intelligence* category—ensuring technology enhances human empathy and trust rather than replacing human voice with generic AI fluff.
