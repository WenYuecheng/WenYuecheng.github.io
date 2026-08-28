import { z } from 'zod';
import type { Locale } from '../lib/routes';

const linkSchema = z.object({ label: z.string().min(1), href: z.url() });
const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  eyebrow: z.string().min(1),
  summary: z.string().min(40),
  status: z.string().min(1),
  tags: z.array(z.string()).min(3),
  problem: z.string().min(40),
  role: z.string().min(15),
  architecture: z.array(z.string()).min(3),
  contributions: z.array(z.string()).min(3),
  evaluation: z.array(z.string()).min(1),
  technology: z.array(z.string()).min(3),
  links: z.array(linkSchema).min(1),
});

const contentSchema = z.object({
  meta: z.object({ title: z.string(), description: z.string().min(25) }),
  nav: z.record(z.string(), z.string()),
  profile: z.object({
    name: z.string(), label: z.string(), headline: z.string(), introduction: z.string().min(80),
    availability: z.string(), location: z.string(),
  }),
  education: z.object({
    university: z.string(), degree: z.string(), period: z.string(), gpa: z.string(), average: z.string(),
    rank: z.string(), ielts: z.string(), description: z.string(),
  }),
  courses: z.array(z.object({ name: z.string(), score: z.string() })).min(6),
  awards: z.array(z.object({ name: z.string(), date: z.string() })).min(4),
  interests: z.array(z.object({ name: z.string(), description: z.string() })).min(5),
  projects: z.array(projectSchema).length(4),
  research: z.object({
    name: z.string(), venue: z.string(), summary: z.string(), contributions: z.array(z.string()).min(2),
    metrics: z.array(z.string()).min(1), links: z.array(linkSchema).min(1),
  }),
  skills: z.array(z.object({ group: z.string(), items: z.array(z.string()).min(2) })).min(4),
  photography: z.object({ title: z.string(), description: z.string(), items: z.array(z.object({ slug: z.string().regex(/^[a-z0-9-]+$/), alt: z.string(), caption: z.string() })).length(3) }),
  socialLinks: z.array(linkSchema).length(3),
  labels: z.record(z.string(), z.string()),
});

export type SiteContent = z.infer<typeof contentSchema>;

const sharedProjects = {
  harness: { slug: 'yuecheng-harness', name: 'Yuecheng-Harness', links: [{ label: 'GitHub', href: 'https://github.com/WenYuecheng/Yuecheng-harness' }] },
  mindbridge: { slug: 'mindbridge', name: 'MindBridge', links: [{ label: 'Live system', href: 'https://mindbridge.wenyuecheng.cn' }] },
  edurag: { slug: 'edurag-agent', name: 'EduRAG Agent', links: [{ label: 'GitHub', href: 'https://github.com/WenYuecheng/edurag-agent' }] },
  chat: { slug: 'chat2excel', name: 'Chat2Excel', links: [{ label: 'GitHub', href: 'https://github.com/WenYuecheng/chat2Excel' }] },
};

const en: SiteContent = {
  meta: {
    title: 'Yuecheng Wen — Agentic Systems & Reliable AI',
    description: 'Academic portfolio of Yuecheng Wen, a Sichuan University computer science student building reliable agent runtimes, multi-agent systems and retrieval-augmented AI.',
  },
  nav: { profile: 'Profile', education: 'Education', interests: 'Research', systems: 'Systems', experience: 'Experience', skills: 'Skills', photography: 'Photography', contact: 'Contact' },
  profile: {
    name: 'Yuecheng Wen', label: 'CS Undergraduate · Agent Systems Builder',
    headline: 'I study how AI agents can reason, collaborate, and remain observable under real-world constraints.',
    introduction: 'I am a Computer Science undergraduate at Sichuan University, focused on agentic systems, reliable AI and retrieval. My work connects research questions with deployable systems: from a self-built agent runtime and evaluation harness to safety-aware multi-agent collaboration.',
    availability: 'Seeking AI postgraduate study & research opportunities', location: 'Chengdu, China',
  },
  education: {
    university: 'Sichuan University', degree: 'B.Eng. in Computer Science and Technology', period: '2023 — 2027 (Expected)',
    gpa: '3.85/4.00', average: '91.01/100', rank: '26/320', ielts: '7.0',
    description: 'A rigorous foundation in algorithms, systems and machine learning, extended through independent agent engineering and multimodal AI research.',
  },
  courses: [
    { name: 'Algorithms', score: '98' }, { name: 'Data Structures', score: '94' }, { name: 'Calculus', score: '95' },
    { name: 'Linear Algebra', score: '93' }, { name: 'Operating Systems', score: '95' }, { name: 'Computer Networks', score: '98 · Project 100' },
  ],
  awards: [
    { name: 'First-Class Individual Scholarship, Sichuan University', date: 'Dec 2025' },
    { name: 'Second Prize (Provincial), National Undergraduate Mathematics Competition', date: 'Dec 2024' },
    { name: 'Third-Class Scholarship, Sichuan University', date: 'Dec 2024' },
    { name: 'Third Prize (Provincial), Mathematical Contest in Modeling', date: 'Sep 2024' },
  ],
  interests: [
    { name: 'Agentic Systems', description: 'Runtimes, planning, tools, memory and evaluation for agents that act over long horizons.' },
    { name: 'Reliable AI', description: 'Observability, permissions and evidence-based evaluation for dependable AI applications.' },
    { name: 'Multi-Agent Collaboration', description: 'Event-driven coordination, role specialization and verifiable artifact hand-offs.' },
    { name: 'Retrieval-Augmented Generation', description: 'Hybrid retrieval, routing, reranking and evaluation for grounded reasoning.' },
    { name: 'AI Safety & Multimodal Reasoning', description: 'Risk-aware generation and reasoning across language and visual evidence.' },
  ],
  projects: [
    {
      ...sharedProjects.harness, eyebrow: '01 · Agent Runtime', status: 'Self-directed systems research',
      summary: 'A from-scratch coding-agent runtime with observable tool loops, permission boundaries, context folding, MCP interoperability and a skill evolution workflow.',
      tags: ['Agent Runtime', 'Harness Engineering', 'Evaluation'],
      problem: 'Agent demos often hide the runtime decisions that determine reliability: what tools execute, what context survives, which permissions apply and whether a change improves behavior.',
      role: 'Sole designer and engineer responsible for runtime architecture, safety boundaries, evaluation workflow and implementation.',
      architecture: ['Provider-compatible streaming tool loop', 'Episode, working and tool-memory context layers', 'MCP stdio client, subagents and persistent sessions', 'Replay-based skill candidate evaluation'],
      contributions: ['Implemented five permission modes plus read-before-write and modification-time conflict checks.', 'Designed context folding that preserves actionable memory without unbounded prompt growth.', 'Built an add–merge–discard skill evolution flow with rule and LLM judges, replay sets and champion selection.', 'Tracked session tokens, cost and tool events for inspectable agent runs.'],
      evaluation: ['Replay sets compare candidate skills against the current champion using deterministic rules and optional model judging.', 'Runtime checks cover permissions, conflicts, tool events and context behavior.'],
      technology: ['Python', 'OpenAI-compatible APIs', 'Anthropic-compatible APIs', 'MCP', 'JSON-RPC', 'pytest'],
    },
    {
      ...sharedProjects.mindbridge, eyebrow: '02 · Safety-Aware Multi-Agent System', status: 'Deployed · evaluation in progress',
      summary: 'A psychology-oriented multi-agent platform that connects intent routing, knowledge retrieval, risk governance, durable reports and run traces through an event-driven runtime.',
      tags: ['Multi-Agent', 'AI Safety', 'RAG'],
      problem: 'Psychological support scenarios require useful responses without losing risk controls, privacy boundaries or a traceable account of how multiple agents reached a result.',
      role: 'System architect and primary engineer across agent coordination, runtime harness, retrieval, safety workflow, backend services and deployment.',
      architecture: ['Coordinator-led event blackboard with claims and artifacts', 'Understanding, Safety, Context and Response agents', 'Redis short-term memory with durable database recovery', 'Local Ollama and cloud model adapters behind one runtime'],
      contributions: ['Decoupled agent execution, persistence and post-processing in a reusable runtime harness.', 'Implemented high-risk escalation, safety review and auditable report generation.', 'Added dynamic SKILL.md loading and six MCP tools, including queued high-risk follow-up tasks.', 'Deployed the static portal and application behind Caddy with HTTPS and restricted administrator routes.'],
      evaluation: ['A versioned 60-query retrieval set and 23 automated test methods cover core runtime and safety paths.', 'HitRate and MRR remain unpublished until the evaluation report is regenerated and independently reproducible.'],
      technology: ['Python', 'FastAPI', 'Redis', 'SQLAlchemy', 'Chroma', 'BM25', 'MCP', 'Ollama', 'Docker', 'Caddy'],
    },
    {
      ...sharedProjects.edurag, eyebrow: '03 · Retrieval & Learning', status: 'Research prototype',
      summary: 'An education-focused RAG agent combining hybrid retrieval, document parsing, query routing, mock interviews and learning-plan generation.',
      tags: ['Hybrid Retrieval', 'RAGAS', 'FastAPI'],
      problem: 'Educational questions span exact terminology, semantic concepts and multi-step learning goals, making a single retrieval strategy brittle across formats and query types.',
      role: 'Designed and implemented the retrieval pipeline, query transformations, service interface and offline evaluation workflow.',
      architecture: ['BM25 plus BGE-M3 dense and sparse retrieval', 'Weighted fusion and BGE reranking', 'Parent–child chunks with PDF, PPTX, DOCX and OCR parsing', 'Direct, HyDE, subquery and step-back routing'],
      contributions: ['Combined lexical and semantic evidence through weighted hybrid retrieval and reranking.', 'Built route-specific query transformations for different question structures.', 'Integrated document ingestion, mock interviews and personalized learning plans behind streaming APIs.'],
      evaluation: ['A 30-question RAGAS study recorded 97.1% context recall, 95.0% context relevance, 88.7% answer relevance and 83.9% faithfulness.'],
      technology: ['Python', 'FastAPI', 'BGE-M3', 'Milvus', 'BM25', 'RAGAS', 'Redis', 'MySQL'],
    },
    {
      ...sharedProjects.chat, eyebrow: '04 · LLM Application Platform', status: 'Full-stack system',
      summary: 'A natural-language spreadsheet and database assistant built around schema-aware NL2SQL, asynchronous exports and observable streaming interaction.',
      tags: ['Spring AI', 'NL2SQL', 'Distributed Systems'],
      problem: 'Business users need to query changing database schemas and export results without writing SQL, while long-running generation and delivery tasks must remain safe and responsive.',
      role: 'Backend engineer for the LLM workflow, microservice integration, export pipeline and streaming user experience.',
      architecture: ['Spring Cloud Alibaba microservices', 'Schema-aware NL2SQL prompt construction', 'Redis locking for idempotent export tasks', 'SSE delivery for progressive status and results'],
      contributions: ['Generated model context from live MySQL schema metadata for grounded SQL.', 'Built Excel export with EasyExcel, POI and Pinyin4j plus tool-triggered email attachments.', 'Protected distributed tasks with Redis locks and exposed progress over SSE.'],
      evaluation: ['Functional scenarios cover schema inspection, SQL generation, export concurrency and streamed delivery; no unsupported accuracy claim is published.'],
      technology: ['Java', 'Spring Boot', 'Spring AI', 'Spring Cloud Alibaba', 'MySQL', 'Redis', 'SSE', 'EasyExcel'],
    },
  ],
  research: {
    name: 'MIND · Multimodal Implicit Toxicity Detection', venue: 'ACL 2025 reproduction & extension',
    summary: 'Reproduced and studied a rule-induced, debate-based framework for recognizing implicit toxicity in memes where harm emerges from interactions between text and imagery.',
    contributions: ['Implemented dual debater–judge reasoning with self-supervised rule induction.', 'Examined rule selection and cross-modal evidence on FHM, HarM and MAMI benchmarks.'],
    metrics: ['FHM: 70% accuracy · 0.60 Macro-F1 in the reproduced setup'], links: [{ label: 'GitHub', href: 'https://github.com/WenYuecheng/MIND' }],
  },
  skills: [
    { group: 'Agent & LLM Systems', items: ['Agent runtimes', 'Multi-agent orchestration', 'MCP', 'Tool use', 'Memory & context engineering', 'Evaluation harnesses'] },
    { group: 'Retrieval & ML', items: ['RAG', 'BM25', 'BGE-M3', 'Vector databases', 'Reranking', 'RAGAS', 'CLIP', 'ResNet'] },
    { group: 'Engineering', items: ['Python', 'C++', 'SQL', 'Java', 'FastAPI', 'Spring Boot', 'Redis', 'Docker', 'Caddy'] },
    { group: 'Research Practice', items: ['Experiment design', 'Benchmark construction', 'Ablation thinking', 'Trace analysis', 'Technical writing'] },
  ],
  photography: {
    title: 'Field Notes', description: 'Photography is how I practice patient observation beyond code—light, structure and small signals in changing environments.',
    items: [{ slug: 'signal-dusk', alt: 'Sunset above a calm sea', caption: 'Signal / Dusk' }, { slug: 'frame-coast', alt: 'Heart-shaped palm silhouette by the sea', caption: 'Frame / Coast' }, { slug: 'artifact-shore', alt: 'LOVE sculpture on a beach at sunset', caption: 'Artifact / Shore' }],
  },
  socialLinks: [{ label: 'Email', href: 'mailto:15698557180@163.com' }, { label: 'GitHub', href: 'https://github.com/WenYuecheng' }, { label: 'CSDN', href: 'https://blog.csdn.net/Lucas_Micheal' }],
  labels: { academicProfile: 'Academic profile', education: 'Education & selected coursework', awards: 'Selected recognition', interests: 'Research interests', systems: 'Featured systems', research: 'Research experience', skills: 'Technical skills', contact: 'Start a conversation', viewCase: 'Open case study', problem: 'Problem', role: 'Role', architecture: 'Architecture', contributions: 'Key contributions', evaluation: 'Evaluation', technology: 'Technology', evidence: 'Evidence & links', back: 'Back to observatory', theme: 'Toggle theme', language: '中文', skip: 'Skip to content', score: 'Score', status: 'System status' },
};

const zh: SiteContent = {
  ...en,
  meta: { title: '温悦成 — 智能体系统与可靠人工智能', description: '四川大学计算机本科生温悦成的学术主页，聚焦可靠智能体运行时、多智能体协作、检索增强生成与AI安全。' },
  nav: { profile: '简介', education: '教育', interests: '研究', systems: '系统', experience: '经历', skills: '技能', photography: '摄影', contact: '联系' },
  profile: { name: '温悦成', label: '计算机本科生 · 智能体系统开发者', headline: '我研究 AI 智能体如何在真实约束下推理、协作，并保持可靠与可观测。', introduction: '我就读于四川大学计算机科学与技术专业，研究兴趣集中在智能体系统、可靠人工智能与检索增强生成。我希望把研究问题做成可部署、可评测的系统：从自研智能体运行时与评测 Harness，到具有安全治理能力的事件驱动多智能体平台。', availability: '正在寻求人工智能深造与科研机会', location: '中国 · 成都' },
  education: { university: '四川大学', degree: '计算机科学与技术 · 工学学士', period: '2023 — 2027（预计）', gpa: '3.85/4.00', average: '91.01/100', rank: '26/320', ielts: '7.0', description: '以算法、系统和机器学习课程为基础，通过独立智能体工程与多模态 AI 研究持续拓展。' },
  courses: [{ name: '算法设计与分析', score: '98' }, { name: '数据结构', score: '94' }, { name: '微积分', score: '95' }, { name: '线性代数', score: '93' }, { name: '操作系统', score: '95' }, { name: '计算机网络', score: '98 · 课程项目 100' }],
  awards: [{ name: '四川大学单项一等奖学金', date: '2025.12' }, { name: '全国大学生数学竞赛省级二等奖', date: '2024.12' }, { name: '四川大学综合三等奖学金', date: '2024.12' }, { name: '数学建模竞赛省级三等奖', date: '2024.09' }],
  interests: [{ name: '智能体系统', description: '面向长程任务的运行时、规划、工具、记忆与评测。' }, { name: '可靠人工智能', description: '以可观测性、权限和证据驱动评测构建可信 AI 应用。' }, { name: '多智能体协作', description: '事件驱动协作、角色专化与可验证的产物交接。' }, { name: '检索增强生成', description: '面向事实落地的混合检索、路由、重排与评测。' }, { name: 'AI 安全与多模态推理', description: '风险感知生成与跨语言、视觉证据推理。' }],
  projects: [
    { ...en.projects[0], eyebrow: '01 · 智能体运行时', status: '独立系统研究', summary: '从零实现的编码智能体运行时，覆盖可观测工具循环、权限边界、上下文折叠、MCP 互操作与 Skill 自进化评测流程。', tags: ['Agent Runtime', 'Harness 工程', '评测'], problem: '许多智能体演示隐藏了决定可靠性的运行时行为：工具如何执行、哪些上下文被保留、权限如何约束，以及一次修改是否真正改善了行为。', role: '独立完成运行时架构、安全边界、评测流程与核心实现。', architecture: ['兼容多模型供应商的流式工具循环', 'Episode、Working 与 Tool Memory 分层上下文', 'MCP stdio 客户端、子智能体与持久会话', '基于回放的 Skill 候选评测'], contributions: ['实现五种权限模式、先读后写和文件修改时间冲突检测。', '设计上下文折叠，在限制提示词增长的同时保留可执行记忆。', '构建 Skill 新增、合并、丢弃流程，并结合规则/模型裁判、回放集与冠军选择。', '记录会话 token、成本与工具事件，支持运行过程审计。'], evaluation: ['用回放集和确定性规则比较候选 Skill 与当前冠军，并可选模型裁判。', '运行时测试覆盖权限、冲突、工具事件和上下文行为。'], technology: en.projects[0].technology },
    { ...en.projects[1], eyebrow: '02 · 安全多智能体系统', status: '已部署 · 评测进行中', summary: '面向心理场景的多智能体平台，通过事件驱动运行时连接意图路由、知识检索、风险治理、持久报告与运行轨迹。', tags: ['多智能体', 'AI 安全', 'RAG'], problem: '心理支持场景既要提供有效回复，也不能牺牲风险控制、隐私边界和多智能体决策过程的可追溯性。', role: '负责智能体协作、运行时 Harness、检索、安全流程、后端服务与部署的系统架构和主要实现。', architecture: ['Coordinator 主导的事件黑板、Claim 与 Artifact', 'Understanding、Safety、Context 与 Response 智能体', 'Redis 短期记忆与数据库持久恢复', '本地 Ollama 与云模型统一适配'], contributions: ['通过统一 Harness 解耦智能体执行、持久化和工具后处理。', '实现高风险升级、安全复核与可审计报告生成。', '加入动态 SKILL.md 加载和六种 MCP 工具，异步处理高风险后置任务。', '使用 Caddy、HTTPS 和管理员路由限制完成线上部署。'], evaluation: ['版本化的 60 条检索评测集和 23 项自动测试覆盖核心运行时与安全链路。', 'HitRate 与 MRR 将在报告重新生成并可独立复现后公开。'], technology: en.projects[1].technology },
    { ...en.projects[2], eyebrow: '03 · 检索与学习', status: '研究原型', summary: '面向教育场景的 RAG 智能体，融合混合检索、多格式解析、查询路由、模拟面试与学习计划生成。', tags: ['混合检索', 'RAGAS', 'FastAPI'], problem: '教育问题横跨精确术语、语义概念和多步骤学习目标，单一检索策略难以适应多格式资料与不同查询类型。', role: '设计并实现检索管线、查询变换、服务接口和离线评测流程。', architecture: ['BM25 与 BGE-M3 稠密/稀疏检索', '加权融合与 BGE 重排', '父子分块以及 PDF、PPTX、DOCX、OCR 解析', 'Direct、HyDE、Subquery 与 Step-back 路由'], contributions: ['通过加权混合检索与重排融合词法和语义证据。', '为不同问题结构实现路由专用查询变换。', '将文档接入、模拟面试与个性化学习计划整合到流式 API。'], evaluation: ['30 问 RAGAS 评测：上下文召回 97.1%、上下文相关性 95.0%、答案相关性 88.7%、忠实度 83.9%。'], technology: en.projects[2].technology },
    { ...en.projects[3], eyebrow: '04 · 大模型应用平台', status: '全栈系统', summary: '围绕 Schema 感知 NL2SQL、异步导出与可观测流式交互构建的自然语言表格和数据库助手。', tags: ['Spring AI', 'NL2SQL', '分布式系统'], problem: '业务用户需要在不了解 SQL 的情况下查询持续变化的数据库 Schema，同时长时间运行的生成与交付任务必须安全、响应及时。', role: '负责大模型工作流、微服务集成、导出管线和流式交互的后端实现。', architecture: ['Spring Cloud Alibaba 微服务', 'Schema 感知的 NL2SQL 提示词构建', 'Redis 锁保证导出任务幂等', 'SSE 持续返回状态与结果'], contributions: ['从 MySQL 实时 Schema 元数据生成模型上下文，提高 SQL 落地性。', '基于 EasyExcel、POI、Pinyin4j 实现导出与工具触发邮件附件。', '用 Redis 锁保护分布式任务，并通过 SSE 暴露进度。'], evaluation: ['功能场景覆盖 Schema 检查、SQL 生成、导出并发与流式交付，不发布缺乏依据的准确率。'], technology: en.projects[3].technology },
  ],
  research: { name: 'MIND · 多模态隐式有害内容识别', venue: 'ACL 2025 论文复现与拓展', summary: '复现并研究基于规则归纳和辩论的隐式有害 Meme 识别框架，关注文本与图像交互后才显现的风险。', contributions: ['实现双辩手—裁判推理与自监督规则归纳。', '在 FHM、HarM、MAMI 基准上考察规则选择与跨模态证据。'], metrics: ['复现实验 FHM：准确率 70% · Macro-F1 0.60'], links: en.research.links },
  skills: [{ group: '智能体与大模型系统', items: ['Agent Runtime', '多智能体编排', 'MCP', '工具调用', '记忆与上下文工程', '评测 Harness'] }, { group: '检索与机器学习', items: ['RAG', 'BM25', 'BGE-M3', '向量数据库', '重排', 'RAGAS', 'CLIP', 'ResNet'] }, { group: '工程能力', items: ['Python', 'C++', 'SQL', 'Java', 'FastAPI', 'Spring Boot', 'Redis', 'Docker', 'Caddy'] }, { group: '科研实践', items: ['实验设计', '基准集构建', '消融分析', 'Trace 分析', '技术写作'] }],
  photography: { title: '场外笔记', description: '摄影让我在代码之外练习耐心观察——记录变化环境中的光线、结构和微小信号。', items: [{ slug: 'signal-dusk', alt: '平静海面上方的落日', caption: '信号 / 黄昏' }, { slug: 'frame-coast', alt: '海边心形棕榈剪影', caption: '取景 / 海岸' }, { slug: 'artifact-shore', alt: '落日海滩上的 LOVE 雕塑', caption: '作品 / 岸边' }] },
  labels: { academicProfile: '个人简介', education: '教育经历与精选课程', awards: '奖学金与竞赛', interests: '研究兴趣', systems: '代表系统', research: '科研经历', skills: '技术能力', contact: '保持联系', viewCase: '查看案例', problem: '问题', role: '个人职责', architecture: '系统架构', contributions: '关键贡献', evaluation: '评测', technology: '技术栈', evidence: '证据与链接', back: '返回观测站', theme: '切换主题', language: 'English', skip: '跳转到正文', score: '成绩', status: '系统状态' },
};

export const allContent = { en, zh } satisfies Record<Locale, SiteContent>;
export const projectSlugs = en.projects.map((project) => project.slug);

export function validateContent(content: Record<Locale, SiteContent>) {
  for (const locale of ['en', 'zh'] as const) contentSchema.parse(content[locale]);
  const enSlugs = content.en.projects.map(({ slug }) => slug);
  const zhSlugs = content.zh.projects.map(({ slug }) => slug);
  if (new Set(enSlugs).size !== enSlugs.length || enSlugs.join('|') !== zhSlugs.join('|')) throw new Error('Project slugs must be unique and aligned across languages.');
  return content;
}

validateContent(allContent);
