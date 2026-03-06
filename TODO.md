# AI Judicial Assistant Platform - Project Skeleton TODO

## Overview
This is a greenfield project requiring the complete scaffolding of:
- Modular FastAPI backend
- Vite+TypeScript React SPA  
- Docker Compose stack with 8+ services

## Step 1 — Repository Layout
- [x] Create top-level monorepo structure
- [x] Move existing architecture markdown to docs/
- [x] Create backend/ directory
- [x] Create frontend/ directory
- [x] Create docker/ subdirectories for inference services

## Step 2 — Docker Compose & Service Definitions
- [x] Create docker-compose.yml with all services
- [x] Create .env.example with all required environment variables
- [x] Define each service: postgres, qdrant, neo4j, minio, bge_m3, bge_reranker, jais, fallback_model, backend, frontend

## Step 3 — Backend: Python Project Scaffolding
- [x] Create backend/Dockerfile
- [x] Create pyproject.toml with dependencies
- [x] Create alembic.ini
- [x] Create alembic/versions/ directory
- [x] Create app/main.py - FastAPI app factory
- [x] Create app/config.py - Settings via pydantic-settings
- [x] Create app/database.py - SQLAlchemy async engine
- [x] Create app/auth/ directory with jwt.py, middleware.py, rbac.py
- [x] Create app/modules/ directory structure for all modules

## Step 4 — Alembic Migrations (Phase 0 Schema)
- [x] Configure alembic.ini to point at PostgreSQL
- [x] Create initial migration 0001_initial_schema.py
- [x] Create all 7 tables: users, cases, documents, extracted_entities, judgments, judge_feedback, audit_logs

## Step 5 — Auth Routes & JWT Implementation
- [x] Implement jwt.py with token creation/verification
- [x] Implement rbac.py with require_role dependency
- [x] Implement middleware.py for JWT extraction
- [x] Create auth routes: /auth/login, /auth/refresh

## Step 6 — Module Routes (Stubs)
- [x] case routes: GET/POST /cases, GET/PATCH /cases/{id}, assign, analyze, analysis, draft, judgment, feedback
- [x] document routes: POST /cases/{id}/documents, PATCH /documents/{id}/metadata
- [x] user (admin) routes: GET/POST/DELETE /admin/users
- [x] evaluation routes: GET /admin/metrics
- [x] audit routes: GET /admin/audit-logs
- [x] Add GET /health endpoint

## Step 7 — Store Initialization Scripts
- [x] Create backend/app/startup.py
- [x] Qdrant: create legal_chunks and case_summaries collections
- [x] Neo4j: create constraints and indexes
- [x] MinIO: create buckets

## Step 8 — Inference Service Containers
- [x] docker/bge_m3/ - FastAPI wrapper for BGE-M3
- [x] docker/bge_reranker/ - FastAPI wrapper for reranking
- [x] docker/jais/ - OpenAI-compatible /v1/chat/completions
- [x] docker/fallback_model/ - Identical API contract

## Step 9 — Frontend: Vite + TypeScript React SPA
- [x] Create frontend/Dockerfile
- [x] Create nginx.conf
- [x] Create vite.config.ts, tsconfig.json, package.json
- [x] Create src/main.tsx and App.tsx
- [x] Setup i18n with Arabic/English support
- [x] Create auth/ context, hooks, PrivateRoute
- [x] Create api/client.ts with axios
- [x] Create pages: Login, judge/, clerk/, admin/
- [x] Create router/index.tsx

## Step 10 — Frontend Dockerfile (Nginx Static Serve)
- [x] Implement multi-stage build with Node and Nginx
- [x] Configure nginx.conf for SPA routing

