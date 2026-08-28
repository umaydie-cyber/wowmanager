# WowManager

原创像素奇幻的 2D 要塞经营与小队战斗网页游戏。项目是纯前端单机作品：游戏配置和资源随静态站点发布，存档保存在浏览器的 IndexedDB 中。

## 技术栈

`TypeScript（strict）+ Vite + React + Phaser 3 + Zustand + Zod + idb`

React 负责 DOM 面板，Phaser 负责实时画布。游戏规则必须保持在 `src/game/core` 的纯 TypeScript 模块中，不能放进 React 组件或 Phaser Scene；候选数值和规则数据置于 `src/game/content` 或 `src/game/balance`。

## 本地运行

需要 Node.js 20.19 或更高版本及 npm 10 或更高版本。

```bash
npm ci
npm run dev
```

Vite 开发服务器会输出本地地址；项目固定使用 `/wowmanager/` 子路径，请打开形如 `http://localhost:5173/wowmanager/` 的页面。

## 测试与生产预览

单元测试使用 Vitest，浏览器流程使用 Playwright Chromium。首次运行 E2E 前安装浏览器：

```bash
npx playwright install chromium
npm run lint
npm run test
npm run build
npm run test:e2e
npm run preview
```

`npm run test:e2e` 会启动生产预览服务器并访问 `http://127.0.0.1:4173/wowmanager/`，因此要先执行 `npm run build`。E2E 覆盖新游戏、键盘建造、自动工作产出、保存与刷新恢复、损坏导入保护、确认对话框、派遣和 Boss 结算，并检查 320px 窄屏布局。

`npm run preview` 用于最终人工验收构建产物。重点检查：场景画布成功加载、方向键/回车/Escape 可操作、存档工具可下载与选取 JSON、浏览器刷新后进度恢复，以及开发者工具的 Network 面板中没有根路径资源请求或 404。

## 存档

页面启动时自动从 IndexedDB 恢复单个本地存档。重要操作立即排队保存，运行中每 10 秒及页面隐藏时也会保存。公开界面的“存档工具”提供：

- 立即保存；
- 确认后保存并导出 JSON；
- 先完整校验、展示摘要，再确认覆盖导入；
- 二次确认后重置本地存档。

导入的 JSON 在写入 IndexedDB 前由 Zod 完整校验。解析失败、结构损坏或版本不受支持时，当前内存状态和原 IndexedDB 存档都不会被覆盖。保存、导入、导出与重置共享同一条持久化队列，避免旧的自动保存反向覆盖新状态。

## GitHub Pages 部署

站点发布地址为 <https://umaydie-cyber.github.io/wowmanager/>。`vite.config.ts` 已固定设置 `base: '/wowmanager/'`；不要将它改为根路径。

推送到 `main` 或手动运行 workflow 会触发 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)。发布作业会依次执行 `npm ci`、lint、单元测试、生产构建、Playwright E2E，再将通过验证的 `dist` 交给 GitHub 官方 Pages Actions 部署；任一质量门失败都不会发布。

首次部署前，在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。工作流完成后即可访问上方 URL。

静态资源必须兼容项目子路径：从 `src` 导入资源时交给 Vite 处理；未来若添加 `public` 文件，应以 `import.meta.env.BASE_URL` 拼接地址，不要使用 `/assets/...` 这类域名根路径。当前视觉由 Phaser Graphics 在运行时原创绘制，不加载外部贴图。

## 当前可运行核心

- `src/game/core` 提供无 React、Phaser、浏览器 API 和系统时钟依赖的纯函数命令及 `advance(state, deltaMs, rng)`；它保存固定步长余量，渲染更新不会重复结算奖励。
- 主界面使用按容器等比缩放的 Phaser `320 × 180` 逻辑画布绘制 8×8 要塞；建筑与四方向角色移动、休息和工作均使用原创几何像素动画，并启用 nearest-neighbor/pixelArt 渲染。Phaser 只在进入游戏后延迟加载。
- 初始游戏包含可读且不重叠的 8×8 布局：3 顶角色帐篷、矿坑、药圃、健身房、3 名原创测试角色和配置化招募券。
- 建造、移动、拆除由 `src/game/core/actions/fortress.ts` 的纯命令执行，统一校验占地、整数格子、要塞边界、重叠和建造资源；拆除设施会让正在前往或使用它的角色返回帐篷。
- React 的资源栏、建造栏、建筑检查器、撤销和拆除操作调用这些核心命令。Phaser 只接收只读快照并通过 React 回调报告格子点击，不直接写入 Zustand；画布同时支持鼠标和方向键、Home、End、回车及 Escape。
- 角色会按 `IDLE → TO_REST → RESTING → SELECTING_WORK → TO_WORK → WORKING` 推进；休息需要时间，当前为集中配置的 3 秒候选值，完整休息结束才补满精力。每顶帐篷可独立选择采集或锻炼偏好；角色从自己的帐篷按曼哈顿距离和建筑 ID 选择至多 3 个设施，每座只处理一次后回帐篷。
- 矿坑先按配置抽矿种，再按采矿技能区间抽取 1–3 星品质；随机数由可注入 RNG 提供。角色详情展示基础/推导属性、耐力经验、采矿与草药学、当前建筑、行为队列和要塞背包。
- 可从岩卫、逐风者、织星师 3 个原创职业原型中随机招募。新角色会消耗配置化招募券并保持“待安置”，只有分配到空帐篷后才进入自动休息与工作循环；招募和安置立即保存。
- 专业技能按 `xpToNext(L) = 100 × (floor(L / 50) + 1)` 成长并在 300 点停止，锻炼技能不受该上限影响。属性、经验和资源品质计算均位于纯公式模块，所有可调常量收敛在 `src/game/balance`。
- `src/game/content/progression.ts` 定义职业原型、技能池、11 个装备槽、6 档品质、词条、符文树节点和地区掉落表；当前可派遣队伍推进三波敌群、进入 Boss 战并结算胜利与奖励。

## 已知限制

- 仅有浏览器本地单存档，没有账号、服务器、云同步或跨设备自动迁移；清理站点数据会删除进度，请自行导出备份。
- 不提供离线时间收益；页面关闭或后台计时被浏览器暂停期间不会补算资源。
- Boss 战是首个试玩版的流程结算，占位为玩家确认进入和胜利结算，尚无可交互战斗演出或失败判定。
- 当前没有音频和外部贴图；像素建筑与角色均为程序绘制的首版视觉。
- 自动化浏览器验收以 Chromium 为准；Safari 与 Firefox 仅做标准 Web 能力兼容，不在当前 CI 矩阵内。

## 目录

```text
src/
├── app/          # React 应用与全局样式
├── components/   # React DOM 组件
├── game/
│   ├── balance/  # 可调数值
│   ├── content/  # 数据配置
│   ├── core/     # 无 React/Phaser 依赖的规则
│   ├── phaser/   # Canvas、场景和表现适配
│   └── store/    # Zustand UI/游戏状态适配
├── persistence/  # IndexedDB 存档与迁移
└── test/         # 测试设置与 fixture
```

## 文档

- [产品与规则设计](docs/01-product-design.md)
- [技术栈与工程架构](docs/02-technical-stack.md)
- [分阶段开发提示词](docs/03-build-prompts.txt)
- [素材与第三方声明](ATTRIBUTIONS.md)
- [MIT License](LICENSE)

> 仅可使用原创角色、怪物、美术、音效与名称；不得加入任何第三方游戏的素材、角色或音效。
