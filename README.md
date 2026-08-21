# WowManager

像素风 2D 要塞经营与小队战斗网页游戏。首发目标是一个可由 GitHub Pages 托管、无需服务器、在浏览器本地保存进度的单机版本。

## 文档

- [产品与规则设计](docs/01-product-design.md)
- [技术栈与工程架构](docs/02-technical-stack.md)
- [分阶段开发提示词](docs/03-build-prompts.txt)

## 已确认的技术方向

`TypeScript + Vite + React + Phaser 3 + Zustand + IndexedDB`，由 GitHub Actions 自动部署至 GitHub Pages。

详见技术文档；工程初始化完成后，项目页地址将是：
`https://umaydie-cyber.github.io/wowmanager/`。

## 下一步

将本地仓库关联至远程仓库后，按 [`docs/03-build-prompts.txt`](docs/03-build-prompts.txt) 的第 1 个提示词开始实现：

```bash
git remote add origin https://github.com/umaydie-cyber/wowmanager.git
git add .
git commit -m "docs: add game and technical design"
git push -u origin main
```

> 说明：游戏会使用原创角色、怪物、美术、音效与名称；不要加入《魔兽世界》或其他第三方作品的受版权/商标保护素材。
