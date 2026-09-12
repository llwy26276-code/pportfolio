# 黄宝怡作品集：前台 + Decap CMS

以前一阶段的新版 index.html 为设计基础，保留字体、配色、导航和案例 A/B/C 结构。
正式架构不依赖任何个人电脑：浏览器后台 → GitHub OAuth → GitHub 内容提交 → Actions 构建 → Pages。

## 第一阶段状态

- 本地后台可新增、编辑、删除作品，上传封面和案例图片；游戏支持 A 钩子 / 多个 B 卖点模块 / C CTA。
- 每个作品一个 JSON，三个目录分别管理游戏、品牌视频和校园微电影。
- original_index.txt 保持原样；reference/pre-cms-index.html.txt 保存重构前新版快照。
- 原有图片和 MP4 保留在仓库，前台视频改用已有 B 站外链；部署产物不包含旧 MP4。
- 线上配置和授权服务代码已准备，但未部署 Worker，未配置 GitHub OAuth/Pages 权限，未 commit 或 push。

## 本地开发

安装 Node.js 22 和 pnpm 11.19.0，在项目目录执行：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

前台 http://localhost:4174/ ，后台 http://localhost:4174/admin/ ，点击“登录”进入本地测试。
本地强制使用 Decap 文件代理（127.0.0.1:8081，fs 模式），不会退回 GitHub backend。
本地“发布”只保存本机文件，不提交、不推送。请使用 localhost；关闭终端会停止测试服务。
保存后刷新前台会自动构建，也可用 /portfolio/ 前缀测试 Pages 子路径。

```sh
pnpm test
pnpm build
```

构建从模板和 JSON 生成根目录 index.html 及 dist/。index.html 仍是正式入口，但不要手工修改生成的作品段落。

## 上线后的后台操作（任何电脑均可）

1. 打开 https://llwy26276-code.github.io/portfolio/admin/ ，使用拥有本仓库写权限的 GitHub 账号登录。
2. 左侧选择游戏案例、品牌视频或校园微电影，点击“＋”新增；点击已有标题编辑。
3. 填标题、排序、项目介绍、职责、视频 HTTPS 外链、分析与复盘。游戏另外填写 A、B、C；B 列表可增删、重排模块，每个模块可添加多张图。
4. 封面或图片字段中选择“选择图片 → 上传 → 选用已选中项目”。支持 PNG、JPG、WEBP、GIF，单张不超过 5 MB。
5. “发布 → 立即发布”会提交到 llwy26276-code/portfolio 的 main，触发 Actions。等待工作流成功后刷新前台。
6. 删除作品：打开作品，点击“删除内容”并确认。不会自动清理可能被其他作品使用的图片；确认无引用后再从媒体库删除。

后台相对站点根目录是 /admin/；GitHub 项目 Pages 的完整路径包含 /portfolio/。
上述线上网址是配置完成后的目标地址，本版本尚未上线。

## 内容与结构

| 位置 | 用途 |
| --- | --- |
| content/game/*.json | 游戏：基本资料、hook、selling_points、cta、analysis、iterations、review |
| content/brand/*.json | 品牌视频 |
| content/film/*.json | 校园微电影 |
| assets/uploads/ | 后台上传的封面和案例图片，线上保存在同一 GitHub 仓库 |
| templates/page.html | 固定结构、首页、关于我的内容 |
| scripts/render.mjs | 作品 HTML 模板、转义、媒体路径校验 |
| assets/css/styles.css | 样式与响应式规则 |
| assets/js/main.js | 导航、灯箱、案例切换 |
| admin/config.yml | Decap 字段与 GitHub backend（JSON 语法是合法 YAML） |
| admin/init.js | 分离本地代理和云端模式 |
| oauth/worker.js | 单独部署的云端 OAuth 服务，不进入 Pages 产物 |
| .github/workflows/pages.yml | main 更新后自动构建部署 dist |

scripts/migrate.mjs 是已执行的一次性迁移工具，有 content/game 后拒绝重跑。
scripts/cms-config.mjs 用于生成字段配置，不在构建时运行；重跑会重置 OAuth 地址，需重新填写 backend.base_url。
删除某类最后一个作品受支持，会显示“作品整理中”。长文字按纯文本保存，不接受任意 HTML。

## 上线前需要配置

### GitHub 仓库与 Pages

- 当前配置仓库 llwy26276-code/portfolio、分支 main。
- 编辑者需要 Write / push 权限。若 main 强制 PR，直接发布会被拒绝；应另行配置 editorial workflow，不要随意取消保护。
- Settings → Pages → Source 选择 GitHub Actions。
- 允许仓库运行 Actions，以及工作流的 contents: read、pages: write、id-token: write；github-pages environment 允许 main 部署。
- Actions 只读取内容并部署，不写回生成的 index.html，不需要个人 GitHub Token。

### 云端 OAuth（提供 Cloudflare Worker 实现）

网站继续使用 GitHub Pages，Cloudflare 仅负责授权交换。

1. 在自己的 Cloudflare 账号创建 Worker，部署 oauth/worker.js（可通过 Dashboard，或 Wrangler 配合 oauth/wrangler.toml）。记下实际 HTTPS 地址。
2. GitHub Settings → Developer settings → OAuth Apps → New OAuth App：
   - Homepage URL 填 https://llwy26276-code.github.io/portfolio/admin/
   - Callback URL 填 https://你的Worker域名/callback
3. 在 Worker Variables and Secrets 配置：
   - GITHUB_CLIENT_ID：OAuth App Client ID。
   - GITHUB_CLIENT_SECRET：OAuth App Client Secret，必须设为 Secret。
   - STATE_SECRET：单独生成的至少 32 字节随机值，必须设为 Secret。
   - CMS_ORIGIN：https://llwy26276-code.github.io （不带 /portfolio/，用于限制令牌回传来源）。
4. 将 admin/config.yml 的 backend.base_url 替换为实际 Worker HTTPS 地址。
5. 经确认后推送项目，在另一台电脑上验证登录、保存和 Actions/Pages 更新。

Worker 请求 public_repo，适用于公开仓库；该 OAuth scope 不是单仓库授权。私有仓库需另行评估 repo scope 与 Pages 计划支持。
本轮没有改变仓库权限。令牌过期后重新登录，此阶段未实现刷新令牌流程。

### 令牌边界

没有硬编码 Token，也没有把 Client Secret 写入源码或构建产物。
标准 Decap GitHub backend 必须在浏览器运行时取得 OAuth Token 并调用 GitHub API，CMS 可能将它保存在浏览器登录存储中。
因此本方案满足“不在前端源码暴露 Token”，不满足“浏览器永远不能持有 Token”。后一种要求需要服务端会话和内容 API 代理，不能直接沿用标准 GitHub backend。
Worker 使用签名 state、HttpOnly/Secure Cookie、限定 origin 的 postMessage，不记录 Token。不要把 Secret 发到聊天或提交进 Git。

## 验证与限制

- 浏览器验证了新建、修改、封面上传、JSON 保存及 /portfolio/ 前台图片加载；测试内容与测试图片已清理。
- 删除通过同一个 Decap 本地代理 API 验证；浏览器确认弹窗受自动化工具限制，未完成该弹窗的自动确认。
- 自动化测试覆盖多卖点/多图渲染、空集合、内容转义、路径校验、CMS schema、OAuth state 拒绝与模拟成功交换。
- 真实 GitHub OAuth、远程保存、Actions 和 Pages 发布尚未联调：云端凭据未配置且本轮禁止 push。
- 游戏占位文案保留，仍需完善真实案例。

## 官方参考

- [Decap GitHub backend](https://decapcms.org/docs/github-backend/)
- [Decap 本地代理](https://decapcms.org/docs/decap-proxy/)
- [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [GitHub Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
