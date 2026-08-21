# WowManager 技术栈与工程架构（已确认）

## 1. 结论

采用 **TypeScript + Vite + React + Phaser 3 + Zustand + IndexedDB**，部署到 GitHub Pages。

这是一款面向静态托管的单机网页游戏：游戏代码、配置和资产随前端一起发布；进度保存在玩家浏览器。GitHub Pages 不能提供自定义后端、账号鉴权或安全的服务端存档，因此这些能力不进入首发范围。

| 层 | 选择 | 作用 | 选择原因 |
| --- | --- | --- | --- |
| 语言 | TypeScript（严格模式） | 游戏规则、UI、配置 | 复杂数据模型与规则可获得静态校验 |
| 构建 | Vite | 本地开发与静态产物构建 | 构建快，直接适配 GitHub Pages 的 `dist` 产物 |
| UI | React | 面板、菜单、背包、角色详情、模态框 | 表单与数据密集界面开发效率高 |
| 游戏渲染 | Phaser 3 | 格子要塞、精灵、移动、动画、战斗场景 | 原生面向 WebGL/Canvas 的 2D 游戏循环，适合像素风 |
| UI 状态 | Zustand | UI 选择状态、游戏状态观察 | 轻量，避免为游戏状态引入复杂样板 |
| 存档 | IndexedDB（建议 `idb` 封装） | 本地游戏存档、版本迁移 | 容量和异步能力优于 `localStorage` |
| 数据校验 | Zod | 配置和存档版本校验 | 防止损坏或旧版本存档破坏运行 |
| 测试 | Vitest + Testing Library | 公式、状态机、配置和 UI 单测 | 与 Vite/TypeScript 配合自然 |
| 端到端测试 | Playwright（第二阶段） | 主流程回归 | 覆盖建造、存档、Boss 战等浏览器流程 |
| 代码质量 | ESLint + Prettier | 统一规范 | 降低后续迭代冲突 |
| 发布 | GitHub Actions + GitHub Pages | 从 `main` 自动发布 | 无服务器、免费且和目标仓库一致 |

暂不引入后端、数据库服务、Redux、物理引擎、ECS 框架或大型 UI 库。它们会增加初版复杂度，但对当前自动工作和小队战斗的核心循环没有必要。

## 2. 为什么采用 React + Phaser

Phaser 管理实时画布：地图格子、精灵层级、寻路表现、角色移动、特效和战斗动画。React 管理 DOM 界面：资源栏、建造菜单、检查器、详情页和可访问的按钮。

两者**不互相管理对方的 DOM**。React 只创建一个 Phaser 容器并订阅游戏快照；Phaser 通过受限接口读取状态、发出用户交互事件。核心规则不写在 Phaser Scene 或 React 组件里，而放在纯 TypeScript 模拟层，因此可不启动浏览器就测试数值和自动行为。

```text
React DOM（界面、菜单）  ─┐
                          ├─ GameStore / Selector ─ Core simulation（纯 TS）
Phaser（地图、角色、特效） ─┘              │
                                           ├─ balance / content data
                                           └─ IndexedDB save adapter
```

## 3. 推荐目录

```text
.
├── .github/workflows/deploy-pages.yml
├── public/
│   └── assets/                 # 静态素材，按 sprites/ui/audio/maps 分目录
├── src/
│   ├── app/                    # React App、路由和全局样式
│   ├── components/             # React UI 组件
│   ├── game/
│   │   ├── core/               # 无 Phaser/React 依赖的规则引擎
│   │   │   ├── actions/        # 命令：建造、派遣、装备等
│   │   │   ├── formulas/       # 经验、掉落、伤害公式
│   │   │   ├── simulation/     # tick、角色状态机、战斗模拟
│   │   │   └── types.ts
│   │   ├── content/            # 建筑、角色、地区、技能、掉落表配置
│   │   ├── phaser/             # Scene、Sprite、动画和表现事件适配层
│   │   └── store/              # Zustand adapter、selectors、命令入口
│   ├── persistence/            # IndexedDB、存档迁移、导入导出
│   └── test/                   # 测试工具和 fixtures
├── docs/
└── vite.config.ts
```

## 4. 关键工程约束

### 4.1 规则与时间

- 规则核心是确定性纯函数：`nextState = advance(state, deltaMs, rng)`；渲染不会直接修改游戏状态。
- 模拟固定步长为 `100ms`，单次浏览器帧最多补算 `250ms`，防止后台标签页恢复后发生不可控的大跳跃。
- 仅在发生重要命令、每 10 秒和页面隐藏时写入存档；不在每帧写 IndexedDB。
- 离线收益首版不做。以后实现时应以保存时间与受限模拟时长结算，不能依赖前台计时器。

### 4.2 数据驱动和迁移

- 建筑、角色原型、技能、掉落、地区、配方、符文节点均使用 `content` 配置。配置 ID 一经发布不改名。
- 存档具备 `schemaVersion`。加载流程：读取 → Zod 校验 → 逐版迁移 → 初始化缺省字段 → 进入游戏。
- 随机数由可注入随机源提供；生产环境可用 `Math.random()`，测试使用固定种子。
- 每次改动存档结构都要添加迁移和至少一个旧存档测试样本。

### 4.3 性能与像素表现

- Phaser 使用单一画布，按原始低分辨率逻辑坐标渲染并整数倍缩放；纹理关闭平滑。
- 角色实体少时（MVP < 20）直接逐帧更新即可；大量角色前不要提前引入 ECS。
- 图集化精灵、按 Scene 懒加载音频/大贴图；不要把未使用的高清图片放进首屏包。
- 目标：桌面端 60 FPS，普通笔记本主画面首屏 < 3 秒；通过浏览器性能面板实际验证。

## 5. GitHub Pages 发布

目标仓库是项目站点，最终 URL 形如：

```text
https://umaydie-cyber.github.io/wowmanager/
```

因此 Vite 配置必须设置：

```ts
base: '/wowmanager/'
```

工作流在 `main` 分支推送时执行 `npm ci`、`npm run build`，上传 `dist` 并发布。仓库 Settings → Pages → Build and deployment 的 Source 需要选择 **GitHub Actions**。

发布前的最低检查：

```bash
npm run lint
npm run test
npm run build
npm run preview
```

## 6. 后端边界与未来演进

下列功能不能安全地只用 GitHub Pages 实现：账号、跨设备云存档、付费、排行榜、反作弊、多人共享经济。若这些成为产品目标，再引入独立服务（例如 Cloudflare Workers + D1/R2 或托管 BaaS），并将本地 `SaveRepository` 替换为云端实现。现有核心模拟和 React/Phaser 层无需重写。

## 7. 首次依赖清单

初始化时优先安装以下直接依赖，版本采用创建当日的兼容稳定版本，并由 lockfile 固定：

```text
dependencies: react, react-dom, phaser, zustand, zod, idb
devDependencies: typescript, vite, @vitejs/plugin-react, vitest,
  @testing-library/react, @testing-library/jest-dom, eslint, prettier
```

第二阶段再加入 `@playwright/test`；音频需要实际接入后再评估 `howler`，不提前引入。
