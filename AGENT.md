# AGENT.md — 机票比价助手 (Flight Price Compare Assistant)

## 项目概述

基于 Chrome Manifest V3 的浏览器扩展插件，用于一键对比携程、去哪儿、飞猪三大平台的国内机票价格，并提供历史价格趋势分析。

- **UI 入口**: Chrome Side Panel（侧边栏），无 Popup
- **目标用户**: 国内机票购买者
- **支持范围**: 国内航线、成人 + 儿童乘客、单程 / 往返

---

## 技术栈

| 层级          | 技术选型                                          |
|--------------|--------------------------------------------------|
| 扩展规范      | Chrome Manifest V3                               |
| 构建工具      | Vite 5 + `@crxjs/vite-plugin`                    |
| 前端框架      | Vue 3 (Composition API, `<script setup>`)        |
| 语言          | TypeScript (严格模式)                              |
| 状态管理      | Pinia                                            |
| 路由          | Vue Router 4                                     |
| 图表          | Chart.js 4                                       |
| 本地存储      | IndexedDB (via `idb` 库)                          |
| 国际化        | vue-i18n 9 (预留结构, 当前中文)                     |
| 单元测试      | Vitest + jsdom                                   |
| 代码规范      | ESLint + Prettier                                |
| 包管理器      | npm                                              |

---

## 常用命令

```bash
# 安装依赖
npm install

# 开发模式（生成 dist/ 并监听变更，用于 Chrome 加载未打包扩展）
npm run dev

# 生产构建（先 TypeScript 检查再打包）
npm run build

# 仅 TypeScript 类型检查
npm run typecheck

# 运行全部单元测试
npm run test

# 监听模式运行测试
npm run test:watch

# 代码格式化
npm run format

# ESLint 检查
npm run lint

# 启动三个模拟平台（分别在独立终端运行）
npm run mock:ctrip    # 端口 3001 — 模拟携程
npm run mock:qunar    # 端口 3002 — 模拟去哪儿
npm run mock:fliggy   # 端口 3003 — 模拟飞猪
```

---

## 项目结构

```
air-tickets-price/
├── manifest.json              # Chrome MV3 扩展清单
├── sidepanel.html             # Side Panel HTML 入口
├── package.json
├── vite.config.ts             # 主构建配置 (CRXJS + Vue)
├── vitest.config.ts           # 测试配置
├── tsconfig.json              # TypeScript 配置 (路径别名 @/ → src/)
├── tsconfig.node.json         # Node 端 TS 配置
├── eslint.config.js
├── .prettierrc
├── public/                    # 静态资源 (icon.png 等)
├── dist/                      # 构建输出目录 (Chrome 加载此目录)
│
├── src/
│   ├── env.d.ts               # Vue SFC 模块声明
│   │
│   ├── shared/                # 共享层 — 类型定义、常量、工具函数
│   │   ├── types/             # TypeScript 接口与类型
│   │   │   ├── flight.ts      # FlightQuery, FlightResult, SupportedPlatform 等
│   │   │   ├── platform.ts    # PlatformConfig, PlatformTaskState, BlockingState 等
│   │   │   ├── matching.ts    # MatchedFlightGroup, MatchingScore
│   │   │   ├── storage.ts     # PriceRecord, TaskRecord
│   │   │   ├── message.ts     # ExtensionMessage, MessageType, 各 Payload 类型
│   │   │   └── error.ts       # ErrorCode 枚举
│   │   ├── constants/
│   │   │   ├── airports.ts    # ALL_DOMESTIC_AIRPORTS — 全国 240+ 民用机场字典
│   │   │   └── platforms.ts   # 三平台配置 (域名, 入口 URL, 延迟参数)
│   │   ├── errors/            # 自定义错误类
│   │   ├── logger/            # 统一日志工具
│   │   └── utils/             # 通用工具函数
│   │
│   ├── core/                  # 核心业务逻辑 (纯函数，无 DOM/Chrome API 依赖)
│   │   ├── query/             # 行程查询相关
│   │   │   ├── query-validator.ts     # 9 条校验规则
│   │   │   ├── city-normalizer.ts     # 城市名标准化
│   │   │   └── airport-dictionary.ts  # 机场代码查找
│   │   ├── pricing/           # 价格处理
│   │   │   ├── price-parser.ts        # 解析公共/会员/券后/新客/起步价
│   │   │   ├── price-normalizer.ts    # 价格标准化
│   │   │   ├── total-price-calculator.ts  # 含税总价计算
│   │   │   └── price-comparator.ts    # 跨平台价格排序与比较
│   │   ├── matching/          # 航班匹配
│   │   │   ├── flight-matcher.ts      # 跨平台航班匹配 (航班号+时间)
│   │   │   ├── codeshare-matcher.ts   # 共享航班号匹配
│   │   │   └── matching-score.ts      # 匹配置信度评分
│   │   ├── confidence/        # 结果可信度
│   │   │   ├── confidence-calculator.ts  # 100 分制综合评分
│   │   │   └── confidence-rules.ts    # 评分规则定义
│   │   ├── analytics/         # 历史分析
│   │   │   ├── price-statistics.ts    # 均值/中位数/标准差/极值
│   │   │   ├── price-percentile.ts    # 百分位排名
│   │   │   └── purchase-advice.ts     # 购买建议生成
│   │   ├── storage/           # 数据持久化
│   │   │   ├── indexed-db.ts          # IndexedDB 初始化 (idb 封装)
│   │   │   ├── price-record-repository.ts  # 价格记录 CRUD
│   │   │   └── task-repository.ts     # 任务记录 CRUD
│   │   └── task/              # 任务状态机
│   │       ├── task-state-machine.ts   # 18 种状态转换规则
│   │       └── platform-task.ts       # 平台任务实例
│   │
│   ├── adapters/              # 平台适配器 (Content Script 环境运行)
│   │   ├── index.ts           # 注册表入口 — 注册三个适配器到 adapterRegistry
│   │   ├── base/              # 适配器基础设施
│   │   │   ├── platform-adapter.ts    # PlatformAdapter 接口定义 ★
│   │   │   ├── adapter-registry.ts    # 适配器注册与查找
│   │   │   ├── selector-resolver.ts   # queryFirstAvailable — 多选择器容错
│   │   │   ├── dom-utils.ts           # DOM 查询辅助
│   │   │   ├── input-utils.ts         # setNativeInputValue — 兼容 React/Vue 受控组件
│   │   │   ├── date-utils.ts          # 日期格式化
│   │   │   ├── page-stability.ts      # waitForResultsStable — 等待结果列表稳定
│   │   │   └── blocking-detector.ts   # 验证码/登录墙/频率限制检测
│   │   ├── ctrip/             # 携程适配器
│   │   │   ├── ctrip-adapter.ts       # URL 直达 + 表单填写 + 卡片提取 + 深度核价
│   │   │   └── ctrip-selectors.ts     # CSS 选择器池 (待调优)
│   │   ├── qunar/             # 去哪儿适配器
│   │   │   ├── qunar-adapter.ts       # 表单填写 + 分批加载提取
│   │   │   └── qunar-selectors.ts     # CSS 选择器池 (待调优)
│   │   └── fliggy/            # 飞猪适配器
│   │       ├── fliggy-adapter.ts      # 城市下拉候选 + 会员价提取
│   │       └── fliggy-selectors.ts    # CSS 选择器池 (待调优)
│   │
│   ├── background/            # Background Service Worker
│   │   ├── index.ts           # SW 入口 — 初始化各模块
│   │   ├── task-manager.ts    # 比价任务生命周期管理
│   │   ├── tab-manager.ts     # 标签页创建与管理 (交错延迟打开)
│   │   ├── message-router.ts  # 消息路由分发
│   │   └── navigation-listener.ts  # 页面导航状态监听
│   │
│   ├── content/               # Content Script
│   │   ├── index.ts           # CS 入口 — DOMContentLoaded 后执行
│   │   ├── adapter-runner.ts  # 根据当前 URL 选择并运行适配器
│   │   └── page-bridge.ts    # 与 Background SW 的消息桥接
│   │
│   ├── sidepanel/             # Vue 3 Side Panel 应用
│   │   ├── main.ts            # 应用入口 (Pinia, Router, i18n)
│   │   ├── App.vue            # 根组件
│   │   ├── views/             # 页面视图
│   │   │   ├── QueryView.vue      # 首页 — 行程输入与一键比价
│   │   │   ├── ResultsView.vue    # 比价结果展示
│   │   │   ├── HistoryView.vue    # 历史价格趋势
│   │   │   └── SettingsView.vue   # 设置页
│   │   ├── components/        # UI 组件
│   │   │   ├── CityInput.vue          # 城市选择输入 (带机场字典搜索)
│   │   │   ├── FlightGroupCard.vue    # 匹配航班组卡片
│   │   │   ├── PlatformStatus.vue     # 平台提取状态指示器
│   │   │   ├── PriceTag.vue           # 价格标签 (多种价格类型)
│   │   │   ├── ConfidenceBadge.vue    # 可信度徽章
│   │   │   ├── PriceTrendChart.vue    # Chart.js 历史走势图
│   │   │   └── BottomNav.vue          # 底部导航栏
│   │   ├── stores/            # Pinia 状态管理
│   │   │   ├── query.ts       # 行程查询状态
│   │   │   ├── task.ts        # 比价任务状态
│   │   │   ├── results.ts     # 比价结果状态
│   │   │   ├── history.ts     # 历史记录状态
│   │   │   └── settings.ts    # 用户设置状态
│   │   └── styles/            # 全局样式
│   │
│   └── tests/
│       └── unit/              # 单元测试
│           ├── query-validator.test.ts
│           ├── price-parser.test.ts
│           ├── flight-matcher.test.ts
│           ├── confidence-calculator.test.ts
│           └── price-statistics.test.ts
│
└── mock-sites/                # 三个本地模拟平台 (开发/E2E 测试用)
    ├── mock-ctrip/            # 模拟携程 (端口 3001)
    ├── mock-qunar/            # 模拟去哪儿 (端口 3002)
    └── mock-fliggy/           # 模拟飞猪 (端口 3003)
```

---

## 架构设计

### 通信模型: Hub-and-Spoke (中心辐射)

```
┌────────────────┐     chrome.runtime      ┌────────────────────┐
│   Side Panel   │ ◄────── message ───────► │  Background SW     │
│   (Vue 3 App)  │                          │  (Task Manager)    │
└────────────────┘                          └────────┬───────────┘
                                                     │
                                       chrome.tabs.sendMessage
                                       chrome.scripting.executeScript
                                                     │
                              ┌──────────────────────┼──────────────────────┐
                              ▼                      ▼                      ▼
                    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
                    │ Content Script│       │ Content Script│       │ Content Script│
                    │ (Ctrip Tab)  │       │ (Qunar Tab)  │       │ (Fliggy Tab) │
                    │ → Adapter    │       │ → Adapter    │       │ → Adapter    │
                    └──────────────┘       └──────────────┘       └──────────────┘
```

- **Side Panel** → 发送 `START_COMPARISON` → **Background SW**
- **Background SW** → 交错创建 3 个 Tab (0ms / 700ms / 1400ms) → 注入 Content Script
- **Content Script** → 通过 `adapterRegistry` 匹配当前 URL → 运行对应 `PlatformAdapter`
- **Content Script** → 提取结果 → 发送 `ADAPTER_COMPLETED` / `ADAPTER_FAILED` → **Background SW**
- **Background SW** → 汇聚三平台结果 → 匹配航班 → 计算可信度 → 发送 `TASK_STATE_CHANGED` → **Side Panel**

### 消息协议

所有消息遵循统一格式 `ExtensionMessage<T>` (定义在 `src/shared/types/message.ts`):

```typescript
interface ExtensionMessage<T = unknown> {
  type: MessageType;   // "START_COMPARISON" | "ADAPTER_COMPLETED" | ...
  taskId?: string;
  platform?: SupportedPlatform;  // "ctrip" | "qunar" | "fliggy"
  payload?: T;
}
```

### PlatformAdapter 接口

所有平台适配器必须实现 `PlatformAdapter` 接口 (定义在 `src/adapters/base/platform-adapter.ts`):

```typescript
interface PlatformAdapter {
  id: SupportedPlatform;
  name: string;
  matches(url: string): boolean;               // URL 匹配判定
  buildSearchUrl(query: FlightQuery): string | null;  // 构建搜索 URL
  fillSearchForm?(query: FlightQuery): Promise<void>; // 可选: 填充表单
  submitSearch?(): Promise<void>;              // 可选: 提交搜索
  detectBlockingState(): Promise<BlockingState>;       // 检测阻断 (验证码/登录墙)
  waitForResults(): Promise<void>;             // 等待结果加载完成
  validateSearchContext(query: FlightQuery): Promise<SearchContextValidation>;  // 校验上下文
  extractFlights(): Promise<PlatformRawFlightResult[]>;  // 提取航班数据
  verifyPrice?(flight: FlightResult): Promise<FlightResult>;  // 可选: 深度核价
  diagnose(): Promise<AdapterDiagnosticReport>;  // 诊断报告
}
```

### 关键设计决策

| 决策                | 选择                    | 原因                                     |
|--------------------|------------------------|-----------------------------------------|
| UI 入口             | Side Panel (非 Popup)   | 常驻不关闭，可与多标签页并行交互               |
| 受控组件输入         | `setNativeInputValue`  | React/Vue 受控 input 需绕过 setter 触发事件 |
| 结果等待策略         | `waitForResultsStable` | MutationObserver 监测 DOM 稳定，非固定超时   |
| 选择器容错           | `queryFirstAvailable`  | 每个元素定义多个候选 CSS 选择器，按优先级尝试   |
| 跨平台航班匹配       | 航班号 + 起降时间        | 不同平台同航班号即为同一航班                   |
| 价格类型区分         | 6 种价格枚举             | public/member/coupon/new_user/starting/tax |
| 可信度评分           | 100 分制 rules 引擎     | 多维度加权 (上下文匹配/价格一致性/完整度等)     |
| 数据保留             | 30 天自动清理            | IndexedDB 定时清理过期记录                   |
| 并行策略             | 交错打开 + 独立提取       | 避免同时请求触发风控，各平台提取互不阻塞         |

---

## 开发指南

### 路径别名

`@/` 映射到 `src/` 目录，在 `tsconfig.json` 和 `vite.config.ts` 中均已配置:

```typescript
import { FlightQuery } from '@/shared/types/flight';
```

### 添加新的平台适配器

1. 在 `src/adapters/` 下创建新目录 (如 `tongcheng/`)
2. 实现 `PlatformAdapter` 接口
3. 创建对应的 `*-selectors.ts` 选择器文件
4. 在 `src/adapters/index.ts` 中注册
5. 在 `src/shared/constants/platforms.ts` 中添加平台配置
6. 在 `src/shared/types/flight.ts` 的 `SupportedPlatform` 联合类型中添加新值
7. 在 `manifest.json` 的 `host_permissions` 和 `content_scripts.matches` 中添加域名

### 修改选择器

每个平台的 CSS 选择器集中定义在 `src/adapters/<platform>/<platform>-selectors.ts` 中。选择器使用 `queryFirstAvailable()` 进行多候选容错查找。当真实平台 DOM 结构变更时，只需更新选择器文件。

### 编写测试

- 测试文件放在 `src/tests/unit/` 目录
- 文件命名: `<模块名>.test.ts`
- 使用 `vitest` API (`describe`, `it`, `expect`)
- 核心业务逻辑 (`src/core/`) 为纯函数，可直接测试，无需 mock Chrome API

### Vue 组件规范

- 使用 `<script setup lang="ts">` 语法
- 使用 Pinia store 管理状态
- 样式使用 `<style scoped>` 或全局样式文件
- 侧边栏固定宽度设计，深色主题为默认，支持浅色主题切换

---

## 本地调试流程

```bash
# 1. 安装依赖
npm install

# 2. 启动三个模拟平台 (分别在 3 个终端)
npm run mock:ctrip    # → http://localhost:3001
npm run mock:qunar    # → http://localhost:3002
npm run mock:fliggy   # → http://localhost:3003

# 3. 构建扩展
npm run build         # 输出到 dist/

# 4. Chrome 加载扩展
#    打开 chrome://extensions/ → 开启"开发者模式" → "加载已解压的扩展程序" → 选择 dist/ 目录

# 5. 使用扩展
#    点击扩展图标 → 打开侧边栏 → 输入行程信息 → 点击"一键比价"
```

---

## 当前状态与待办

### ✅ 已完成

- Chrome MV3 完整项目骨架与构建管线
- 核心业务逻辑全模块 (校验/价格/匹配/可信度/分析/存储)
- 三平台适配器完整实现
- Background SW 任务调度与 Content Script 通信
- Vue 3 侧边栏 4 个视图 + 7 个组件 + 5 个 Store
- 三个本地模拟平台 (mock-ctrip/qunar/fliggy)
- 5 个单元测试文件，11 个用例全部通过
- TypeScript 严格模式 0 错误
- 生产构建 0 错误

### 🔲 待优化 (需真实平台 DOM 样本)

- `src/adapters/ctrip/ctrip-selectors.ts` — 携程真实页面选择器调优
- `src/adapters/qunar/qunar-selectors.ts` — 去哪儿真实页面选择器调优
- `src/adapters/fliggy/fliggy-selectors.ts` — 飞猪真实页面选择器调优
- 跨平台真实对比效果验证
- 历史价格分析与导出功能扩展
