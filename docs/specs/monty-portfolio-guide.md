# Monty Portfolio Guide Specification

## Problem Statement

The portfolio already presents projects and personal work, and includes a Monty interface with chat, knowledge retrieval, page cues, and a bounded action system. In its current form, the experience is still easy to interpret as a chatbot or a decorative overlay. Its behavior collection also includes simplified pointer paths, its knowledge search does not cover public GitHub source code, and it can perform page operations that exceed the desired role of a guide.

The desired experience is a living, helpful Monty that makes the portfolio feel inhabited. It should understand public portfolio information and public project code, notice meaningful browsing context during the current session, respond in the visitor's language, and offer optional guidance. It must never take control away from the visitor.

## Solution

Create Monty as a context-aware portfolio guide with four connected capabilities:

1. Answer portfolio, project, skill, and public-repository questions through grounded retrieval.
2. Form a privacy-preserving semantic summary of the visitor's current browsing context.
3. Choose whether to remain quiet, converse, make a relevant recommendation, or visually guide the visitor.
4. Explain its observable activity through an optional, collapsible activity panel.

The highest testing and integration seam is the **Portfolio Agent behavior contract**: the client submits a bounded session context and user message; the agent service returns a validated response and a restricted set of presentation instructions; the client validates and renders those instructions. The service never controls browser coordinates or performs arbitrary DOM operations.

## User Stories

1. As a portfolio visitor, I want to see a recognizable robot character, Monty, so that the site has a consistent visual identity.
2. As a visitor, I want the robot to remain available while I browse without constantly interrupting me, so that I can explore at my own pace.
3. As a visitor who asks in Chinese, I want Monty to answer in Chinese, so that the conversation feels natural.
4. As a visitor who asks in another language, I want Monty to follow the language of my message, so that I do not need to configure it manually.
5. As a visitor who has selected the Chinese site locale before speaking, I want Monty to begin in Chinese, so that its initial language matches the page.
6. As a visitor looking at a project card or detail view, I want the guide to understand that I spent meaningful time there, so that recommendations can relate to what I am exploring.
7. As a visitor, I want the guide to say things such as “you seem interested in AI projects” rather than quote my dwell time or coordinates, so that its awareness feels lively rather than invasive.
8. As a visitor who has not asked a question, I want the guide to decide whether a helpful invitation or recommendation is worthwhile, so that the site can demonstrate agency without becoming a timed popup.
9. As a visitor, I want proactive suggestions to be concrete and contextual, so that I receive a relevant project, tag, or question rather than generic chatter.
10. As a visitor, I want variety in equally appropriate greetings and suggestions, so that Monty feels like a character rather than a deterministic script.
11. As a visitor, I want a visible do-not-disturb choice, so that I can prevent future unsolicited messages during this visit.
12. As a visitor, I want Monty to sleep after an extended quiet period and wake only after a meaningful new interaction, so that its motion communicates state without interrupting normal browsing.
13. As a visitor who asks about the portfolio, I want grounded answers about personal work, skills, and projects, so that I can evaluate the portfolio efficiently.
14. As a visitor who asks about a public repository, I want concise information about its stack, structure, and relevant module, so that I can understand implementation details.
15. As a visitor who wants source evidence, I want a link to the relevant public GitHub repository or file, so that I can inspect the original code myself.
16. As a visitor, I want Monty to admit uncertainty when it cannot retrieve supporting information, so that I can trust its answers.
17. As a visitor who asks where to find something, I want the robot to move near and highlight the relevant page element, so that I can choose the next click myself.
18. As a visitor, I do not want the robot to click controls, enter text, open panels, change tabs, navigate, or scroll on my behalf, so that I retain complete control of the site.
19. As a visitor navigating nested project views, I want the guide to understand the currently open panel and the elements inside it, so that guidance remains useful beyond the landing page.
20. As a visitor, I want only semantic page interactions from this visit to be used for guidance, so that the experience does not retain a mouse recording or create a cross-session profile.
21. As a privacy-conscious visitor, I want a short, understandable disclosure of the session-only guidance behavior, so that I know what Monty observes and what it does not store.
22. As a portfolio owner, I want an activity icon that turns while the agent is working, so that its retrieval and guide behavior is visibly intentional.
23. As a portfolio owner or interviewer, I want to expand the activity panel, so that I can inspect a concise audit trail of observations, selected goal, tools, and sources without seeing hidden chain-of-thought.
24. As a portfolio owner, I want project tags and semantic targets to be registered centrally, so that the agent can make stable, safe visual references as the interface evolves.
25. As a portfolio owner, I want internal terminology to use `portfolio-agent` while the visitor-facing identity is `Monty`, so that implementation names remain accurate if the mascot changes later.
26. As a portfolio owner, I want existing chat, retrieval, streaming, robot animation, and visual cue capabilities preserved where they fit the new contract, so that the project evolves instead of being rebuilt.
27. As a portfolio owner, I want the agent to have an explicit proactive-message budget and cooldown, so that the site remains welcoming instead of noisy.
28. As a portfolio owner, I want public GitHub repositories to be explicitly allowlisted before indexing, so that only intended public source material is searchable.
29. As a portfolio owner, I want repository indexing to exclude secrets, environment files, generated assets, dependency directories, and Git internals, so that source retrieval remains safe and useful.
30. As a portfolio owner, I want acceptance scenarios that demonstrate observation, grounded retrieval, tool selection, and constrained autonomy, so that the feature credibly demonstrates Agent engineering ability.

## Implementation Decisions

- The user-facing character name is **Monty**. The internal product/module name is **portfolio-agent**. Earlier working names have been migrated across user-visible copy, prompts, configuration, tests, styles, file and module names; the only alias kept is the legacy environment-variable fallback in `backend/app/core/config.py`.
- Monty is a visual companion with emotional animation states: idle, observing, thinking, speaking, guiding, sleeping, and waking. “Waking” is reserved for transition out of real sleep; an ordinary user question while the robot is awake transitions directly to thinking and response.
- The client creates a session-only **behavior context summary** from semantic events, including current route, active detail panels, stable target IDs, hover/dwell on meaningful elements, explicit clicks, visits, visibility, interaction recency, locale, do-not-disturb state, and proactive-message count.
- Raw pointer coordinates, normalized pointer trajectories, and mouse-motion recordings are removed from the service contract and are not sent to the agent. Page interaction data is not retained after the browsing session and is not used for training, analytics profiles, or cross-session tracking.
- The robot may mention a high-level inferred interest in friendly language, but it must not expose mechanical measurements such as exact dwell times, coordinates, or a claim that it has tracked the visitor.
- Agent autonomy is policy-guided, not randomly triggered. The agent chooses among silence, a contextual invitation, a relevant recommendation, an answer, or visual guidance using current context, conversation, available evidence, and interruption limits. Randomness is allowed only to vary among equally valid phrasings or recommendations.
- The proactive policy uses an initial observation window of roughly 20–30 seconds. It requires a concrete, evidence-backed suggestion to interrupt. It applies a session budget, a cooldown after speaking, and immediate suppression after do-not-disturb, dismissal, or repeated non-engagement. Existing thresholds may be tuned during evaluation, but they must remain visible configuration rather than hidden prompt behavior.
- “No interaction” has two distinct outcomes. Reduced mouse activity may trigger an optional dozing animation. True sleep is entered after extended absence or when do-not-disturb is selected. A direct new user message or meaningful new interaction can animate a wake-up before the next response.
- The client exposes a do-not-disturb control. It prevents proactive messages but does not prevent the visitor from explicitly opening the terminal and requesting assistance.
- The retrieval corpus is separated by source type: curated portfolio material and allowlisted public GitHub repositories. Code retrieval supports repository summaries, README content, directory/module information, source chunks, and public file links. It is not an instruction source and cannot expand the agent's tools.
- The existing keyword retrieval capability remains a supported retrieval path. GitHub code retrieval is added through an explicit indexing pipeline and source metadata rather than by inserting an entire repository into a prompt.
- Retrieval answers identify useful repository or file links when requested or when source inspection materially helps. The agent states uncertainty if it cannot retrieve sufficient support.
- Visual targets are declared through a centralized semantic element registry. A target has a stable ID, localized label, route/panel availability, supported presentation capabilities, and related project/tag metadata. Dynamic detail views register and unregister their targets through the same registry.
- The service can select only registered target IDs. It may return restricted presentation instructions such as `speak`, `setState`, `highlight`, `guideTo`, `showHint`, and `showRecommendation`.
- Presentation instructions never include arbitrary CSS selectors, JavaScript, browser coordinates, navigation commands, scrolling commands, click commands, text-entry commands, window-opening commands, or tab-changing commands. The client validates every instruction before rendering it.
- The robot may visually travel near an element and highlight it. The visitor performs every click, scroll, navigation, opening, filtering, and form interaction themselves.
- The existing response streaming path carries the behavior contract response, including conversational content, presentation instructions, source references, and an activity-safe summary. Client validation failures result in a harmless ignored instruction and a trace entry, never a fallback browser action.
- The top-right activity control is a gear-like affordance. It is collapsed by default, rotates only while the agent is retrieving, planning a permitted presentation action, or producing a response, and opens a collapsible panel.
- The activity panel presents an observable audit summary: current state, semantic observations, current user-facing goal, selected permitted action, tools used, and source references. It must not display private model reasoning or hidden chain-of-thought.
- The privacy notice explains in plain language that Monty uses the current page and session interactions to guide the visitor, does not retain mouse paths, and does not create a persistent visitor profile.

## Testing Decisions

- Tests focus on externally visible contract behavior rather than LangGraph node structure, animation internals, implementation-specific DOM queries, or prompt wording.
- The primary contract tests submit representative behavior summaries and messages, then assert that returned text, sources, and presentation instructions conform to the permitted behavior contract.
- Tests cover locale selection: Chinese page locale defaults to Chinese, explicit Chinese messages receive Chinese responses, and other explicit user languages take precedence.
- Tests cover proactive behavior: insufficient context remains silent; a clearly interested visitor receives a contextual suggestion; cooldown, budget, dismissal, and do-not-disturb suppress proactive messages.
- Tests cover sleep semantics: ordinary messages do not create a wake transition while awake; sleep followed by an explicit interaction produces an allowed waking transition; do-not-disturb blocks unsolicited speech.
- Tests verify that semantic summaries contain registered target IDs and high-level events but contain no pointer trajectories or raw coordinates.
- Tests verify that source indexing only includes configured public repositories and excludes environment files, secrets, generated output, dependency folders, and Git metadata.
- Tests verify that repository questions can produce a grounded file link where indexed evidence exists, and that unsupported questions return uncertainty rather than fabricated details.
- Tests verify that every returned visual target is registered and available in the reported route/panel context. Unknown, unavailable, or malformed target IDs are rejected safely by the client.
- Tests verify that no response can cause navigation, scrolling, clicking, text entry, window opening, tab switching, or arbitrary DOM execution.
- Tests verify that a valid guidance response moves/highlights the declared target while leaving completion of the interaction to the visitor.
- Tests verify the activity panel's external behavior: it is collapsed initially, reflects busy/idle state, renders an activity-safe summary and sources, and never exposes hidden reasoning.
- Existing chat, streaming, retrieval, target-cue, and approval-flow tests are reused at their highest available public seam; tests tied only to legacy direct-operation behavior are revised or removed because those operations are out of scope.

## Out of Scope

- Modifying source code, repository content, or portfolio data on behalf of a visitor.
- Autonomous browser control, including clicks, typing, navigation, scrolling, opening overlays, or changing tabs.
- Persistent analytics, behavioral profiling, training on visitor interactions, or cross-session memory of browsing behavior.
- Indexing private repositories, local secrets, environment variables, Git commit history, dependency directories, build output, or unrelated files.
- Explaining private model chain-of-thought in the activity panel.
- A project taxonomy redesign beyond the tags and metadata necessary for accurate recommendations and registered targets.
- Replacing the existing backend framework, streaming transport, robot asset system, or current retrieval implementation when they can satisfy the behavior contract.

## Further Notes

## Issue #1 implementation status

Completed through Phase 6.6: semantic target registration, session-only behavior summaries, proactive policy/DND/state semantics, allowlisted current-source GitHub RAG, activity-safe SSE panel, Monty atlas states, trusted Guide Planner, off-screen guidance, and real DeepSeek browser acceptance. Monty remains display-only: no automatic browser or page operations are in scope. Deployment still requires manual source-index refresh, a configured DeepSeek provider, and GitHub API rate-limit capacity.

This specification intentionally treats “autonomy” as bounded decision-making: Monty chooses whether and how to help, but the visitor retains control over all site actions. Its strongest portfolio demonstration is the combination of grounded retrieval, semantic behavior understanding, constrained tool selection, transparent activity summaries, and privacy-preserving session context.

The activity panel should make the engineering visible without turning the portfolio into a developer console. Its concise trace is an explanation of observable inputs and actions, not a display of hidden model deliberation.

Project taxonomy and GitHub allowlists must be curated before proactive recommendations and source-code answers can be considered complete. The indexing pipeline should be refreshable when approved repository content changes.


## Navigation repair (2026-10-06)

On the first power-on in a page session, the terminal presents three local, bilingual suggestions from `content/guide-offers.json`: AI projects, the drone simulator, and work experience. The greeting and choices appear progressively; selecting a choice types its question into the input without submitting. Enter submits the complete selected question even during typing, while manual edits cancel the remaining insertion. Reduced motion shows text immediately. Dismissal and subsequent power cycles do not replay the welcome. These suggestions require no model call or token allocation.

From `frontend/`, `npm run test:offers` checks all three suggestions in both languages against an isolated real backend, including the complete visitor-operated route. It also verifies explicit submission, editable drafts, and the once-per-page welcome. Start the frontend development server before running this check; the script starts and stops its own backend using `backend/.venv` unless `MONTY_GUIDE_TEST_API` is supplied.

`content/guide-catalog.json` provides curated project aliases, topics, and recommendation order. The backend planner selects only catalog entries that are also registered and guideable in the current page snapshot. It supports starting from the desktop or an already open collection; an unmatched topic does not select an unrelated alphabetical fallback. Every project follows the locally declared Projects → card → detail completion path. Detail arrival ends this tour; internal detail sections require their own semantic targets before they can be guided.

`GuideWorkflow.ts` derives local progress copy for scroll, travel, click, and window waiting. Monty shows up/down (or horizontal) arrows beside the scroll container, updates the compact speech surface in the original request language, and highlights only after reaching a sufficiently visible target. Reduced-motion users keep the direction cues without bobbing or travel interpolation. The visitor still performs every page action.

Continuation follows a real click (including keyboard activation), waits for the active completion window and its registered content, and keeps internal continuation prompts out of the conversation. Layout-generated scroll events do not cancel the next request. Escape cancels explicitly; unrelated clicks and scrolling are reconciled locally, and a hidden document pauses presentation without discarding the destination.

Validation: backend tests cover every catalog project path, starting within Projects, full-stack selection, and unmatched topics. The guided-tour browser check uses a constrained scrolling collection and mocked SSE to verify both scroll directions, keyboard activation, Chinese continuation, reduced motion, and completion cleanup. It does not require or validate a live model provider.


When an unrelated window is active, the guide first points to its registered minimize control. A real visitor click (or keyboard activation) and the subsequent active-window change advance the tour. Stacked windows can be minimized one by one; the original project or desktop-folder goal survives every step. Mounted targets publish readiness on window state changes, not just on registration. No client or server instruction performs minimization itself. Unknown destinations ask for a project/folder name instead of displaying a “safe guide” failure.


## Project discovery before navigation (2026-10-07)

Broad AI, LLM, RAG and other catalog-topic project requests now produce a `projectChoices` event before any guide instruction. Monty's speech bubble lists numbered, underlined project choices with bilingual descriptions. A visitor selection starts an exact-project tour; merely asking for a category never highlights or opens a destination. Pending choices suppress unsolicited messages. Conceptual questions such as “What is RAG?” retain the provider/knowledge path.

The shared catalog derives categories from published project content, not project-name spelling. PingPong's Gemini OCR belongs to LLM/multimodal applications; Web Harvest RAG is a retrieval chatbot; You Don't Need RAG prepares knowledge for long-context models or RAG. AI additionally includes video generation, acoustic machine learning, and computer vision. Topic-aware retrieval returns diverse project summary sources alongside FTS results without requiring a rebuilt index. This initial topic layer is retained alongside the vector retrieval described below.

Validation includes real-API category responses without automatic guidance, grounded search recall, and the bilingual browser path from the AI welcome choice through selecting PingPong to its detail page.


## Local multilingual vector search (2026-10-07)

Knowledge retrieval now combines multilingual E5 embeddings with FTS5/BM25. The quantized ONNX model runs on CPU with a pinned revision and query/passage prefixes. Token-aware overlapping windows retain later section content while preserving parent source IDs. Float32 vectors and model/corpus fingerprints live in the same SQLite database as evidence; incompatible or stale vectors are never compared. Failed full rebuilds keep the old database, and runtime embedding failures visibly degrade retrieval health to lexical mode.

Project descriptions with no known topic or exact project name can use dense evidence to offer up to three catalog-validated candidates. These are explicitly described as possible matches and require selection. A failed match never silently selects the first project. All other navigation remains local, visitor-operated, and unchanged.

The real-model evaluation is `python run.py eval` from `backend/`; deterministic tests cover persistence, source preservation, failure fallback, stale/model-incompatible vectors, and rebuild rollback. This is a small regression corpus, not a claim of perfect semantic understanding.


## Local guide execution and persistent highlights (2026-10-07)

`LocalGuide` owns a fixed destination, the remaining window route, and a replaceable recovery stack. Its start/update/cancel interface emits a semantic target or a completion summary; it performs no desktop actions. The client reconciles actual window state after every state change. It skips reached prerequisites, recovers when the visitor opens a wrong window or closes the collection, and completes when the destination is active. The recovery stack is replaced instead of accumulating stale actions. Visible-window counts exclude minimized windows: one blocking window uses its minimize control; multiple unrelated windows use the registered Show desktop control; useful windows underneath are preserved by minimizing blockers individually.

Project-choice clicks start locally without another model/server request. Text requests receive a `guidePlan` destination once; subsequent steps and completion use only local state and the catalog. The backend retains legacy presentation events for older clients, which the new client ignores after accepting a destination. No guide-step continuation requests are sent by the new client.

A highlight, once acquired, survives scrolling, Monty travel, and viewport clipping. Ordinary presentation highlights no longer expire after 4.5 seconds. Target clicks clear the highlight, removed window elements disappear with it, and explicit cancellation/new requests clear the presentation. Guide sessions no longer expire after 45 seconds; Escape, shutdown, or a replacement request ends them. Monty never clicks, scrolls, minimizes, opens windows, or toggles Show desktop itself.

Browser checks cover ordinary highlight lifetime, scroll persistence, wrong-window recovery, show-desktop keyboard activation, closing/reopening the collection, both motion preferences, bilingual real-API entry, and absence of continuation network requests.
