# XiaohengOS — 像素作品集与 Ghost Agent

同一仓库，独立前后端。浏览器不包含 Python 后端或模型密钥。

```text
frontend/                       React + TypeScript + Vite
  src/features/ghost/           聊天终端、行为采集、前端动作执行、HTTP/SSE 客户端
  src/content/                  资料/项目的网页展示组件与中英翻译
  public/assets/                网站使用的像素图片
  art-source/                   原始生成素材与制作说明
  scripts/                      前端浏览器测试和素材处理脚本
backend/                        Python + FastAPI + LangGraph
  app/api/                      HTTP、SSE、审批和动作回传
  app/agent/                    Agent 决策图、工具定义
  app/providers/                OpenAI / DeepSeek 模型适配
  app/knowledge/                公开知识索引、SQLite FTS5 检索
  app/services/                 会话、TTL、限流
  app/schemas/                  请求、上下文、动作校验
  app/core/                     后端配置
  .env                          仅本机，模型 Key 放这里
  tests/                        模拟模型与接口测试
content/                        前后端共同使用的已公开资料
  profile.json                  审核后的公开个人资料
  projects/                     中英文项目 Markdown 及图片
  pdf/、videos/                 网页展示的项目媒体
knowledge/                      额外允许公开回答、但不直接展示的知识
build/                          前端生产构建产物
package.json                    工作区入口和快捷命令，不包含后端依赖
```

以前根目录下的 `src/` 是前端代码，`src/agent/` 也是前端交互代码，并非模型后端。
现在将其命名为 `frontend/src/features/ghost/`，避免与真正的后端 Agent 混淆。
旧静态原型、旧部署配置和打包产物已移出工作目录；当前唯一前端入口是 `frontend/`。
依赖、虚拟环境、构建产物、测试截图及本机密钥不进入 Git。网页使用的项目图片、PDF 和三个演示视频随源码提交，克隆后可直接构建。

## 启动

在仓库根目录执行：

```powershell
npm install
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -r backend/requirements.txt
# 只有首次没有 backend/.env 时才复制；不要覆盖已经填写的 Key。
# Copy-Item backend/.env.example backend/.env
npm run backend:index
```

两个终端分别启动：

```powershell
npm run backend:dev
npm run dev
```

前端 `http://127.0.0.1:5173`；后端 `http://127.0.0.1:8000`。
根目录 npm 命令自动转发到前端工作区或后端虚拟环境。
macOS/Linux 的虚拟环境 Python 为 `backend/.venv/bin/python`。

## DeepSeek 配置

仅编辑 `backend/.env`：

```dotenv
GHOST_PROVIDER=deepseek
GHOST_BASE_URL=https://api.deepseek.com
GHOST_MODEL=deepseek-flash
DEEPSEEK_API_KEY=在本地填写
GHOST_THINKING=disabled
```

旧的 `backend/.env` 内 `OPENAI_API_KEY` 名称仍兼容，但不会把系统全局的 OpenAI Key 自动用于 DeepSeek。
本次已将本项目变量改为 `DEEPSEEK_API_KEY`，Key 值和模型值不变。修改 `.env` 后重启后端。
`deepseek-v4-flash` 也可以作为兼容名称传入，但服务端当前将其路由到新版 Flash，详见 [DeepSeek 官方说明](https://api-docs.deepseek.com/)。
默认非思考模式有利于网页交互延迟；开启思考模式时，适配器只在后端保留工具调用所需状态，不向用户输出内部思考。

## 内容与隐私

修改 `content/profile.json`、`content/projects/` 更新网页；随后 `npm run backend:index` 更新知识索引。
补充知识遵循 [knowledge/README.md](knowledge/README.md) 的 `public: true` 审批要求。
任何入库的资料都允许对所有访客回答；不要放私密内容、密钥或雇主机密。

Ask Ghost 支持流式回答、来源定位、多个项目窗口和受限页面操作。
智能陪伴仅在访客开启后发送浏览摘要和简化轨迹；默认聊天不上传历史轨迹。
主动导航需要确认，用户点击/滚动优先；支持停止、安静模式和撤销导航。
刷新重置会话，应用不长期保存访客数据；模型服务商按其政策处理请求。

## 验证与部署

```powershell
npm run build
npm test
npm run backend:test
npm run test:browser
# 可选：会使用实际模型额度；普通回归测试不调用付费 API。
npm run backend:smoke
```

`npm run build` 仍输出根目录 `build/`，原部署的输出目录无需修改。
前端托管时安装/构建命令从仓库根目录运行，不能只上传 `frontend/`：它还使用 `content/` 的公开资料。
后端独立部署，单 worker，密钥只在后端环境变量中。生产前端通过 `/api` 反向代理，
或配置公开的 `frontend/.env` 中 `VITE_GHOST_API_URL`。绝不要配置 `VITE_*` 模型密钥。
Vite 开发服务器只允许前端、公开内容与依赖目录，不直接提供 backend/ 或 knowledge/ 文件。

[后端详细说明](backend/README.md) · [前端说明](frontend/README.md)

## GitHub Pages 个人主页

公开地址：https://huxiaoheng44.github.io/

源码保留在 `huxiaoheng44/xiaoheng-web-v3`；`huxiaoheng44/huxiaoheng44.github.io` 只存放构建后的静态文件，通过 `main` 分支根目录发布。当前不部署 Python 后端。

构建静态展示版时设置 `VITE_GHOST_STATIC_MODE=true` 再运行 `npm run build`。只将 `build/` 内容发布到主页仓库，并保留 `.nojekyll`；不能上传源码目录、`.env` 或后端数据库。这个版本不会向 `/api` 发送聊天或浏览轨迹请求，本地开发仍可连接后端。

两个仓库目前不会自动同步；修改源码后需要重新构建并发布静态文件。
