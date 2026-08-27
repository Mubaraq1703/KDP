# Product Requirement Document (PRD)
## Project Name: BookFlow (Multi-Role Document Packaging & Distribution Engine)

---

### 1. Project Overview & Vision

**BookFlow** is a secure, role-based, progressive Web Application (PWA) with native app-like features designed to streamline document aggregation, automatic standardized file packaging, dynamic targeting, real-time status syncing, and controlled distribution between Content Writers and Content Uploaders (Publishers). Managed by a central Administrator, the platform automates packaging workflows—converting individual manuscript deliverables (`.docx`, `.pdf`, `.jpg`, `.txt`) into standard zipped publication bundles stored securely in Cloudinary and distributed on a strict target-only authorization basis.

---

### 2. Tech Stack & Architecture

| Layer | Technology / Service | Rationale / Specification |
| :--- | :--- | :--- |
| **Front-End** | Vanilla HTML5, CSS3 (Modern Flex/Grid, Custom Properties), JavaScript (ES12+) | Native app-like performance without framework overhead; full PWA implementation (Service Workers, Web App Manifest, Web Push API). |
| **Back-End** | Node.js (v18+ LTS), Express.js | Event-driven asynchronous I/O ideal for multipart file handling, stream processing, and zip generation. |
| **Real-Time & Push** | Socket.io & Web Push (`web-push` npm package + VAPID keys) | WebSockets for instant status synchronization (Writer UI updates on download event) and Native Push Notifications for Uploaders. |
| **Database** | MongoDB Atlas (Mongoose ODM) | Flexible document store for nested schema representations (User profiles, Books, Push Subscriptions, Audit trails). |
| **Storage** | Cloudinary API | Secure asset management utilizing signed private upload presets, private delivery URLs, and automatic resource tagging. |
| **Hosting & Deployment** | Render (Web Service + Persistent Memory Stream) | Seamless Node.js hosting with environment variable encryption and auto-build deployment pipelines. |
| **Compression** | `archiver` / `adm-zip` (Node.js) | In-memory stream zipping before Cloudinary upload to minimize local disk I/O. |

---

### 3. User Roles & Authentication Matrix

#### Role Definitions
1. **Admin (`ADMIN`)**
   - Full system access.
   - Manages user lifecycle (Create, Read, Update, Deactivate/Delete).
   - Assigns roles (`WRITER`, `UPLOADER`).
   - System-wide search and telemetry/audit access.

2. **Writer (`WRITER`)**
   - Uploads, packages, and targets books to specific Uploaders.
   - Batch upload capability (submitting up to **5 books** simultaneously).
   - Searches personal submission repository.
   - Monitors real-time status updates (e.g., `NEW` $ightarrow$ `DOWNLOADED` via Socket.io) and views exact download timestamps.

3. **Uploader (`UPLOADER`)**
   - Target recipient of packaged book bundles.
   - Receives native **Web Push Notifications** upon receiving a new book target assignment.
   - Views personal dashboard filtered strictly to targeted books.
   - Downloads zipped archives (triggers backend stream proxy, state change to `DOWNLOADED`, and timestamp logging).

#### Authentication Specifications
- **JWT (JSON Web Tokens)** stored in `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
- **Bcrypt.js** (Cost factor 12) password hashing.
- Role-based Access Control (RBAC) middleware verifying JWT payload on protected endpoints.

---

### 4. Native Experience Design & PWA Architecture

To fulfill the requirement of a **Native App Experience**:

- **PWA Integration & Web Push**:
  - Full Web App Manifest configuration (`display: "standalone"`, `theme_color`, maskable icons).
  - Service Worker implementation supporting offline app shell caching and Web Push Notification listener using VAPID key pairs.
- **App Shell Architecture**: Dynamic Single Page Application (SPA) structure; navigation and shell persist while main views transition smoothly.
- **Touch-First UI & Micro-Interactions**: Custom bottom sheets, swipe gestures, active feedback states, dynamic skeleton loaders, and floating toast alerts.
- **Real-Time WebSockets Engine**: Integrated Socket.io connection syncing status changes globally between connected Clients.

---

### 5. Detailed Core Workflows & Business Rules

#### 5.1 Document Packaging Rules (The "Book" Contract)
A single **Book** payload requires an assigned **Title**, a selected **Target Uploader**, and up to 4 files. 

**File Requirements**:
- **Optional File**: `.docx` (eBook Manuscript) is **optional**.
- **Supported Extensions**: `.docx`, `.pdf`, `.jpg`, `.txt`.
- Files uploaded are dynamically renamed on the server before compression according to the strict contract:

| Input File Type | Required Extension | Status | Automated Output Filename |
| :--- | :--- | :--- | :--- |
| eBook Manuscript | `.docx` | **Optional** | `{sanitized_title}+ebook.docx` |
| Paperback Manuscript | `.pdf` | Optional/Expected | `{sanitized_title}+paperback.pdf` |
| Book Cover | `.jpg` / `.jpeg` | Optional/Expected | `{sanitized_title}+cover.jpg` |
| Book Metadata | `.txt` | Optional/Expected | `{sanitized_title}+metadata.txt` |

#### 5.2 Server-Side Compression & Storage Workflow
1. Writer submits single or batch book payloads (Maximum **5 books** per batch request).
2. Express backend processes files using `multer` in-memory storage buffers.
3. For each book payload:
   - Validates present files and sanitizes the title string.
   - Instantiates an in-memory zip archive using `archiver`.
   - Appends available files using standardized naming (`title+type.ext`).
   - Pipes the zip stream directly to **Cloudinary** under private permissions (`type: "authenticated"` / `"private"`).
   - Cloudinary returns `public_id` and storage details.
4. Database document created in MongoDB with status `NEW`.
5. **Web Push Notification Triggered**: Server dispatches Web Push notification to the targeted Uploader (`"New Book Uploaded: [Title]"`).

#### 5.3 Direct Proxy Streaming & Download Architecture
- Download requests do **not** redirect to public Cloudinary links.
- When an Uploader or Writer requests a zip download (`GET /api/uploader/books/:id/download`), the backend server verifies permissions, acts as a **Proxy Stream**, fetches the asset privately from Cloudinary using API keys, and pipes the payload directly to the user response headers (`Content-Disposition: attachment; filename="title.zip"`).
- **Download Event Side-Effects**:
  1. Record `downloadedAt = new Date()`.
  2. Change status to `'DOWNLOADED'`.
  3. Emit a Socket.io event `book:downloaded` to the active Writer session to instantly update their UI tab and show the download timestamp without a page refresh.

---

### 6. Interface & Tab Architecture

#### 6.1 Admin Interface
- **User Management Console**: Modal forms for user provisioning (`Name`, `Email`, `Password`, `Role`). Table/Card list for toggling user access and editing details.
- **Audit Logging**: System-wide file distribution summary.

#### 6.2 Writer Interface
- **Action Header**: "Add New Book" builder (batch payload limit: 5 books) and instant Search bar (searches titles, uploaders, and submission dates).
- **Tab 1: New Books**: Books uploaded by the writer with status `NEW`.
- **Tab 2: Downloaded Books**: Books downloaded by uploaders (`status == 'DOWNLOADED'`). Real-time WebSockets instantly move cards from *New* to *Downloaded* and display: `Downloaded At: YYYY-MM-DD HH:mm:ss`.

#### 6.3 Uploader Interface
- **Push Notification Prompt**: Seamless PWA banner requesting native notification permissions.
- **Tab 1: New**: Incoming assigned books (`status == 'NEW'`). Action: "Download Zip Package".
- **Tab 2: Downloaded**: Archived downloaded books (`status == 'DOWNLOADED'`). Re-download available without overwriting original timestamp.

---

### 7. Database Schema (MongoDB / Mongoose)

```javascript
// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'WRITER', 'UPLOADER'], required: true },
  pushSubscription: { type: Object, default: null }, // VAPID Web Push Subscription Object
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Book Schema
const BookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  sanitizedTitle: { type: String, required: true },
  writerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetUploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cloudinaryPublicId: { type: String, required: true },
  status: { type: String, enum: ['NEW', 'DOWNLOADED'], default: 'NEW' },
  downloadedAt: { type: Date, default: null },
  filesIncluded: [{
    originalName: String,
    standardizedName: String,
    fileType: { type: String, enum: ['docx', 'pdf', 'jpg', 'txt'] },
    sizeInBytes: Number
  }]
}, { timestamps: true });

BookSchema.index({ title: 'text' });
```

---

### 8. API & Real-time Specification

#### REST API Routes
- `POST /api/auth/login` | `POST /api/auth/logout` | `GET /api/auth/me`
- `POST /api/push/subscribe`: Save VAPID Web Push subscription object for Uploader.
- `GET /api/admin/users` | `POST /api/admin/users` | `PATCH /api/admin/users/:id`
- `GET /api/writer/uploaders`: List potential uploaders.
- `POST /api/writer/books/batch`: Batch process uploads (Max 5 books). Zip, push to Cloudinary, notify target.
- `GET /api/writer/books?tab=NEW|DOWNLOADED&search=query`: Query writer books.
- `GET /api/writer/books/:id/download`: Direct stream proxy for Writer.
- `GET /api/uploader/books?tab=NEW|DOWNLOADED`: Query uploader targeted books.
- `GET /api/uploader/books/:id/download`: Direct stream proxy, logs timestamp, updates DB state, triggers Socket event.

#### Socket.io Events
- `connection`: Authenticates socket connection with JWT.
- `join:writer` (`room = writer_<id>`): Writer joins dedicated updates channel.
- `book:downloaded` (Emitted by server to `writer_<id>` room): Payload `{ bookId, downloadedAt, status: 'DOWNLOADED' }`. Dynamic UI updates card location and timestamp.

---

### 9. Security & Storage Architecture

1. **Proxy Streaming Security**:
   - Zips in Cloudinary are stored under `authenticated` or `private` delivery types.
   - The backend acts as a stream proxy—verifying authentication headers and streaming asset bytes directly to the client browser without exposing Cloudinary URLs or key signatures.
2. **Batch & Data Constraints**:
   - Rigid limit of **5 books maximum per submission batch** to optimize memory buffers on Render servers.
3. **Data Isolation**:
   - Queries enforced strictly at database layer: Uploaders can *only* access records matching `targetUploaderId == req.user.id`.
