# 小海童话 2.0 — IMPLEMENTATION PLAN

状态：M0 技术方案草案，待确认后进入 M1 基础工程。

## 1. 推荐技术栈

- Monorepo：pnpm workspace + Turborepo
- 微信小程序：原生微信小程序 + TypeScript（Production V1 优先稳定、体积和微信能力兼容）
- 胖竹门店端：React + TypeScript + Vite
- 总部后台：React + TypeScript + Vite
- Backend：Node.js LTS + TypeScript + NestJS，模块化单体
- ORM / migrations：Prisma；所有 schema 变更必须 migration
- 数据库：MySQL 8
- Cache / idempotency / rate limit：Redis
- Queue：BullMQ + Redis；AI/媒体 Worker 独立进程
- Object Storage / CDN：通过 Storage Adapter 接入云厂商
- API：REST `/api/v1` + OpenAPI
- Tests：Vitest/Jest + Supertest + Playwright；小程序关键流程补真机验收
- Observability：结构化日志 + request_id + error tracking + metrics/alerts

## 2. Monorepo 结构

```text
apps/
  miniapp/          # 微信小程序
  store-web/        # 胖竹门店端
  admin-web/        # 总部后台
  api/              # NestJS API
  worker/           # AI/媒体/通知/批任务
packages/
  domain/           # 共享领域类型/规则（不放框架耦合代码）
  api-contracts/    # DTO/schema/API contracts
  ui/               # Web 共享 UI
  config/           # lint/ts/build config
  observability/    # logging/tracing helpers
  adapters/         # provider interfaces/shared adapters
prisma/
  schema.prisma
  migrations/
docs/
  ADR/
  PRD_V3.2.md
  SYSTEM_ARCHITECTURE.md
  DATABASE_DESIGN.md
  DEVELOPMENT_TASKS.md
  IMPLEMENTATION_PLAN.md
tools/
  meiping-migration/
  scripts/
```

## 3. 后端模块边界

IAM、CMS、Catalog、Commerce/Cart、Orders、Payments、Animation/Media、AI Orchestration、Works、Stores、Inventory、Procurement、Rental、Delivery、Franchise、Referral/Commission、Finance、Notification、Moderation、Audit。

模块之间优先通过应用服务和明确接口协作，禁止跨模块任意直接修改核心表。支付、库存、佣金、财务必须保留不可无痕修改的流水/事件记录。

## 4. 三端与身份

消费者仅走微信身份；Staff 使用独立账号。API 强制 RBAC + Data Scope。权限判断由服务端根据 staff identity、role、permission、scope 计算，不信任客户端传入的 store_id。

初始角色：店员、店长、区域经理（预留）、总部运营、总部财务、内容审核员、总部管理员、超级管理员。

## 5. 数据库与事务策略

MySQL 为业务事实源。金额使用 DECIMAL/最小货币单位，禁止 float。订单、支付、退款、租借、AI Job、提现采用显式状态机。

库存使用 `store_inventory` 当前量 + `inventory_transactions` 流水 + `inventory_reservations` 锁定记录。扣减采用数据库事务、条件更新/版本控制和幂等键，禁止仅依赖 Redis 保证库存正确性。

## 6. 美萍迁移

流程：原始导出留档 → staging → normalize/validate → ISBN/条码去重 → dry-run → 人工异常处理 → 正式导入 → INITIAL_MIGRATION 流水 → 门店库存对账。

仅迁图书主数据和当前库存。工具必须按 batch + checksum 幂等，支持安全重跑，并输出 imported/rejected/duplicate/invalid/negative-stock 等报告。

在拿到真实美萍导出样本前，不冻结字段映射。

## 7. 外部服务 Adapter

必须通过接口层隔离：WeChat Login、WeChat Pay、Map/Geocoding、AI text/image/video、Content Moderation、Storage/CDN、SMS、Local Delivery。

Provider 凭据只进入服务端 Secret Manager/环境注入，不进入仓库、小程序或 Web bundle。

## 8. 环境与部署

至少 dev / staging / production 三套隔离环境。数据库、Redis、对象存储、支付配置、域名和 secrets 隔离。

CI：lint → typecheck → unit → integration → build → security/dependency checks。staging 可自动部署；production 必须人工批准。

数据库发布采用向前兼容 migration，生产 migration 先备份并保留恢复方案。高风险变更使用 expand/contract。

## 9. 安全基线

HTTPS、密码强哈希、登录限流、Token/Session 失效、Staff 禁用即时生效、高权限 MFA 预留、最小权限、输入验证、上传类型/大小限制、PII 日志脱敏、审计日志、依赖扫描、Secret 扫描。

儿童与 AI 内容：监护/隐私规则、用户上传审核、生成内容审核、公开发布审核、必要的 AI 标识和版权确认均在正式上线前完成产品与合规验收。

## 10. 测试策略

- Unit：领域规则、金额、状态机、佣金、库存计算
- Integration：DB/Redis/Queue、事务、幂等
- API：Auth、validation、error contract
- Permission：角色 + 数据范围越权矩阵
- Payment：签名、重复 callback、退款、异常恢复
- Inventory：并发锁定/释放/扣减、重复请求
- Migration：dirty data、重复 ISBN/条码、重跑、对账
- E2E：购买、支付、动画权益、AI Job、找书、租借、自提/配送
- Release：微信真机、弱网、性能、备份恢复、smoke test

## 11. 分阶段交付

严格按 `DEVELOPMENT_TASKS.md` 的 M0–M27 推进。当前只完成 M0；M0 Gate 通过后才初始化主要框架。

M1–M3 先建立工程、身份权限和迁移能力；M4–M7 建立首页/商城/支付/内容商业闭环；M8–M11 建 AI；M12–M19 建胖竹全球及门店业务；M20–M23 完善总部、财务、安全与可靠性；M24–M27 完成微信体验、切换、审核和发布。

## 12. M0 需要业务方确认

1. 微信小程序主体、AppID、商户号、支付主体及生产域名归属。
2. 首发国家/地区、云厂商与部署区域。
3. 美萍实际版本及“图书 + 当前库存”导出样本。
4. 当前胖竹门店清单、门店编码及库存归属。
5. AI 文本/图片/视频首选 Provider、动画长度/清晰度/声音规格、单次成本上限。
6. 动画收费：单片、会员或并存。
7. AI 故事/绘本/动画收费方式。
8. 佣金：层级、6%基数、参与商品、优惠/运费、确认期、退款回退、提现门槛和合规。
9. 租借：押金、租金、借期、续借、逾期、损坏/遗失规则。
10. 同城配送：首发区域、计费、配送商/自配送、服务半径。
11. 儿童账户/监护、作品公开发布与审核规则。
12. Production V1 预算、目标上线日期和运营准备窗口。

## 13. M0 Gate

进入 M1 前至少确认：技术栈无重大异议；微信主体/账号路径明确；云和区域明确；美萍样本可获得；支付/AI/地图方案有负责人；佣金、租借、配送允许先以“配置 + feature flag”方式开发未冻结部分。

## 14. M1 第一批实施任务（Gate 后）

初始化 pnpm/Turborepo；创建 miniapp/store-web/admin-web/api/worker；建立共享 TypeScript/lint/test 配置；接入 MySQL/Prisma migrations、Redis/BullMQ；实现 health/readiness、统一错误、request_id、配置校验；建立 dev/staging CI；提交第一份 ADR（模块化单体）和环境说明。
