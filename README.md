# 小海童话 2.0 / PANGZHU Global

Production V1 greenfield project for 小程序, store web, admin web.

## Current stage

M2 IAM/RBAC is in progress. M1 foundation has been merged to `main`.

## Product navigation

微信小程序 TabBar is fixed to:

`首页 | 胖竹全球 | 我的`

首页包含小海商城、小海童话故事/动画、小海AI——所享即所想。分享与佣金位于“我的”内，不作为一级 Tab。

## Architecture

微信小程序 / 门店端 / 总部后台 → Unified API → MySQL / Redis / Queue / Object Storage → AI / WeChat Pay / Map / Delivery adapters.

## Core principles

- MySQL is the source of truth.
- Consumer and staff identities are separated.
- RBAC + Data Scope are enforced server-side.
- Inventory mutations must be transactional and auditable.
- Production release requires manual confirmation.
- Secrets must never be committed.

## Current M2 work

- consumer/staff account separation
- staff roles and permissions
- GLOBAL / ASSIGNED_STORES / SELF data scopes
- hashed refresh-session storage
- password hashing and JWT access tokens
- staff login / refresh rotation / logout persistence
- NestJS authorization guard and decorators
- WeChat login adapter contract

## Docs

Read in this order:

1. `AGENTS.md`
2. `docs/PRD_V3.2.md`
3. `docs/SYSTEM_ARCHITECTURE.md`
4. `docs/DATABASE_DESIGN.md`
5. `docs/DEVELOPMENT_TASKS.md`
6. `docs/IMPLEMENTATION_PLAN.md`
