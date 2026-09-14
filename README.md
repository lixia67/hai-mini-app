# 小海童话 2.0 / PANGZHU Global

Production V1 greenfield project for the 小海童话微信小程序、胖竹门店管理端和小海/胖竹总部管理后台。

## 当前阶段

项目处于 **M0：需求冻结与技术方案**。按照仓库 `AGENTS.md`，在技术方案确认前不直接进入大规模业务编码。

## 产品结构

微信小程序 TabBar 固定为：

```text
首页 | 胖竹全球 | 我的
```

- 首页：小海商城、小海童话故事/动画、小海AI——所享即所想
- 胖竹全球：全球门店、地图找店、图书查询、门店库存、租借、购买、自提、同城配送、加盟推广
- 我的：订单、动画/故事、AI作品、租借、会员、分享与佣金、地址与设置

## 系统交付

```text
微信小程序 ─┐
胖竹门店端 ─┼→ Unified API → MySQL / Redis / Queue / Object Storage
总部后台   ─┘                    └→ AI / WeChat Pay / Map / Delivery adapters
```

Production V1 优先采用模块化单体，AI Worker、媒体处理和批任务可独立部署。消费者身份与 Staff 身份分离；内部权限采用 RBAC + Data Scope。

## 文档

开发前按顺序阅读：

1. `AGENTS.md`
2. `docs/PRD_V3.2.md`
3. `docs/SYSTEM_ARCHITECTURE.md`
4. `docs/DATABASE_DESIGN.md`
5. `docs/DEVELOPMENT_TASKS.md`
6. `docs/IMPLEMENTATION_PLAN.md`

## 核心原则

- 正式商业上线，不做 Demo。
- 美萍只迁移图书主数据 + 当前库存；迁移后新系统为唯一数据源。
- 库存变化必须有流水，并处理事务、并发与幂等。
- 微信支付只在服务端创建/验签/回调/退款/对账。
- 佣金规则配置化；约 6% 只是待业务确认值，禁止硬编码。
- AI Provider 通过 Adapter 接入，Key 只在服务端；长任务队列化并记录用量/成本/审核状态。
- 图片、视频和 AI 资产走对象存储 + CDN。
- Production 发布必须人工确认。

## 下一步

先评审 `docs/IMPLEMENTATION_PLAN.md` 中的技术栈与 12 项 M0 待确认事项。M0 Gate 通过后进入 M1，初始化 monorepo、三端、API、Worker、数据库迁移、Redis/Queue、CI 和 staging 环境。
