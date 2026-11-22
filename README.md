# PushPic

打开即用的 GitHub Pages 图床。图片直接上传到本仓库的 `images/` 目录，通过 Pages 生成外链，页面无需填写仓库、分支或 Token。

## 使用

1. 打开站点：<https://technologysauce.github.io/PushPic/>
2. 拖拽或点击上传图片（最多 20 张，单张 ≤ 50 MB）
3. 在图片库中搜索、预览、复制 Pages 链接 / raw 链接 / Markdown 代码，或删除图片

## 链接

- Pages 链接：`https://technologysauce.github.io/PushPic/images/文件.png`
- raw 链接：`https://raw.githubusercontent.com/TechnologySauce/PushPic/main/images/文件.png`

> 上传后 raw 链接立即可用；Pages 链接可能需要几十秒才会生效。

## 安全说明

页面内置了用于写入本仓库的访问令牌，因此访客打开页面即可上传，不需要自行配置密钥。

该令牌随前端文件公开，任何访问站点的人都能上传或删除仓库内图片。若要限制权限，请撤销该令牌并改用带鉴权的后端代理。请不要在公共电脑上使用本站点。

## 本地开发

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080
```

静态文件无需构建。页面直接调用 GitHub REST API。

## License

MIT
