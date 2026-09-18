export const experienceZh = [
  {
    role: '系统工程师 · PingPong Vision',
    summary: '为 MULTIVAC 构建并部署智能设备监测系统，将工厂调研与真实设备测试转化为持续状态追踪、持久化存储和异常告警工作流。',
    highlights: [
      '把 15 次以上工厂走访与制造企业访谈中的发现，转化为持续设备状态追踪和面向操作员的告警方案。',
      '实现低开销监测流程，涵盖设备状态存储、结构化事件日志与异常状态检测。',
      '连接摄像头及 ESP32/MQTT 电流与光电传感器，构建 FastAPI WebSocket/MJPEG、Flask REST API、TimescaleDB 和 React/Vite 看板的数据链路。',
      '实现透视校正、数值归一化、重试与退避、连续失败自动停止、限流和不可读数据处理等可靠性机制。',
      '使用 Docker / Docker Compose 容器化服务，通过 Coolify 和反向代理部署，密钥仅保留在后端。',
      '以操作员动作、摄像头移动、屏幕变化和异常读数驱动监测逻辑，并在真实 MULTIVAC 设备上完成验证。',
    ],
  },
  {
    role: '平台工程师 · 学生兼职',
    summary: '参与基于 Backstage 的内部开发者平台与云原生平台运维，连接服务目录、工程模板、CI/CD、OpenShift 部署和团队入驻流程。',
    highlights: [
      '维护服务于 20 多个内部工程团队的 Backstage 平台，负责版本升级、插件评估、配置和上游变更适配。',
      '设计复用超过 100 次的标准工程模板，自动化服务初始化、代码仓库设置、CI/CD、Helm 部署和团队入驻。',
      '帮助团队以标准项目结构和开发 / 生产部署流程快速启动可交付服务。',
      '支持 OpenShift 上的生命周期管理，包括 Helm 分阶段部署、配置更新、补丁、下线及 GitOps 工作流。',
      '将项目纳入集中软件目录，并改进 Backstage 搜索，提升服务与文档的可发现性。',
      '通过平台集成、目录元数据和可复用的入驻流程提升开发效率。',
    ],
  },
  {
    role: '全栈开发工程师 · 学生兼职',
    summary: '构建 AI 增强型智能 ERP，涵盖订单管理、基于 RAG 的订单问答、用户权限与业务数据看板。',
    highlights: [
      '参与构建供 200 多名内部员工使用的智能 ERP，以及面向订单的 RAG 问答流程。',
      '实现文档解析、结构感知的语义分块、检索，以及订单和业务文档的 PDF 自动生成。',
      '设计 REST API、关系数据模型、校验逻辑及订单、用户、角色、看板和知识工作流的业务规则。',
      '实现身份认证、基于角色的访问控制和多种企业角色的权限流程。',
      '通过后端数据聚合和看板，将生产、订单和文档数据转化为运营决策信息。',
      '整理复杂业务数据，构建分析与可视化功能，呈现可行动的运营洞察。',
      '容器化应用服务并参与 CI/CD，支持可复现的构建、测试和部署。',
      '根据部署环境使用 Docker Compose、Nginx、AWS EC2/GCP，处理安全组、环境变量和运行时问题。',
    ],
  },
  {
    role: '软件工程师 · 编译器 / LLVM / CI',
    summary: '参与科学计算负载优化、Linux 兼容性排查、编译器构建环境和 CI/CD 工作流维护。',
    highlights: [
      '参与基于 Fortran 的科学与气象计算优化，关注数值性能及稳定性。',
      '优化科学计算负载，处理编译器构建环境中的 Linux 兼容性问题。',
      '排查跨 Linux 环境的构建、依赖、安装和兼容性问题。',
      '维护用于编译器构建、测试和发布的 Jenkins 与 GitLab CI 流水线。',
      '与开发和 QA 团队协作诊断构建失败，提升自动化验证流程的可靠性。',
    ],
  },
];
export const researchZh = [
  { title: '面向 LLM 代码生成的结构化中间表示', summary: '研究“问题 → 中间表示 → 代码”的两阶段流程，对比 YAML、Mermaid、伪代码和自定义 DSL，在复杂任务上实现 12–14% 的代码生成性能提升，并控制提示与 token 开销。' },
  { title: 'Web Harvest RAG', summary: '构建可配置的网站 / PDF 知识库与检索实验平台，比较分块、向量检索、BM25、混合融合、重排与查询改写；在 MULTIVAC 语料上达到 96.7% recall@5，并使用 LLM-as-judge 分析答案忠实度。' },
  { title: '自动化软件开发多智能体系统', summary: '使用 LangGraph / LangChain 构建四智能体协作流程，连接规划、执行、工单与 GraphQL 工具，任务成功率超过 83%；在 AWS 上部署，并结合基础设施即代码工作流。' },
  { title: '个人网站 · huxiaoheng.com', summary: '以 React、Express.js 和 MongoDB 构建项目、博客与演示管理平台，使用 Docker、Nginx 和 Google Cloud 部署。' },
  { title: 'Python Artifact Logger & Viewer', summary: '构建跨本地、AWS S3 与数据库元数据的实验产物追踪模块，以 Flask 提供查询、比较和可视化，并接入 Dynatrace 可用性监控。' },
  { title: '无人机仿真系统', summary: '连接 PX4、基于 seL4 的伴随计算机与 Raspberry Pi，实现 C++ 传感器数据代理，将原始数据转为控制与监测所需的结构化信息。' },
];
export const skillLabels: Record<string, [string, string]> = {
  programmingLanguages: ['Languages', '编程语言'], backendAndApis: ['Backend & APIs', '后端与 API'], frontend: ['Frontend', '前端'], databasesAndData: ['Databases & data', '数据库与数据'], aiLlmEngineering: ['AI & LLM engineering', 'AI 与大模型工程'], cloudDevOpsPlatform: ['Cloud & platform', '云与平台工程'], mlopsDataops: ['MLOps & DataOps', 'MLOps 与 DataOps'], collaborationAndTools: ['Collaboration & tools', '协作工具'],
};
