# CLAUDE.md — DeployDiff

## Product Name

**DeployDiff**  
**Tagline:** Not git diff. Deploy diff for humans.

---

## Product Overview

DeployDiff is a visual deploy review and approval platform.

It helps freelancers, agencies, and product teams show **exactly what changed before deployment** in a way that non-technical stakeholders can understand.

Instead of sending a raw preview link and saying “check the changes,” the system compares the current production version with the new preview version, generates visual diffs, summarizes the changes, and creates a shareable review page where stakeholders can comment and approve.

This is not just a diff viewer.  
This is a **deploy communication and approval workflow tool**.

---

## Core Problem

Current deploy review workflows are messy.

Typical flow today:
- developer pushes code
- preview URL is generated
- developer sends the link in Slack, email, or WhatsApp
- client or teammate tries to remember how the old version looked
- feedback gets scattered
- approvals are vague or missing
- production deploy happens with uncertainty

Pain points:
- clients do not know what changed
- non-technical people cannot read git diffs
- designers and PMs waste time manually checking pages
- feedback is fragmented across tools
- freelancers look less professional than they could
- teams deploy changes without a clear signoff flow

---

## Product Promise

DeployDiff should answer one simple question:

**“Before this goes live, what exactly will change?”**

The product must make that answer:
- visual
- trustworthy
- shareable
- commentable
- approvable

---

## Target Users

### 1. Freelancers
They want to show work professionally and reduce confusion with clients.

### 2. Agencies
They need a repeatable client review process before launch.

### 3. Product teams
They want PMs, designers, QA, and stakeholders to review release changes visually.

### 4. Website-focused teams
Marketing sites, product sites, landing pages, dashboards, and CMS-driven pages are all suitable.

---

## Ideal Early Market

The best early market is:
**Freelancers and agencies shipping website changes for clients**

Why:
- clear pain
- easier willingness to pay
- visual review matters a lot
- client-facing approval is valuable
- professional presentation matters

---

## Positioning

Do not position this as:
- a testing tool
- a raw visual regression suite
- a git diff UI

Position it as:
- visual deploy review
- client-friendly release review
- deploy approval workflow
- release communication layer

Good positioning phrases:
- See exactly what changes before you deploy
- Turn preview links into review links
- Visual deploy approvals for clients and teams
- Show changes clearly before production
- Not git diff. Deploy diff for humans.

---

## Product Vision

A modern team should be able to:
1. connect a repo and preview source
2. compare preview vs production
3. automatically detect changed pages
4. generate before/after visual comparisons
5. summarize what changed in plain language
6. collect comments in one place
7. approve or reject changes
8. optionally block production deploy until approval

Long term, this product can evolve into:
- deploy approval platform
- agency release portal
- visual QA workspace
- release signoff system
- preview collaboration layer

---

## MVP Scope

The first version should stay focused.

### MVP Goal
Create a reliable workflow where a user can:
- connect a project
- compare production and preview
- see visual changes on selected pages
- share a review link
- collect comments
- approve or reject

### MVP Features
- project setup
- production URL input
- preview URL input or integration
- route list for pages to compare
- screenshot capture for both versions
- visual diff generation
- review page
- comments
- approve / reject status
- shareable link

### Explicitly not required in MVP
- perfect route crawling
- full AI analysis
- complex role matrix
- white-labeling
- Figma integration
- deploy blocking
- enterprise SSO
- advanced audit features

---

## User Stories

### Freelancer story
As a freelancer, I want to send a client one link that clearly shows what changed, so I do not have to explain every change manually.

### Agency story
As an agency PM, I want all client feedback for a deploy review to live in one place, so approvals are not scattered across Slack, email, and calls.

### Designer story
As a designer, I want to compare old and new UI visually, so I can spot unintended changes quickly.

### Founder story
As a startup founder, I want to approve a release confidently without reading code, so I know what will go live.

### Team story
As a product team, we want a clear review status before release, so we reduce accidental or unclear deploys.

---

## Primary Workflow

### Flow 1 — Create review
1. User connects repo or manually creates project
2. User sets:
   - production URL
   - preview URL source
   - routes to compare
3. A new deploy review job starts
4. System captures screenshots
5. System computes visual diffs
6. System builds a review page
7. User shares the review link

### Flow 2 — Reviewer feedback
1. Reviewer opens the review page
2. Reviewer sees changed pages
3. Reviewer compares before vs after
4. Reviewer leaves comments on specific pages or regions
5. Reviewer marks review as approved or needs changes

### Flow 3 — Owner action
1. Project owner receives feedback
2. Owner resolves comments or updates code
3. Owner regenerates review if needed
4. Final approval is recorded

---

## Core Product Modules

## 1. Project Setup Module
Stores:
- project name
- production URL
- preview source
- review route configuration
- optional auth config
- viewport defaults

The system should support:
- manual setup initially
- repo integration later

---

## 2. Integration Module
Initial support can be simple.

### Early integrations
- GitHub
- Vercel
- Netlify
- manual preview URL input

### Later integrations
- GitLab
- Cloudflare Pages
- custom webhooks
- CMS and no-code platforms

The goal is not to build every integration on day one.  
The goal is to make review generation easy and dependable.

---

## 3. Route Selection Module
The system needs to know which pages to compare.

### MVP options
- manual route list
- fixed list per project

### Later options
- sitemap import
- crawler-based discovery
- framework-aware route discovery

Each route record may include:
- path
- label
- requires auth
- viewport overrides
- ignore regions

---

## 4. Capture Engine
This is one of the core technical systems.

The system must:
- open the production page
- open the preview page
- wait for stable render
- capture screenshots
- do this across one or more viewports

### Recommended approach
Use a headless browser automation engine such as Playwright.

### Requirements
- stable rendering
- configurable waiting
- network idle or selector-based wait
- animation handling
- cookie banner handling
- auth session support
- screenshot storage

---

## 5. Diff Engine
The diff engine compares old and new versions.

### MVP output
- before screenshot
- after screenshot
- diff overlay or highlighted changes
- changed / unchanged status

### Later enhancements
- region-level diff severity
- text-level change summary
- DOM-aware comparison
- false-positive reduction
- masked dynamic areas

The key principle:
The output must be understandable by a non-technical reviewer.

---

## 6. Review Experience
This is the main user-facing surface.

### Review page must include
- review title
- review status
- list of changed pages
- before/after comparison
- slider or side-by-side mode
- comments
- approval controls

### Desired UX
- simple
- client-friendly
- low jargon
- easy to scan
- strong visual emphasis

---

## 7. Commenting Module
Comments should be tied to context.

### MVP commenting
- comment per page
- threaded discussion
- status indicator

### Later commenting
- pin comments to coordinates
- region annotations
- mention teammates
- resolve/unresolve
- comment filters

---

## 8. Approval Module
Approvals transform the product from a viewer into a workflow tool.

### MVP statuses
- pending
- approved
- needs changes

### Later extensions
- multi-step approval
- required approvers
- role-based signoff
- audit history
- conditional deploy gate

---

## 9. Share Layer
A big part of the value is how easily the review can be shared.

### MVP
- shareable review link
- optional password protection
- reviewer name capture

### Later
- expiring links
- branded links
- client portals
- email invitation flows

---

## 10. Summary Layer
The system should help explain changes in plain language.

### MVP
Basic structured summary based on detected route changes.

Example:
- Home page changed
- Pricing page changed
- Checkout page changed

### Later
AI or hybrid summaries such as:
- Hero heading updated on the homepage
- Pricing card CTA buttons were changed
- Dashboard sidebar now includes a billing section
- Checkout form now includes a phone field

The summary should never invent changes. It must remain grounded.

---

## Technical Challenges to Solve

## 1. Non-deterministic screenshots
Visual comparison breaks when pages render differently on every load.

Sources of noise:
- animations
- rotating carousels
- timestamps
- random content
- ads
- live counters
- chat widgets
- cookie banners

### Product requirement
The system must include strategies to reduce noisy diffs.

### Potential methods
- disable animations
- inject CSS to freeze transitions
- ignore specific selectors
- mask regions
- wait for stable layout
- hide dynamic widgets during capture

---

## 2. Authenticated pages
Some pages require login.

### MVP support
- saved login session
- test credentials
- scripted login flow if necessary

This should be designed carefully since many valuable routes live behind auth.

---

## 3. Route coverage
Users need a practical way to define what gets compared.

The route model should balance:
- ease of setup
- coverage
- reliability

Manual routes are fine in MVP if the review output is excellent.

---

## 4. Cost control
Screenshot capture and storage can become expensive.

The architecture should account for:
- job queues
- concurrency limits
- screenshot retention policies
- object storage lifecycle
- plan-based usage caps

---

## 5. Trust and false positives
If the product frequently shows meaningless diffs, users will stop trusting it.

Success depends on:
- stable capture
- clear diff presentation
- noise reduction
- understandable output

Trust is a product requirement, not only a technical metric.

---

## Product Architecture

### Suggested high-level flow
1. webhook or manual trigger received
2. review job created
3. routes resolved
4. production pages captured
5. preview pages captured
6. visual diffs computed
7. artifacts stored
8. review record created
9. share link generated
10. notifications sent

---

## Suggested System Components

### Web app
Handles:
- dashboard
- project settings
- review pages
- comments
- approvals
- billing
- auth

### API/backend
Handles:
- integrations
- review job orchestration
- route management
- comment and approval logic
- notification logic

### Capture workers
Dedicated workers for:
- browser automation
- screenshot generation
- diff processing

### Queue
For:
- review job scheduling
- retries
- async capture tasks

### Storage
- database for metadata
- object storage for screenshots and diff assets

---

## Suggested Data Model

### Project
- id
- name
- owner_id
- production_url
- preview_source_type
- settings
- created_at

### Route
- id
- project_id
- path
- label
- requires_auth
- ignore_rules
- viewport_config

### Review
- id
- project_id
- source_ref
- preview_url
- production_url
- status
- approval_status
- summary
- created_at

### ReviewPage
- id
- review_id
- route_id
- before_image_url
- after_image_url
- diff_image_url
- change_status
- severity

### Comment
- id
- review_id
- review_page_id
- author_id_or_guest
- body
- status
- created_at

### Approval
- id
- review_id
- actor_id_or_guest
- decision
- note
- created_at

---

## MVP UX Requirements

The product should feel:
- polished
- minimal
- professional
- non-technical-friendly

### Dashboard should show
- projects
- recent reviews
- pending approvals
- change counts
- statuses

### Review detail page should show
- review status
- page list
- changed pages first
- visual compare tools
- comments
- approval actions

### Share view should be simpler than the internal workspace view
The share view should remove unnecessary technical detail and focus on:
- what changed
- where
- comments
- approval

---

## Pricing Hypothesis

### Freelancer Plan
- small number of active projects
- limited reviews per month
- basic comments
- share links

### Agency Plan
- multiple projects
- more reviews
- branded workspace
- more reviewers
- approval workflow

### Team / Pro Plan
- higher limits
- integrations
- role management
- advanced notifications
- deploy gate in later phases

Early pricing idea:
- Freelancer: affordable monthly plan
- Agency: higher workspace-based plan
- Enterprise later

---

## Key Differentiation

DeployDiff should not compete primarily as a QA automation product.

It should win by focusing on:
- client presentation
- stakeholder clarity
- release communication
- approval workflows
- usability for non-engineers

This is the gap:
Most diff tools are made for engineers.  
DeployDiff is for **everyone involved in a release**.

---

## Why This Can Win

### 1. The pain is real
People constantly struggle to explain changes before launch.

### 2. Review is collaborative
A release is rarely only an engineering event.

### 3. Existing tools are too technical
Git diff and raw regression tools do not solve the communication layer.

### 4. The product is easy to understand
The value proposition is immediately clear.

### 5. It can expand naturally
From screenshot diff -> comments -> approvals -> deploy gate

---

## Risk Areas

### 1. False positives
Too much noise reduces trust.

### 2. Capture fragility
Complex websites may render inconsistently.

### 3. Weak onboarding
If setup is hard, people churn early.

### 4. Overbuilding too early
Do not add too many enterprise-style workflows before the core review loop is solid.

---

## Risk Reduction Plan

- start with a focused website/preview use case
- support manual route setup first
- optimize screenshot reliability early
- build strong ignore-region handling
- make review pages excellent before adding many integrations
- keep approval model simple at first

---

## Recommended MVP Strategy

### Phase 1
- manual setup
- production URL
- preview URL
- route list
- screenshot diff
- shareable review page
- comments
- approve / reject

### Phase 2
- GitHub integration
- Vercel integration
- better route management
- mobile and tablet viewports
- summary improvements

### Phase 3
- approval gates
- Slack or email notifications
- branded client portals
- multi-project agency workspace

---

## Metrics to Track

### Activation metrics
- project created
- first review generated
- first share link opened
- first comment added
- first approval recorded

### Product quality metrics
- screenshot success rate
- review generation time
- false-positive complaint rate
- diff trust score from users

### Commercial metrics
- projects per workspace
- reviews per month
- conversion to paid
- churn
- client invite frequency

### Behavior metrics
- most compared routes
- most common viewport usage
- percentage of reviews approved
- average comments per review

---

## Success Criteria

DeployDiff is successful if:
- users can generate a useful deploy review quickly
- non-technical reviewers understand what changed without assistance
- comments and approvals happen inside the product
- users trust the output enough to rely on it before deployment
- freelancers and agencies feel more professional using it

---

## Initial Product Boundaries

Do not try to build:
- full automated QA suite
- exhaustive browser matrix testing
- enterprise compliance platform
- all-in-one CI/CD platform
- broad code review replacement

Stay focused on:
**visual deploy review + share + comments + approval**

---

## Builder Principles

When building this product, follow these principles:

- make the output client-friendly
- reduce noise aggressively
- optimize for clarity over technical detail
- focus on review workflow, not just diff generation
- avoid jargon in user-facing surfaces
- keep the first setup as simple as possible
- treat trust as a core product feature
- design for freelancers and agencies first

---

## Suggested Initial Stack Directions

The exact stack can vary, but the architecture should support:
- modern web app for dashboard and review UI
- backend for orchestration and integrations
- queue-based worker system
- headless browser capture
- object storage
- relational database for metadata

A possible implementation could include:
- web app framework of choice
- backend framework of choice
- Playwright for capture
- Postgres for metadata
- Redis or queue system for jobs
- S3-compatible storage for image artifacts

The important part is not the branding of the stack.
The important part is:
- dependable job execution
- stable captures
- good review UX
- scalable artifact storage

---

## Long-Term Expansion Ideas

Possible future modules:
- visual release notes
- Figma-to-live comparison
- deploy blocking until approval
- white-label client portals
- Slack and Jira integration
- release audit trail
- team role workflows
- route auto-discovery
- regression severity scoring
- CMS and no-code integrations

These should come later, only after the core review loop works very well.

---

## Final Strategic Summary

DeployDiff should begin as:

**A visual review and approval layer between preview deploys and production deploys**

Its job is to turn a vague preview link into:
- a clear explanation of changes
- a collaborative review page
- a trustworthy approval flow

The product should feel like:
- a professional delivery layer for freelancers
- a release review layer for agencies
- a clarity layer for product teams

Focus first on:
- stable capture
- understandable visual diffs
- shareable review pages
- comments
- approvals

Everything else comes after that foundation is excellent.