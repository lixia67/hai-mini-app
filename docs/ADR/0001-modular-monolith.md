# ADR 0001: Production V1 uses a modular monolith

Status: Accepted

## Decision
Use one NestJS API with explicit domain modules for Production V1. Worker processes may be deployed separately for AI, media, notifications and batch migration work.

## Rationale
This minimizes distributed-transaction and operations complexity while preserving domain boundaries that can later be extracted when traffic or team structure justifies it.
