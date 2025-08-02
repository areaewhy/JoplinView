# Joplin S3 Notes Manager

## Overview

This is a full-stack web application built to manage and view Joplin notes stored in Amazon S3. The application provides a web interface to browse, search, and view markdown notes that have been exported from Joplin to an S3 bucket. It features a modern React frontend with a Node.js/Express backend, using PostgreSQL for data storage and Drizzle ORM for database operations.

**Current Status**: Successfully deployed and working with real Joplin notes from S3-compatible storage (Backblaze B2). The application properly parses Joplin's native note format, filters out revisions and resources, and displays notes with correct titles and markdown rendering.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store
- **File Storage**: AWS S3 integration for reading Joplin exports
- **Development**: Hot reload with Vite integration in development

### Key Components

#### Database Schema (PostgreSQL + Drizzle)
- **s3_configs**: Stores S3 bucket configuration (credentials, region, bucket name, optional custom endpoint URL)
- **notes**: Stores parsed Joplin notes with metadata (title, body, tags, timestamps)
- **sync_status**: Tracks synchronization status and statistics

#### API Endpoints
- **S3 Configuration**: CRUD operations for S3 settings and connection testing
- **Notes Management**: Fetch, search, and filter notes
- **Sync Operations**: Synchronize notes from S3 bucket

#### Frontend Components
- **Settings Panel**: Configure S3 credentials and manage sync
- **Notes List**: Browse and search through available notes
- **Note Viewer**: Display individual notes with markdown rendering
- **Loading States**: Comprehensive loading and error handling

### Data Flow

1. **Configuration**: User configures S3 bucket credentials through the settings panel
2. **Synchronization**: Backend connects to S3, fetches markdown files, and parses metadata
3. **Storage**: Parsed notes are stored in PostgreSQL with full-text search capabilities
4. **Display**: Frontend fetches notes via REST API and renders with markdown support
5. **Search**: Real-time search across note titles, content, and tags

### External Dependencies

#### S3 Integration
- **AWS SDK**: v2 for S3 operations with support for custom endpoints
- **S3 Operations**: List objects, read file content, test connections
- **S3-Compatible Services**: Support for MinIO, DigitalOcean Spaces, and other S3-compatible providers
- **Credential Management**: Secure storage of access keys and custom endpoint URLs

#### Database
- **Neon Database**: Serverless PostgreSQL provider
- **Connection Pooling**: Managed through Neon's serverless driver
- **Migrations**: Drizzle Kit for schema management

#### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **Date-fns**: Date formatting and manipulation
- **Marked**: Markdown parsing and rendering
- **Highlight.js**: Syntax highlighting for code blocks

### Deployment Strategy

#### Development
- **Local Development**: Vite dev server with Express backend
- **Hot Reload**: Full-stack hot reload with Vite middleware
- **Environment**: NODE_ENV=development with debug logging

#### Production Build
- **Frontend**: Vite builds to `dist/public` directory
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Static Serving**: Express serves built frontend assets
- **Process**: Single Node.js process serving both API and static files

#### Environment Configuration
- **Database**: DATABASE_URL environment variable for PostgreSQL connection
- **AWS**: S3 credentials stored securely in database (not environment)
- **Sessions**: PostgreSQL-backed session storage for scalability

#### Key Architectural Decisions

**Database Choice**: PostgreSQL was chosen over SQLite for better concurrent access, full-text search capabilities, and production scalability. Drizzle ORM provides type-safe database operations with PostgreSQL-specific features.

**Monorepo Structure**: The application uses a monorepo with shared TypeScript schemas between frontend and backend, reducing code duplication and ensuring type consistency across the stack.

**State Management**: TanStack Query handles all server state, eliminating the need for complex client-side state management while providing caching, background updates, and optimistic updates.

**UI Architecture**: Shadcn/ui provides a modern, accessible component system that's customizable and built on proven Radix UI primitives, ensuring accessibility and consistent behavior.

**S3 Integration**: Direct S3 integration supports both AWS S3 and S3-compatible services, allowing the application to work with existing Joplin exports without requiring users to change their backup workflows. Custom endpoint support enables use with MinIO, DigitalOcean Spaces, Backblaze B2, and other providers.

## Recent Changes

### August 2, 2025
- **Environment-Based Configuration**: Updated backend to use S3 environment variables (S3_BUCKET_NAME, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, S3_ENDPOINT) instead of user-editable settings
- **Automatic Sync**: Implemented auto-sync functionality that triggers when notes cache is empty, eliminating need for manual sync
- **Tag Filtering Removal**: Completely removed tag filtering functionality and simplified notes list to single-column layout
- **Root Directory Support**: Updated S3 sync logic to handle notes in bucket root directory instead of subdirectories
- **Duplicate Prevention**: Added intelligent deduplication using both joplinId and title matching to prevent duplicate notes from appearing in the interface
- **Performance Optimization**: Auto-sync now successfully loads 26 unique notes while filtering out 7 duplicates that existed in S3 storage

### July 24, 2025
- **S3 Configuration**: Added prefilled test settings for Backblaze B2 integration
- **Note Parsing**: Fixed markdown parsing errors by resolving TypeScript compatibility issues with marked library
- **Error Handling**: Enhanced markdown parser with comprehensive error handling and logging
- **Note Filtering**: Successfully filtering Joplin note types (type_: 1 for notes, skipping type_: 13 revisions and type_: 4 resources)
- **Real Data Integration**: Confirmed working with authentic Joplin notes exported to S3-compatible storage
- **Title Extraction**: Proper extraction of note titles from Joplin's native format (not YAML front matter)
- **User Interface**: Clean display of notes with proper markdown rendering and title formatting