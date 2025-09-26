# Story Scope - High-Level Design Document

{panel:title=Document Information|borderStyle=dashed|borderColor=#ccc|titleBGColor=#f7f7f7|bgColor=#ffffce}
**Version:** 2.0  
**Date:** September 27, 2025  
**Document Owner:** Engineering Team  
**Status:** Active Development  
**Last Updated:** {date}
{panel}

---

## 🏗️ System Architecture Overview

### Architecture Principles
{panel:title=Design Principles|borderColor=#36B37E|titleBGColor=#E3FCEF}
🎯 **Scalability:** Horizontal scaling with microservices architecture  
🔒 **Security:** Defense in depth with multiple security layers  
⚡ **Performance:** Sub-200ms API response times  
🔄 **Reliability:** 99.9% uptime with automated failover  
🧩 **Modularity:** Loosely coupled components for maintainability
{panel}

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   React SPA     │   Mobile App    │    Third-party Clients      │
│  (TypeScript)   │   (React Native)│      (API Consumers)        │
└─────────────────┴─────────────────┴─────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Load Balancer │
                    │   (Railway)    │
                    └──────┬──────┘
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION TIER                             │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Web Server    │   API Gateway   │    Background Workers       │
│  (Express.js)   │   (Express.js)  │     (Queue Processing)      │
└─────────────────┴─────────────────┴─────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE TIER                                │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Estimation      │  User Management│    Analytics Service        │
│   Service       │    Service      │      (ML Pipeline)          │
│ (ML Algorithm)  │   (Auth/RBAC)   │                             │
└─────────────────┴─────────────────┴─────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────────┐
│                      DATA TIER                                  │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   PostgreSQL    │   Redis Cache   │      File Storage           │
│   (Primary DB)  │  (Sessions)     │      (S3/Local)             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend Technologies
{panel:title=Client-Side Stack|borderColor=#0052CC|titleBGColor=#DEEBFF}
**Framework:** React 18 with TypeScript  
**Build Tool:** Vite for fast development and optimized builds  
**Styling:** CSS-in-JS with styled-components  
**State Management:** React Context + useReducer  
**Routing:** React Router v6  
**HTTP Client:** Fetch API with custom wrapper  
**UI Components:** Custom component library  
**Testing:** Jest + React Testing Library
{panel}

### Backend Technologies
{panel:title=Server-Side Stack|borderColor=#FF5630|titleBGColor=#FFEBE6}
**Runtime:** Node.js 18+ LTS  
**Framework:** Express.js 4.x  
**Language:** JavaScript (ES2022)  
**Database ORM:** Knex.js for query building  
**Authentication:** JWT with bcrypt  
**Validation:** Custom validation middleware  
**Logging:** Winston with structured logging  
**Testing:** Jest + Supertest for API testing
{panel}

### Infrastructure & DevOps
{panel:title=Infrastructure Stack|borderColor=#36B37E|titleBGColor=#E3FCEF}
**Hosting:** Railway (Production) + Local Docker (Development)  
**Database:** PostgreSQL 14+ (Production) / SQLite (Development)  
**Caching:** Redis for sessions and frequently accessed data  
**File Storage:** Local filesystem (upgradeable to S3)  
**Monitoring:** Built-in health checks + Railway metrics  
**CI/CD:** Git-based deployment with Railway auto-deploy  
**SSL/TLS:** Automatic HTTPS with Railway edge network
{panel}

---

## 🗄️ Database Design

### Entity Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      Users      │    │     Stories     │    │    Comments     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │◄──┤│ user_id (FK)    │◄──┤│ story_id (FK)   │
│ email           │    │ id (PK)         │    │ id (PK)         │
│ password_hash   │    │ summary         │    │ user_id (FK)    │
│ role            │    │ description     │    │ content         │
│ created_at      │    │ labels          │    │ created_at      │
└─────────────────┘    │ complexity_score│    └─────────────────┘
                       │ estimation_type │
                       │ team            │
                       │ module          │
                       │ priority        │
                       │ tags            │
                       │ status          │
                       │ created_at      │
                       │ updated_at      │
                       └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│User Preferences │    │Onboarding       │    │ Feedback Data   │
├─────────────────┤    │   Progress      │    ├─────────────────┤
│ user_id (FK)    │    ├─────────────────┤    │ story_id (FK)   │
│ dark_mode       │    │ user_id (FK)    │    │ actual_effort   │
│ auto_save       │    │ tutorial_completed│  │ estimated_effort│
│ show_tooltips   │    │ completed_steps │    │ feedback_notes  │
│ default_team    │    │ created_at      │    │ created_at      │
│ notification_   │    │ updated_at      │    └─────────────────┘
│   settings      │    └─────────────────┘
│ updated_at      │
└─────────────────┘
```

### Database Schema Details

{expand:title=Core Tables Schema}
```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stories table  
CREATE TABLE stories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    description TEXT,
    labels JSONB DEFAULT '[]',
    complexity_score INTEGER DEFAULT 0,
    estimation_type VARCHAR(20) DEFAULT 'story',
    team VARCHAR(50),
    module VARCHAR(255),
    priority INTEGER DEFAULT 3,
    tags TEXT,
    status VARCHAR(20) DEFAULT 'estimated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
{expand}

{expand:title=Enhancement Tables Schema}
```sql
-- User preferences
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    dark_mode BOOLEAN DEFAULT false,
    auto_save BOOLEAN DEFAULT true,
    show_tooltips BOOLEAN DEFAULT true,
    default_team VARCHAR(50),
    notification_settings JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding progress
CREATE TABLE onboarding_progress (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tutorial_completed BOOLEAN DEFAULT false,
    completed_steps JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback data for ML improvement
CREATE TABLE feedback_data (
    id SERIAL PRIMARY KEY,
    story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
    actual_effort DECIMAL(5,2),
    estimated_effort DECIMAL(5,2),
    feedback_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
{expand}

---

## 🔌 API Design

### RESTful API Endpoints

{panel:title=Authentication Endpoints|borderColor=#FF5630|titleBGColor=#FFEBE6}
```
POST /auth/signup     - User registration
POST /auth/login      - User authentication  
GET  /auth/me         - Current user information
```
{panel}

{panel:title=Story Management Endpoints|borderColor=#0052CC|titleBGColor=#DEEBFF}
```
POST   /estimate        - Create and estimate story
GET    /stories         - List user stories (paginated)
GET    /stories/:id     - Get specific story details
PATCH  /stories/:id     - Update story information
DELETE /stories/:id     - Delete story
```
{panel}

{panel:title=Analytics & Reporting Endpoints|borderColor=#36B37E|titleBGColor=#E3FCEF}
```
GET /stats           - Dashboard statistics
GET /report.csv      - Export data in CSV format
```
{panel}

{panel:title=User Features Endpoints|borderColor=#FF8B00|titleBGColor=#FFF4E6}
```
GET  /user/preferences     - Get user settings
POST /user/preferences     - Update user settings
GET  /user/onboarding      - Get onboarding progress
POST /user/onboarding/step - Update onboarding step
```
{panel}

{panel:title=Collaboration Endpoints|borderColor=#6B778C|titleBGColor=#F4F5F7}
```
GET  /stories/:id/comments - Get story comments
POST /stories/:id/comments - Add story comment
POST /stories/:id/feedback - Record actual effort feedback
```
{panel}

### API Request/Response Examples

{expand:title=Story Estimation Request}
```json
POST /estimate
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "summary": "User login with OAuth integration",
  "description": "Implement OAuth login with Google and GitHub providers",
  "labels": ["authentication", "oauth", "security"],
  "estimation_type": "story",
  "team": "Backend",
  "module": null,
  "priority": 2,
  "tags": "sprint-1, critical-path"
}
```
{expand}

{expand:title=Story Estimation Response}
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 123,
  "summary": "User login with OAuth integration",
  "description": "Implement OAuth login with Google and GitHub providers",
  "labels": ["authentication", "oauth", "security"],
  "complexity_score": 45,
  "story_points": 5,
  "estimated_hours": 19.2,
  "story_type": "login",
  "confidence_level": "high",
  "baseline_reference": {
    "type": "login_story",
    "hours": 8,
    "description": "Simple user login functionality"
  },
  "estimation_type": "story",
  "team": "Backend",
  "priority": 2,
  "status": "estimated",
  "analysis": {
    "token_count": 12,
    "uncertainty_factor": 0,
    "technical_factor": 2,
    "team_factor": 1.1,
    "priority_factor": 1.2,
    "story_type_factor": 2.4
  }
}
```
{expand}

---

## 🤖 ML Estimation Algorithm

### Estimation Engine Architecture

{panel:title=Algorithm Components|borderColor=#36B37E|titleBGColor=#E3FCEF}
**1. Text Analysis:** NLP processing for keyword extraction and sentiment  
**2. Story Classification:** Machine learning model for story type detection  
**3. Complexity Scoring:** Multi-factor algorithm with weighted parameters  
**4. Team Calibration:** Historical data analysis for team-specific adjustments  
**5. Confidence Calculation:** Uncertainty quantification based on input clarity
{panel}

### Estimation Flow Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Story Input   │───▶│  Text Analysis  │───▶│Story Type       │
│  (Summary +     │    │  (NLP Engine)   │    │Classification   │
│   Description)  │    └─────────────────┘    └─────────────────┘
└─────────────────┘                                    │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Final Output   │◄───│ Team & Priority │◄───│  Base Hours     │
│ (Hours + Points │    │   Adjustments   │    │  Calculation    │
│  + Confidence)  │    └─────────────────┘    └─────────────────┘
└─────────────────┘                                    │
                                                       ▼
                           ┌─────────────────┐    ┌─────────────────┐
                           │  Uncertainty    │◄───│   Complexity    │
                           │   Penalties     │    │   Modifiers     │
                           └─────────────────┘    └─────────────────┘
```

### Algorithm Implementation

{expand:title=Core Estimation Logic}
```javascript
// Baseline: Login story = 8 hours (1 story point)
const LOGIN_BASELINE_HOURS = 8;

// Story type detection and base hours assignment
const storyTypes = {
  'login': { baseHours: 8, keywords: ['login', 'auth', 'authentication'] },
  'crud': { baseHours: 12, keywords: ['create', 'read', 'update', 'delete'] },
  'api': { baseHours: 16, keywords: ['api', 'endpoint', 'service'] },
  'ui': { baseHours: 10, keywords: ['ui', 'interface', 'component'] },
  'database': { baseHours: 20, keywords: ['database', 'schema', 'migration'] },
  'security': { baseHours: 24, keywords: ['security', 'encryption'] },
  'integration': { baseHours: 32, keywords: ['integration', 'third-party'] },
  'deployment': { baseHours: 16, keywords: ['deployment', 'deploy', 'ci/cd'] }
};

// Team-specific multipliers
const teamFactors = {
  'Backend': { complexity: 1.2, hourMultiplier: 1.1 },
  'Frontend': { complexity: 1.0, hourMultiplier: 1.0 },
  'QA': { complexity: 0.8, hourMultiplier: 1.3 },
  'DevOps': { complexity: 1.3, hourMultiplier: 1.4 },
  'Design': { complexity: 0.9, hourMultiplier: 1.2 },
  'Product': { complexity: 0.7, hourMultiplier: 0.8 }
};

// Priority impact factors
const priorityFactors = { 1: 1.4, 2: 1.2, 3: 1.0, 4: 0.9, 5: 0.8 };

// Calculate final estimate
function calculateEstimate(story) {
  let baseHours = detectStoryType(story.text);
  let complexity = calculateComplexity(story.text);
  
  // Apply multipliers
  if (story.team) baseHours *= teamFactors[story.team].hourMultiplier;
  baseHours *= priorityFactors[story.priority] || 1.0;
  
  // Apply penalties and boosts
  baseHours *= (1 + getUncertaintyPenalty(story.text));
  baseHours *= (1 + getTechnicalComplexityBoost(story.text));
  
  // Module-level adjustment
  if (story.estimation_type === 'module') baseHours *= 2.5;
  
  return {
    estimated_hours: Math.round(baseHours * 2) / 2, // Round to 0.5
    story_points: mapToFibonacci(complexity),
    confidence_level: calculateConfidence(story.text)
  };
}
```
{expand}

---

## 🔒 Security Architecture

### Security Layers

{panel:title=Defense in Depth Strategy|borderColor=#FF5630|titleBGColor=#FFEBE6}
**1. Network Security:** HTTPS/TLS 1.3, Railway edge protection  
**2. Application Security:** Input validation, SQL injection prevention  
**3. Authentication:** JWT tokens with secure expiration  
**4. Authorization:** Role-based access control (RBAC)  
**5. Data Security:** Encryption at rest and in transit  
**6. Monitoring:** Audit logging and anomaly detection
{panel}

### Authentication & Authorization Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Login    │───▶│  Credential     │───▶│   JWT Token     │
│   Request       │    │  Validation     │    │   Generation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  API Response   │◄───│  Authorization  │◄───│  Token Storage  │
│  with Token     │    │     Check       │    │   (Frontend)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Subsequent     │
                       │  API Requests   │
                       │ (Bearer Token)  │
                       └─────────────────┘
```

### Data Protection Measures

{warning:title=Security Controls}
**Input Validation:** All user inputs sanitized and validated  
**SQL Injection Prevention:** Parameterized queries with Knex.js  
**XSS Protection:** Content Security Policy (CSP) headers  
**CSRF Protection:** SameSite cookies and CSRF tokens  
**Rate Limiting:** API throttling to prevent abuse  
**Audit Logging:** Complete user action tracking
{warning}

---

## ⚡ Performance & Scalability

### Performance Requirements

{panel:title=Performance Targets|borderColor=#36B37E|titleBGColor=#E3FCEF}
**API Response Time:** <200ms for 95th percentile  
**Page Load Time:** <2 seconds for initial load  
**Database Query Time:** <100ms for complex queries  
**Concurrent Users:** Support 1,000 simultaneous users  
**Throughput:** 10,000 story estimations per hour
{panel}

### Scalability Strategy

{expand:title=Horizontal Scaling Plan}
**Application Tier:**
- Stateless Express.js servers for easy horizontal scaling
- Load balancing with Railway's built-in load balancer
- Auto-scaling based on CPU and memory metrics

**Database Tier:**
- PostgreSQL with read replicas for query distribution
- Connection pooling to optimize database connections
- Query optimization and indexing strategy

**Caching Strategy:**
- Redis for session storage and frequently accessed data
- Application-level caching for estimation results
- CDN integration for static asset delivery
{expand}

### Monitoring & Observability

{info:title=Monitoring Stack}
**Health Checks:** `/health` endpoint with database connectivity test  
**Error Tracking:** Structured logging with Winston  
**Performance Metrics:** Response time and throughput monitoring  
**Uptime Monitoring:** Railway's built-in monitoring and alerts  
**Custom Metrics:** Business KPIs and user engagement tracking
{info}

---

## 🚀 Deployment Architecture

### Environment Strategy

{panel:title=Environment Configuration|borderColor=#0052CC|titleBGColor=#DEEBFF}
**Development:** Local Docker containers with hot reload  
**Staging:** Railway staging environment for testing  
**Production:** Railway production with auto-scaling  
**Testing:** Isolated environment for automated testing
{panel}

### CI/CD Pipeline

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Git Commit    │───▶│  Automated      │───▶│   Build &       │
│   to Main       │    │  Testing        │    │   Package       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Production    │◄───│  Staging        │◄───│  Deploy to      │
│   Deployment    │    │  Validation     │    │   Staging       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Infrastructure as Code

{expand:title=Deployment Configuration}
```yaml
# railway.toml
[build]
  builder = "NIXPACKS"
  buildCommand = "npm run build"

[deploy]
  startCommand = "npm start"
  healthcheckPath = "/health"
  healthcheckTimeout = 300
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 10

[env]
  NODE_ENV = "production"
  PORT = "8000"
  JWT_SECRET = { $generate = "JWT_SECRET" }
  DATABASE_URL = { $generate = "DATABASE_URL" }
```
{expand}

---

## 🔧 Development Guidelines

### Code Standards

{panel:title=Development Best Practices|borderColor=#36B37E|titleBGColor=#E3FCEF}
**Code Style:** ESLint + Prettier for consistent formatting  
**Testing:** Jest for unit tests, Supertest for API tests  
**Documentation:** JSDoc comments for all public functions  
**Version Control:** Git with conventional commit messages  
**Code Review:** Pull request reviews required for main branch
{panel}

### Project Structure

{expand:title=Directory Organization}
```
story-scope/
├── apps/
│   ├── api/                 # Backend Express.js application
│   │   ├── server.cjs       # Main server file
│   │   ├── db.cjs          # Database configuration
│   │   ├── mock-nlp.js     # ML estimation service
│   │   └── package.json    # Backend dependencies
│   └── web/                # Frontend React application
│       ├── src/
│       │   ├── components/ # Reusable UI components
│       │   ├── routes/     # Page components
│       │   ├── lib/        # Utility functions
│       │   └── App.tsx     # Main application component
│       ├── public/         # Static assets
│       └── package.json    # Frontend dependencies
├── docs/                   # Documentation
├── tests/                  # Test files
├── package.json           # Root package configuration
└── README.md              # Project documentation
```
{expand}

### Testing Strategy

{panel:title=Testing Pyramid|borderColor=#FF8B00|titleBGColor=#FFF4E6}
**Unit Tests:** Individual function and component testing  
**Integration Tests:** API endpoint and database interaction testing  
**E2E Tests:** Complete user journey automation  
**Performance Tests:** Load testing and benchmarking  
**Security Tests:** Vulnerability scanning and penetration testing
{panel}

---

## 📋 Operational Procedures

### Maintenance Tasks

{panel:title=Regular Maintenance|borderColor=#6B778C|titleBGColor=#F4F5F7}
**Daily:** Monitor system health and error logs  
**Weekly:** Database backup verification and cleanup  
**Monthly:** Security updates and dependency patches  
**Quarterly:** Performance review and optimization  
**Annually:** Security audit and compliance review
{panel}

### Incident Response

{warning:title=Incident Management Process}
**1. Detection:** Automated monitoring alerts and user reports  
**2. Assessment:** Severity classification and impact analysis  
**3. Response:** Immediate mitigation and stakeholder communication  
**4. Resolution:** Root cause analysis and permanent fix  
**5. Post-mortem:** Documentation and process improvement
{warning}

### Backup & Recovery

{info:title=Data Protection Strategy}
**Backup Frequency:** Daily automated database backups  
**Retention Policy:** 30-day backup retention with weekly archives  
**Recovery Testing:** Monthly backup restore validation  
**Disaster Recovery:** 4-hour RTO (Recovery Time Objective)  
**Data Integrity:** Checksums and validation for all backups
{info}

---

{panel:title=Document Approval|borderStyle=dashed|borderColor=#ccc|titleBGColor=#f7f7f7|bgColor=#ffffce}
**System Architect:** [Signature Required]  
**Engineering Lead:** [Signature Required]  
**DevOps Engineer:** [Signature Required]  
**Security Officer:** [Signature Required]  
**QA Lead:** [Signature Required]

**Last Updated:** September 27, 2025  
**Next Review Date:** December 27, 2025  
**Version Control:** Maintained in Git repository
{panel}
