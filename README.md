# PushPic

基于 **GitHub Pages + GitHub Contents API** 的免费图床。纯静态页面，无需服务器：图片直接上传到你的 GitHub 仓库，通过 Pages 生成外链。

## 功能

- 拖拽或点击上传图片（最多 20 张，单张 ≤ 10 MB）
- 文件名自动去重，避免覆盖已有图片
- 图片库浏览、搜索、分页、预览
- 一键复制 Pages 链接、raw 链接或 Markdown 代码
- 删除图片（需 Token 具备写入权限）
- 支持自定义域名
- 配置仅保存在浏览器 localStorage，不上传任何服务器

## 部署

1. Fork 或克隆本仓库到你的 GitHub 账号。
2. 在仓库 **Settings → Pages → Build and deployment** 中，Source 选择 `Deploy from a branch`，分支选 `main`、目录选 `/ (root)`，保存。
3. 访问 `https://<用户名>.github.io/<仓库名>/`。
4. 打开页面右上角 **设置**，填写：
   - **仓库**：`owner/repo`（默认已填为本仓库）
   - **分支**：`main`
   - **图片目录**：`images`
   - **Token**：具有 `repo` 权限的 Personal Access Token（Settings → Developer settings → Personal access tokens）。Fine-grained token 需要 `Contents: read and write` 权限。
5. 开始上传。生成的外链形如 `https://<用户名>.github.io/<仓库名>/images/xxx.png`。

> Token 只保存在当前浏览器的 localStorage。请不要在公共电脑上使用，也不要把 Token 提交到仓库。

## 链接说明

- **Pages 链接**：`https://<用户>.github.io/<仓库>/images/文件.png`
- **raw 链接**：`https://raw.githubusercontent.com/<用户>/<仓库>/<分支>/images/文件.png`
- 勾选「使用自定义域名」后，Pages 链接会替换为所填域名。

## 本地开发

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080
```

静态文件无需构建。页面会直接调用 GitHub REST API。

## License

MIT
