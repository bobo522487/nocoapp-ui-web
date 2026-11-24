# 云谱前端

云谱工作区前端，单包。React 19 + Vite 8 + TypeScript + Tailwind 4 + Zustand + TanStack Router。

包管理用 **Bun**（以 `bun.lock` 为准）。

## 本机对接本地后端

```bash
bun install
# .env.local 中设置：
# VITE_API_PROXY_TARGET=http://127.0.0.1:3001
bun run dev
```

开发服务器是 http://localhost:3000 ，`/api` 代理到 `VITE_API_PROXY_TARGET`。此时代码不注册 mock。后端关掉时页面停在错误态。

## AI Studio 或无代理预览

不设置 `VITE_API_PROXY_TARGET` 时，`features/auth/enableMock.ts` 注册 direct mock，请求不发往网络。预览打开后停在登录页。演示账号是 `demo@yunpu.cn` / `demo123456`。

显式关闭 mock：`VITE_ENABLE_MOCK=0`。有代理时即使设了 `VITE_ENABLE_MOCK=1` 也不会走 mock。

## 检查

```bash
bun test
bun run lint
bun run build
```

## 目录结构

- `app/` — 路由与外壳（工作区壳 / 项目壳）
- `features/auth/` — 登录、注册、邀请、会话与 mock 注册
- `features/dashboard/` — 工作区首页、成员、设置、组织 API
- `features/project/` — 项目页与世系/传记/宗谱模块
- `features/lineage/` — 世系核心（图谱、人物详情、布局）
- `components/` — 布局与通用组件
- `store/` — Zustand store
- `lib/` — API 封装与工具
