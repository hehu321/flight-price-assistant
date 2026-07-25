# 机票比价助手 (Flight Price Compare Assistant)

基于 Chrome Manifest V3 的机票多平台比价与价格趋势分析浏览器插件。

## 功能特性

- **一键比价**：在插件侧边栏中输入一次行程（出发地、目的地、日期、人数、舱位），一键检索携程、去哪儿、飞猪和同程平台。
- **自动搜索**：自动建立匹配标签页，带入统一行程参数，完成搜索与数据读取。
- **含税总价与价格类型分类**：自动识别公开价、会员价、券后价、起步价，计算可对比的含税总价。
- **可信度评分与跨平台航班匹配**：根据航线、时间、航班号精准组装跨平台价格表，提供可信度分值。
- **深度核价支持**：自动展开卡片读取具体舱位、税费、行李额度和退改签摘要。
- **本地历史与趋势分析**：基于 IndexedDB 零服务器存储历史查询，提供价格分位数、历史高低位判断及 JSON/CSV 导出。

## 权限说明

- `tabs`: 创建和管理各平台查询标签页。
- `scripting`: 在平台页面注入解析脚本。
- `storage`: 保存插件配置与首选项。
- `sidePanel`: 在 Chrome 侧边栏提供统一用户界面。
- `webNavigation`: 监听平台页面跳转与动态加载状态。
- `nativeMessaging`: 仅在用户安装本地 AI Agent 桥接程序后，与本机 MCP 服务安全通信；不开放网页接口。

## 开发与构建

```bash
# 安装依赖
npm install

# 启动模拟站点 (mock-ctrip: 3001, mock-qunar: 3002, mock-fliggy: 3003)
npm run mock:ctrip
npm run mock:qunar
npm run mock:fliggy

# 插件开发服务
npm run dev

# 类型检查与单元测试
npm run typecheck
npm run test

# 项目构建
npm run build
```

## AI Agent 本地接入（macOS）

插件可通过本机 MCP 服务供 Codex、WorkBuddy 等支持 stdio MCP 的 Agent 调用。该能力只在本机运行，不提供网络 HTTP API，也不会传出 Cookie、登录信息或订票 Token。

开发环境只需执行一次：

```bash
npm run agent:setup
```

该命令会构建插件、自动注册 Native Host，并自动写入 Codex MCP 配置；无需复制扩展 ID。首次执行后只需在 `chrome://extensions` 中重新加载一次 `dist` 目录。

其他 MCP 客户端可使用以下 stdio 命令：

```bash
node /绝对路径/air-tickets- price/agent-bridge/mcp-server.mjs
```

首次有 Agent 请求时，插件会显示待授权客户端。用户在设置中允许后，Agent 才能发起查询；未授权时不会打开任何平台页面。需要跳过 Codex 配置写入时，可执行 `npm run agent:setup -- --skip-codex`。

可使用以下命令诊断或卸载 Host：

```bash
npm run bridge:doctor
npm run bridge:uninstall:mac
```
