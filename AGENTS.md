# AGENTS.md — 小海童话 2.0 Production V1

## 项目定义
这是从零开发（Greenfield）的正式商业上线项目。旧“小海童话”源码不可得，禁止假设可复用旧前端、后端、数据库、支付、佣金或管理后台。美萍只用于一次性迁移“图书主数据 + 当前库存”，迁移后新系统成为唯一数据源。

## 必读顺序
1. `docs/PRD_V3.2.md`
2. `docs/SYSTEM_ARCHITECTURE.md`
3. `docs/DATABASE_DESIGN.md`
4. `docs/DEVELOPMENT_TASKS.md`

## 三端
- 微信小程序：普通用户。TabBar 固定为“首页 / 胖竹全球 / 我的”。首页承载小海商城、小海童话故事/动画、小海AI；分享与佣金放在“我的”。
- 胖竹门店管理端：店员、店长。
- 小海/胖竹总部后台：运营、财务、审核、管理员、超级管理员。
三端共享统一 API、订单、商品、图书、库存、支付、租借、佣金等核心数据。

## 第一次进入仓库
不要立即写业务代码。先检查仓库并输出 `docs/IMPLEMENTATION_PLAN.md`，包含：技术栈、monorepo结构、模块边界、环境与部署、数据库迁移、美萍迁移、RBAC/Data Scope、安全、测试、分阶段交付、外部账号/凭据、未决事项。等待确认后再初始化主要框架和业务开发。

## 架构原则
Production V1 优先“模块化单体 + 清晰领域边界”，AI Worker/媒体处理/定时任务可独立进程。领域至少包含 IAM、CMS、Catalog、Commerce、Orders、Payments、Media、AI、Works、Stores、Inventory、Procurement、Rental、Delivery、Franchise、Referral/Commission、Finance、Notification、Moderation、Audit。

## 权限
消费者账号与 Staff 账号逻辑分离。必须 RBAC + Data Scope：店员仅所属门店、店长仅负责门店、区域经理仅区域、总部按岗位、超级管理员全局。服务端强制校验，禁止仅靠前端隐藏菜单；不得信任客户端传入的 store_id 来决定授权。

## 库存
库存属于敏感核心数据。所有变化必须产生库存流水；关键操作使用事务、幂等和并发控制；禁止无流水直接改库存；订单必须有锁定/释放/扣减规则；美萍迁移生成 INITIAL_MIGRATION 流水。

## 支付与佣金
微信支付只能服务端创建和处理回调，必须验签、幂等、流水、退款、对账、审计。生产密钥不得进入客户端或仓库。

6%只是待确认业务规则，必须配置化，禁止硬编码。实现前确认推荐层级、计算基数、生效时间、退款回退、提现和合规。佣金必须有事件、冻结/可结算/回退、账本、提现与审计。

## AI
API Key 只在服务端。使用 Provider Adapter，避免绑定单一厂商。长任务必须队列化，支持 queued/running/succeeded/failed/cancelled、retry、timeout、usage/cost、moderation、logs。故事、绘本、动画为三个独立工作流，共享 AI orchestration。

## 媒体与安全
图片、视频、AI资产走对象存储 + CDN。上传必须限制类型/大小、鉴权和审核。必须考虑儿童隐私、监护、AI内容安全、公开作品审核、版权、日志脱敏、最小权限。

## 美萍迁移
只迁图书和当前库存。不迁会员、历史订单、财务、历史借阅、供应商、佣金。迁移工具必须支持原始文件归档、dry-run、字段映射、ISBN/条码规范化、去重、异常报告、批次记录、对账和可安全重跑。

## Done 标准
每个模块必须同时具备：UI + API + DB + Admin/Store UI（适用时）+ Auth/RBAC + Validation + Error Handling + Logs + Automated Tests + Docs。

## 测试
至少包含 unit、integration、API、permission、payment callback、inventory concurrency、migration 和关键 E2E。上线前完成真机、弱网、性能、越权、支付退款、备份恢复测试。

## Git/修改纪律
一个任务一个清晰变更集；不执行破坏性命令；不删除未知文件；不覆盖用户修改；不提交 secrets；schema 变更必须 migration；重要架构决定写 ADR；生产发布必须人工确认。

## 每阶段报告
输出 Completed / Files Changed / Database Changes / Tests / Security & Permissions / Known Issues / Decisions Needed / Next Step。
