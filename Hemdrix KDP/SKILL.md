---
name: build-bookflow
description: Instructs the agent to build the full-stack BookFlow app with hyper-polished, luxury mobile-first UI/UX aesthetics, PWA capabilities, and complete backend infrastructure.
---

# Skill: Build BookFlow Platform (Ultra-Deluxe UI/UX & Native PWA)

## Context & Architecture Objectives
You are tasked with building the BookFlow web application from scratch using `prd.md`.
- **Primary Goal**: Create an extraordinarily beautiful, buttery-smooth, native-feeling Progressive Web App (PWA) using Vanilla JS (ES12+), HTML5, CSS3, Express, MongoDB, Socket.io, Cloudinary, and Web Push.
- **Frontend Standard**: The visual quality must look like a premium $100k native iOS/macOS application (dark glassmorphism, fluid micro-interactions, responsive typography, custom design system).

---

## Part 1: Visual Design System & Aesthetics (STRICT COMPLIANCE)

The agent MUST implement a centralized CSS Design System (`/public/css/variables.css` & `style.css`) incorporating the following design specs:

### 1. Color Palette & Dark-Mode First Theme
- **Background**: Deep obsidian dynamic ambient backdrop (`#090A0F` with subtle radial mesh gradient glow effects: `radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15), transparent 70%)`).
- **Glassmorphism Panels**: `rgba(255, 255, 255, 0.03)` with `backdrop-filter: blur(20px) saturate(180%)`, soft borders (`1px solid rgba(255, 255, 255, 0.08)`), and soft drop shadows (`0 20px 40px rgba(0, 0, 0, 0.4)`).
- **Primary Accent**: Electric Indigo / Violet Gradient (`linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)`).
- **Success / Live Pulse**: Neon Emerald (`#10B981` with ambient glow `box-shadow: 0 0 12px rgba(16, 185, 129, 0.4)`).
- **Typography**: System font stack (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `SF Pro Display`, `sans-serif`) with strict modular scale and tracking.

### 2. High-End Micro-Interactions & UX Animation Controls
- **Buttons & Interactive Elements**: Scale feedback on active state (`transform: scale(0.97)`), magnetic focus highlights, and custom shimmer loading sweeps (`@keyframes shimmer`).
- **Card Hover Effects**: Smooth vertical lift (`transform: translateY(-4px)`), dynamic border highlight brightening, and subtle glow expansion (`transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1)`).
- **Tab Transitions**: Sliding pill background highlight indicator (`position: absolute`) that glides effortlessly when switching between **New** and **Downloaded** tabs.
- **Real-Time Websocket Updates**: When a book updates to `DOWNLOADED` via Socket.io:
  - Card displays a subtle pulsing emerald border transition.
  - Smoothly slides out of the "New" tab view with a collapse animation.
  - Increments a floating counter badge on the "Downloaded" tab with a spring pop keyframe animation (`@keyframes pop`).
- **Drag and Drop Zone**: Custom multi-file uploader with dotted electric border, reactive drag-over pulse state, interactive file pill tags showing file type icons (`.pdf`, `.jpg`, `.txt`, `.docx`), and progress indicators.

---

## Part 2: Step-by-Step Implementation Instructions

### Step 1: Project Setup & System Core
1. Execute `npm init -y`.
2. Install runtime dependencies:
   `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `multer`, `archiver`, `cloudinary`, `socket.io`, `web-push`, `cookie-parser`, `dotenv`, `cors`.
3. Create `.env.example` with required key variables (`PORT`, `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `VAPID_*`).

### Step 2: Database Schemas (`/models`)
- `User.js`: Schema with `name`, `email`, `passwordHash`, `role` (`ADMIN`, `WRITER`, `UPLOADER`), `pushSubscription` (Object), `isActive`.
- `Book.js`: Schema with `title`, `sanitizedTitle`, `writerId`, `targetUploaderId`, `cloudinaryPublicId`, `status` (`NEW`, `DOWNLOADED`), `downloadedAt`, `filesIncluded` array. Text index on `title`.

### Step 3: Backend Logic & Proxy Streaming (`/routes`, `/controllers`)
1. **Authentication**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` with `HttpOnly` cookie handling and RBAC middleware.
2. **Push Notifications**: `POST /api/push/subscribe` handling VAPID subscriptions.
3. **Writer Batch Upload**:
   - `POST /api/writer/books/batch`: Accept multipart batch payloads (strictly up to 5 books per submit).
   - In-memory `archiver` packaging: dynamically rename `.docx` (if present), `.pdf`, `.jpg`, `.txt` to `{title}+type.ext`. `.docx` is optional.
   - Stream directly to Cloudinary as `private` resources.
   - Save metadata in MongoDB and send Web Push notifications to targeted Uploaders.
4. **Download Stream Proxy & WebSockets**:
   - `GET /api/uploader/books/:id/download` & `/api/writer/books/:id/download`: Direct stream proxy through Node.js using Cloudinary API credentials.
   - Upon Uploader download: mark DB record as `status = 'DOWNLOADED'`, record `downloadedAt`, and emit Socket.io event `book:downloaded` to room `writer_<id>`.

### Step 4: Front-End SPA & Deluxe Visual UI Build (`/public`)
1. **PWA Infrastructure**:
   - `manifest.json`: Mobile standalone mode, custom theme colors, maskable icons.
   - `sw.js`: Service worker caching app shell and handling push events with native OS notifications.
2. **App Shell Layout**:
   - Fixed top frosted navbar with user profile pill, live WebSocket connection indicator, and role badge.
   - Floating glass bottom bar / top tab bar for seamless view switching.
   - Floating Toast System (`showToast(message, type)`) for elegant feedback.
3. **Role Specific Interfaces**:
   - **Writer Dashboard**:
     - Modern Batch Creation Drawer/Modal with dynamic book builder forms (max 5 cards).
     - Live search bar with instant filtering.
     - Dual-tab views ("New" vs "Downloaded") with animated state transitions.
   - **Uploader Dashboard**:
     - Web Push permission banner modal.
     - Book download cards featuring preview badges, target details, and visual download progress state.
   - **Admin Dashboard**:
     - Glass user management modal, real-time user status switches, and clean data tables.

### Step 5: Final Polish & Verification
1. Ensure visual feedback for all async states (skeleton loaders during dynamic fetches).
2. Verify smooth 60fps animations across viewport sizes (mobile, tablet, desktop).
3. Confirm direct Cloudinary URLs are completely hidden from client source code.
