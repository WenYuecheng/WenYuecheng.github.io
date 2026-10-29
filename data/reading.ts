/** Public bibliographic metadata only; source PDFs remain in the owner’s Downloads archive. */
export type Paper = {
  id: string;
  title: string;
  year: number;
  /** First arXiv submission or publisher online date; null when a day is not established. */
  paperDate: string | null;
  /** Original source-file modification timestamp, not a claimed reading date. */
  addedAt: string;
  tags: string[];
  summary: {zh: string; en: string};
  url: string;
};

// Already ordered newest source addition first; keep the array JSON-compatible for the archive helper.
export const papers: Paper[] = [
  {
    "id": "2603.15031v1",
    "title": "Attention Residuals",
    "year": 2026,
    "paperDate": "2026-03-16",
    "addedAt": "2026-10-23T08:42:29.599424Z",
    "tags": [
      "Architecture",
      "Residual connections"
    ],
    "summary": {
      "zh": "以沿网络深度的注意力替代固定残差累加，并用分块方案降低训练开销。",
      "en": "Replaces fixed residual accumulation with attention across network depth and uses a blockwise variant to reduce training overhead."
    },
    "url": "https://arxiv.org/abs/2603.15031v1"
  },
  {
    "id": "2509.26490v2",
    "title": "VitaBench: Benchmarking LLM Agents with Versatile Interactive Tasks in Real-world Applications",
    "year": 2025,
    "paperDate": "2025-09-30",
    "addedAt": "2026-10-09T12:15:19.450383Z",
    "tags": [
      "Agents",
      "Evaluation"
    ],
    "summary": {
      "zh": "在真实应用场景中构建交互任务，评测智能体的信息处理、工具使用与长期任务执行。",
      "en": "Benchmarks agents with interactive tasks in real-world applications involving information processing, tool use, and long-horizon execution."
    },
    "url": "https://arxiv.org/abs/2509.26490v2"
  },
  {
    "id": "2512.08296v1",
    "title": "Towards a Science of Scaling Agent Systems",
    "year": 2025,
    "paperDate": "2025-12-09",
    "addedAt": "2026-10-09T09:06:07.701656Z",
    "tags": [
      "Agents",
      "Scaling"
    ],
    "summary": {
      "zh": "比较不同任务与协作架构下的单智能体和多智能体系统，分析扩展收益及协调开销。",
      "en": "Compares single-agent and multi-agent systems across tasks and coordination architectures to study scaling gains and coordination costs."
    },
    "url": "https://arxiv.org/abs/2512.08296v1"
  },
  {
    "id": "2510.14967v2",
    "title": "Information Gain-based Policy Optimization: A Simple and Effective Approach for Multi-Turn Search Agents",
    "year": 2025,
    "paperDate": "2025-10-16",
    "addedAt": "2026-09-22T12:32:06.726250Z",
    "tags": [
      "Agents",
      "Reinforcement learning"
    ],
    "summary": {
      "zh": "以信息增益构造过程奖励，研究多轮搜索智能体的策略优化。",
      "en": "Uses information gain to construct process rewards for optimizing multi-turn search agents."
    },
    "url": "https://arxiv.org/abs/2510.14967v2"
  },
  {
    "id": "2512.13564v2",
    "title": "Memory in the Age of AI Agents: A Survey — Forms, Functions and Dynamics",
    "year": 2025,
    "paperDate": "2025-12-15",
    "addedAt": "2026-09-22T11:38:32.964992Z",
    "tags": [
      "Agents",
      "Memory",
      "Survey"
    ],
    "summary": {
      "zh": "从形式、功能与动态过程三个维度梳理智能体记忆，并汇总相关评测和开源框架。",
      "en": "Surveys agent memory through its forms, functions, and dynamics, with an overview of benchmarks and open-source frameworks."
    },
    "url": "https://arxiv.org/abs/2512.13564v2"
  },
  {
    "id": "2402.07148v2",
    "title": "X-LoRA: Mixture of Low-Rank Adapter Experts, a Flexible Framework for Large Language Models with Applications in Protein Mechanics and Molecular Design",
    "year": 2024,
    "paperDate": "2024-02-11",
    "addedAt": "2026-09-22T06:58:59.716496Z",
    "tags": [
      "MoE",
      "Fine-tuning"
    ],
    "summary": {
      "zh": "使用逐层逐 token 的动态权重组合低秩适配器专家，并探索蛋白质与分子任务。",
      "en": "Dynamically combines low-rank adapter experts across layers and tokens, with applications to protein and molecular tasks."
    },
    "url": "https://arxiv.org/abs/2402.07148v2"
  },
  {
    "id": "2106.09685v2",
    "title": "LoRA: Low-Rank Adaptation of Large Language Models",
    "year": 2021,
    "paperDate": "2021-06-17",
    "addedAt": "2026-09-22T06:49:42.600092Z",
    "tags": [
      "Fine-tuning",
      "Efficiency"
    ],
    "summary": {
      "zh": "冻结预训练权重并训练低秩矩阵，为大语言模型提供参数高效的适配方法。",
      "en": "Adapts large language models by freezing pretrained weights and training low-rank update matrices."
    },
    "url": "https://arxiv.org/abs/2106.09685v2"
  },
  {
    "id": "2309.00071v3",
    "title": "YaRN: Efficient Context Window Extension of Large Language Models",
    "year": 2023,
    "paperDate": "2023-08-31",
    "addedAt": "2026-09-22T06:14:23.113109Z",
    "tags": [
      "Long context",
      "Position embeddings"
    ],
    "summary": {
      "zh": "提出 YaRN 位置编码扩展方法，以较低微调成本延长语言模型的上下文窗口。",
      "en": "Presents YaRN, a rotary-embedding extension method for increasing language-model context windows with limited fine-tuning."
    },
    "url": "https://arxiv.org/abs/2309.00071v3"
  },
  {
    "id": "2104.07857v1",
    "title": "ZeRO-Infinity: Breaking the GPU Memory Wall for Extreme Scale Deep Learning",
    "year": 2021,
    "paperDate": "2021-04-16",
    "addedAt": "2026-09-21T08:44:30.013567Z",
    "tags": [
      "Systems",
      "Training"
    ],
    "summary": {
      "zh": "通过跨 GPU、CPU 和 NVMe 的状态卸载突破大模型训练的显存限制。",
      "en": "Presents a GPU, CPU, and NVMe offloading system for training models beyond GPU memory limits."
    },
    "url": "https://arxiv.org/abs/2104.07857v1"
  },
  {
    "id": "2606.19348v1",
    "title": "DeepSeek-V4: Towards Highly Efficient Million-Token Context Intelligence",
    "year": 2026,
    "paperDate": "2026-04-26",
    "addedAt": "2026-09-21T07:31:56.998620Z",
    "tags": [
      "MoE",
      "Long context"
    ],
    "summary": {
      "zh": "介绍支持百万 token 上下文的 DeepSeek-V4，结合压缩注意力、mHC 与 Muon 优化。",
      "en": "Describes DeepSeek-V4 million-token-context models combining compressed attention, manifold-constrained hyper-connections, and Muon optimization."
    },
    "url": "https://arxiv.org/abs/2606.19348v1"
  },
  {
    "id": "deepseek-v3-2-exp",
    "title": "DeepSeek-V3.2-Exp: Boosting Long-Context Efficiency with DeepSeek Sparse Attention",
    "year": 2025,
    "paperDate": null,
    "addedAt": "2026-09-21T07:28:27.468308Z",
    "tags": [
      "Attention",
      "Long context"
    ],
    "summary": {
      "zh": "在 DeepSeek-V3.1-Terminus 上引入稀疏注意力，通过索引器筛选相关 token 以降低长上下文开销。",
      "en": "Adds sparse attention to DeepSeek-V3.1-Terminus, using an indexer to select relevant tokens and reduce long-context costs."
    },
    "url": "https://github.com/deepseek-ai/DeepSeek-V3.2-Exp/blob/main/DeepSeek_V3_2.pdf"
  },
  {
    "id": "2512.02556v1",
    "title": "DeepSeek-V3.2: Pushing the Frontier of Open Large Language Models",
    "year": 2025,
    "paperDate": "2025-12-02",
    "addedAt": "2026-09-21T05:40:05.112789Z",
    "tags": [
      "Agents",
      "Attention"
    ],
    "summary": {
      "zh": "结合 DeepSeek 稀疏注意力、强化学习与智能体数据合成，研究高效推理和工具使用。",
      "en": "Combines DeepSeek Sparse Attention, reinforcement learning, and agent-data synthesis for efficient reasoning and tool use."
    },
    "url": "https://arxiv.org/abs/2512.02556v1"
  },
  {
    "id": "2602.15763v2",
    "title": "GLM-5: from Vibe Coding to Agentic Engineering",
    "year": 2026,
    "paperDate": "2026-02-17",
    "addedAt": "2026-09-21T05:35:54.098079Z",
    "tags": [
      "Agents",
      "Foundation models"
    ],
    "summary": {
      "zh": "介绍面向长期软件工程任务的 GLM-5，并研究稀疏注意力与异步强化学习。",
      "en": "Describes GLM-5 for long-horizon software engineering, including sparse attention and asynchronous reinforcement learning."
    },
    "url": "https://arxiv.org/abs/2602.15763v2"
  },
  {
    "id": "deepseek-v4-1-flash",
    "title": "DeepSeek-V4.1-Flash: Pushing the Limits of KV Cache Compression",
    "year": 2026,
    "paperDate": null,
    "addedAt": "2026-09-18T13:00:46.169025Z",
    "tags": [
      "MoE",
      "Inference",
      "Compression"
    ],
    "summary": {
      "zh": "通过因果编码器解码器架构、跨层缓存复用与 FP4 缓存压缩，降低长上下文推理开销。",
      "en": "Combines a causal encoder-decoder architecture, cross-layer cache reuse, and FP4 cache compression to reduce long-context inference costs."
    },
    "url": "https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/main/DeepSeek_V41_Tech_Report.pdf"
  },
  {
    "id": "2607.24653v2",
    "title": "Kimi K3: Open Frontier Intelligence",
    "year": 2026,
    "paperDate": "2026-07-27",
    "addedAt": "2026-09-18T12:59:40.756359Z",
    "tags": [
      "MoE",
      "Multimodal",
      "Agents"
    ],
    "summary": {
      "zh": "介绍具备原生视觉与百万 token 上下文的 Kimi K3，以及其架构、训练和智能体能力。",
      "en": "Describes Kimi K3 with native vision and a million-token context, including its architecture, training, and agentic capabilities."
    },
    "url": "https://arxiv.org/abs/2607.24653v2"
  },
  {
    "id": "2512.24880v2",
    "title": "mHC: Manifold-Constrained Hyper-Connections",
    "year": 2025,
    "paperDate": "2025-12-31",
    "addedAt": "2026-09-18T12:58:12.339187Z",
    "tags": [
      "Architecture",
      "Residual connections"
    ],
    "summary": {
      "zh": "将超连接限制在流形结构上，以改善残差信息流的稳定性和可扩展性。",
      "en": "Constrains hyper-connections to a manifold structure to improve the stability and scalability of residual information flow."
    },
    "url": "https://arxiv.org/abs/2512.24880v2"
  },
  {
    "id": "2409.19606v3",
    "title": "Hyper-Connections",
    "year": 2024,
    "paperDate": "2024-09-29",
    "addedAt": "2026-09-18T12:57:32.897647Z",
    "tags": [
      "Architecture",
      "Residual connections"
    ],
    "summary": {
      "zh": "以可学习的超连接扩展残差连接，调整网络层之间的信息交换方式。",
      "en": "Extends residual connections with learnable hyper-connections that control information exchange across network layers."
    },
    "url": "https://arxiv.org/abs/2409.19606v3"
  },
  {
    "id": "2510.26692v2",
    "title": "Kimi Linear: An Expressive, Efficient Attention Architecture",
    "year": 2025,
    "paperDate": "2025-10-30",
    "addedAt": "2026-09-18T12:55:11.719923Z",
    "tags": [
      "Attention",
      "Architecture"
    ],
    "summary": {
      "zh": "提出结合 Kimi Delta Attention 与潜在注意力的混合架构，研究高效序列建模。",
      "en": "Introduces a hybrid architecture combining Kimi Delta Attention with latent attention for efficient sequence modeling."
    },
    "url": "https://arxiv.org/abs/2510.26692v2"
  },
  {
    "id": "2502.11089v2",
    "title": "Native Sparse Attention: Hardware-Aligned and Natively Trainable Sparse Attention",
    "year": 2025,
    "paperDate": "2025-02-16",
    "addedAt": "2026-09-18T12:54:00.806468Z",
    "tags": [
      "Attention",
      "Long context"
    ],
    "summary": {
      "zh": "将压缩、选择与滑动窗口分支结合，设计面向硬件且可端到端训练的稀疏注意力。",
      "en": "Combines compressed, selected, and sliding-window branches in hardware-aligned sparse attention that supports end-to-end training."
    },
    "url": "https://arxiv.org/abs/2502.11089v2"
  },
  {
    "id": "2412.06464v3",
    "title": "Gated Delta Networks: Improving Mamba2 with Delta Rule",
    "year": 2024,
    "paperDate": "2024-12-09",
    "addedAt": "2026-09-18T12:52:58.567743Z",
    "tags": [
      "Architecture",
      "SSM"
    ],
    "summary": {
      "zh": "将遗忘门与 Delta 更新规则结合，改善线性注意力模型的状态记忆管理。",
      "en": "Combines gating with the delta update rule to improve state-memory management in linear-attention models."
    },
    "url": "https://arxiv.org/abs/2412.06464v3"
  },
  {
    "id": "2412.19437v2",
    "title": "DeepSeek-V3 Technical Report",
    "year": 2024,
    "paperDate": "2024-12-27",
    "addedAt": "2026-09-18T12:52:03.739531Z",
    "tags": [
      "MoE",
      "Training"
    ],
    "summary": {
      "zh": "介绍 DeepSeek-V3 的混合专家架构、FP8 训练以及预训练和后训练流程。",
      "en": "Describes DeepSeek-V3 mixture-of-experts architecture, FP8 training, and its pretraining and post-training pipeline."
    },
    "url": "https://arxiv.org/abs/2412.19437v2"
  },
  {
    "id": "2405.21060v1",
    "title": "Transformers are SSMs: Generalized Models and Efficient Algorithms Through Structured State Space Duality",
    "year": 2024,
    "paperDate": "2024-05-31",
    "addedAt": "2026-09-18T12:49:13.489995Z",
    "tags": [
      "Architecture",
      "SSM"
    ],
    "summary": {
      "zh": "建立状态空间模型与注意力之间的结构化对偶关系，并提出 Mamba-2 架构。",
      "en": "Establishes structured state-space duality between state-space models and attention and introduces the Mamba-2 architecture."
    },
    "url": "https://arxiv.org/abs/2405.21060v1"
  },
  {
    "id": "2405.04434v5",
    "title": "DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model",
    "year": 2024,
    "paperDate": "2024-05-07",
    "addedAt": "2026-09-18T12:48:04.620332Z",
    "tags": [
      "MoE",
      "Inference"
    ],
    "summary": {
      "zh": "介绍结合多头潜在注意力与 DeepSeekMoE 的模型，以降低训练和推理开销。",
      "en": "Describes a model combining Multi-head Latent Attention with DeepSeekMoE to reduce training and inference costs."
    },
    "url": "https://arxiv.org/abs/2405.04434v5"
  },
  {
    "id": "2401.06066v1",
    "title": "DeepSeekMoE: Towards Ultimate Expert Specialization in Mixture-of-Experts Language Models",
    "year": 2024,
    "paperDate": "2024-01-11",
    "addedAt": "2026-09-18T12:47:17.718609Z",
    "tags": [
      "MoE",
      "Architecture"
    ],
    "summary": {
      "zh": "通过细粒度专家划分和共享专家隔离，研究混合专家模型中的专家专业化。",
      "en": "Studies expert specialization in mixture-of-experts models through fine-grained experts and shared-expert isolation."
    },
    "url": "https://arxiv.org/abs/2401.06066v1"
  },
  {
    "id": "2312.00752v2",
    "title": "Mamba: Linear-Time Sequence Modeling with Selective State Spaces",
    "year": 2023,
    "paperDate": "2023-12-01",
    "addedAt": "2026-09-18T12:44:36.003366Z",
    "tags": [
      "Architecture",
      "SSM"
    ],
    "summary": {
      "zh": "通过依赖输入的选择性状态空间与硬件友好算法，实现线性时间序列建模。",
      "en": "Combines input-dependent selective state spaces with hardware-aware algorithms for linear-time sequence modeling."
    },
    "url": "https://arxiv.org/abs/2312.00752v2"
  },
  {
    "id": "2305.13245v3",
    "title": "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints",
    "year": 2023,
    "paperDate": "2023-05-22",
    "addedAt": "2026-09-18T12:43:04.717408Z",
    "tags": [
      "Attention",
      "Inference"
    ],
    "summary": {
      "zh": "通过让多个查询头共享键值头，在多头注意力与多查询注意力之间平衡推理效率。",
      "en": "Shares key-value heads across query groups to balance inference efficiency between multi-head and multi-query attention."
    },
    "url": "https://arxiv.org/abs/2305.13245v3"
  },
  {
    "id": "2302.13971v1",
    "title": "LLaMA: Open and Efficient Foundation Language Models",
    "year": 2023,
    "paperDate": "2023-02-27",
    "addedAt": "2026-09-18T12:41:59.777318Z",
    "tags": [
      "Foundation models",
      "Training"
    ],
    "summary": {
      "zh": "介绍使用公开数据训练的 LLaMA 基础语言模型及其训练与评测方法。",
      "en": "Introduces LLaMA foundation language models trained on publicly available data and describes their training and evaluation."
    },
    "url": "https://arxiv.org/abs/2302.13971v1"
  },
  {
    "id": "2101.03961v3",
    "title": "Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity",
    "year": 2021,
    "paperDate": "2021-01-11",
    "addedAt": "2026-09-18T12:39:23.369013Z",
    "tags": [
      "MoE",
      "Scaling"
    ],
    "summary": {
      "zh": "通过稀疏路由让每个 token 仅使用部分专家，研究 Switch Transformer 的大规模训练。",
      "en": "Studies large-scale Switch Transformers using sparse routing that activates only a subset of experts for each token."
    },
    "url": "https://arxiv.org/abs/2101.03961v3"
  },
  {
    "id": "2205.14135v2",
    "title": "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
    "year": 2022,
    "paperDate": "2022-05-27",
    "addedAt": "2026-09-18T12:38:35.987091Z",
    "tags": [
      "Attention",
      "Systems"
    ],
    "summary": {
      "zh": "利用 IO 感知的分块计算减少显存读写，实现精确且节省内存的注意力。",
      "en": "Uses IO-aware tiling to reduce memory traffic while computing exact attention with less memory."
    },
    "url": "https://arxiv.org/abs/2205.14135v2"
  },
  {
    "id": "2104.09864v5",
    "title": "RoFormer: Enhanced Transformer with Rotary Position Embedding",
    "year": 2021,
    "paperDate": "2021-04-20",
    "addedAt": "2026-09-18T12:35:30.636326Z",
    "tags": [
      "Architecture",
      "Position embeddings"
    ],
    "summary": {
      "zh": "提出旋转位置编码，以旋转变换将相对位置信息融入注意力计算。",
      "en": "Introduces rotary position embeddings that incorporate relative position information into attention through rotations."
    },
    "url": "https://arxiv.org/abs/2104.09864v5"
  },
  {
    "id": "deepseek-ocr",
    "title": "DeepSeek-OCR: Contexts Optical Compression",
    "year": 2025,
    "paperDate": null,
    "addedAt": "2026-09-17T13:46:34.720209Z",
    "tags": [
      "Multimodal",
      "OCR",
      "Compression"
    ],
    "summary": {
      "zh": "探索将长文本渲染为图像再压缩为视觉 token，以减少文档上下文的表示开销。",
      "en": "Explores rendering long text as images and compressing it into visual tokens to reduce document-context representation costs."
    },
    "url": "https://github.com/deepseek-ai/DeepSeek-OCR/blob/main/DeepSeek_OCR_paper.pdf"
  },
  {
    "id": "2511.18437v1",
    "title": "Perceptual-Evidence Anchored Reinforced Learning for Multimodal Reasoning",
    "year": 2025,
    "paperDate": "2025-11-23",
    "addedAt": "2026-09-17T07:38:17.493064Z",
    "tags": [
      "Multimodal",
      "Reinforcement learning"
    ],
    "summary": {
      "zh": "通过感知证据锚定的奖励设计，鼓励多模态推理过程依据视觉证据。",
      "en": "Uses perceptual-evidence-anchored reinforcement learning to ground multimodal reasoning in visual evidence."
    },
    "url": "https://arxiv.org/abs/2511.18437v1"
  },
  {
    "id": "emu3-nature",
    "title": "Multimodal learning with next-token prediction for large multimodal models",
    "year": 2026,
    "paperDate": "2026-01-28",
    "addedAt": "2026-09-17T02:26:49.256663Z",
    "tags": [
      "Multimodal",
      "Generation"
    ],
    "summary": {
      "zh": "将文本、图像和视频统一为离散 token，以单一下一 token 预测目标训练 Emu3。",
      "en": "Trains Emu3 with a single next-token prediction objective over discrete tokens for text, images, and video."
    },
    "url": "https://www.nature.com/articles/s41586-025-10041-x"
  },
  {
    "id": "2511.21631v2",
    "title": "Qwen3-VL Technical Report",
    "year": 2025,
    "paperDate": "2025-11-26",
    "addedAt": "2026-09-16T11:13:56.585311Z",
    "tags": [
      "Multimodal",
      "Long context"
    ],
    "summary": {
      "zh": "介绍 Qwen3-VL 的模型架构、长上下文多模态训练与面向视觉智能体的能力。",
      "en": "Describes Qwen3-VL architecture, long-context multimodal training, and capabilities for visual agents."
    },
    "url": "https://arxiv.org/abs/2511.21631v2"
  },
  {
    "id": "2508.18265v2",
    "title": "InternVL3.5: Advancing Open-Source Multimodal Models in Versatility, Reasoning, and Efficiency",
    "year": 2025,
    "paperDate": "2025-08-25",
    "addedAt": "2026-09-16T08:48:51.335814Z",
    "tags": [
      "Multimodal",
      "Efficiency"
    ],
    "summary": {
      "zh": "结合级联强化学习、视觉分辨率路由与解耦部署，改进多模态推理及推理效率。",
      "en": "Combines Cascade RL, visual resolution routing, and decoupled deployment to improve multimodal reasoning and inference efficiency."
    },
    "url": "https://arxiv.org/abs/2508.18265v2"
  },
  {
    "id": "2503.12937v2",
    "title": "R1-VL: Learning to Reason with Multimodal Large Language Models via Step-wise Group Relative Policy Optimization",
    "year": 2025,
    "paperDate": "2025-03-17",
    "addedAt": "2026-09-16T06:12:09.777349Z",
    "tags": [
      "Multimodal",
      "Reinforcement learning"
    ],
    "summary": {
      "zh": "通过对中间推理步骤提供规则奖励的 StepGRPO，训练多模态模型的逐步推理能力。",
      "en": "Trains step-by-step multimodal reasoning with StepGRPO, which assigns rule-based rewards to intermediate reasoning steps."
    },
    "url": "https://arxiv.org/abs/2503.12937v2"
  },
  {
    "id": "2502.13923v1",
    "title": "Qwen2.5-VL Technical Report",
    "year": 2025,
    "paperDate": "2025-02-19",
    "addedAt": "2026-09-16T05:33:45.208770Z",
    "tags": [
      "Multimodal",
      "Vision"
    ],
    "summary": {
      "zh": "介绍 Qwen2.5-VL 的动态视觉处理、定位能力以及面向图像和视频的训练方法。",
      "en": "Describes Qwen2.5-VL dynamic visual processing, localization capabilities, and training for image and video tasks."
    },
    "url": "https://arxiv.org/abs/2502.13923v1"
  },
  {
    "id": "deepseek-r1-nature",
    "title": "DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning",
    "year": 2025,
    "paperDate": "2025-09-17",
    "addedAt": "2026-09-15T11:53:30.095212Z",
    "tags": [
      "Reasoning",
      "Reinforcement learning"
    ],
    "summary": {
      "zh": "研究通过强化学习激励语言模型推理，并介绍 DeepSeek-R1-Zero、R1 与蒸馏模型。",
      "en": "Studies reinforcement learning for eliciting language-model reasoning and describes DeepSeek-R1-Zero, R1, and distilled models."
    },
    "url": "https://www.nature.com/articles/s41586-025-09422-z"
  },
  {
    "id": "2408.03326v3",
    "title": "LLaVA-OneVision: Easy Visual Task Transfer",
    "year": 2024,
    "paperDate": "2024-08-06",
    "addedAt": "2026-09-15T07:25:01.599944Z",
    "tags": [
      "Multimodal",
      "Transfer learning"
    ],
    "summary": {
      "zh": "提出统一的视觉语言模型训练方案，研究图像、多图和视频任务之间的迁移。",
      "en": "Presents a unified vision-language training approach for transferring capabilities across image, multi-image, and video tasks."
    },
    "url": "https://arxiv.org/abs/2408.03326v3"
  },
  {
    "id": "llava-1-5",
    "title": "Improved Baselines with Visual Instruction Tuning",
    "year": 2024,
    "paperDate": null,
    "addedAt": "2026-09-15T07:24:00.564663Z",
    "tags": [
      "Multimodal",
      "Instruction tuning"
    ],
    "summary": {
      "zh": "通过 MLP 连接器、改进的视觉输入与指令数据，构建 LLaVA-1.5 视觉语言基线。",
      "en": "Builds the LLaVA-1.5 vision-language baseline with an MLP connector, improved visual inputs, and instruction data."
    },
    "url": "https://openaccess.thecvf.com/content/CVPR2024/html/Liu_Improved_Baselines_with_Visual_Instruction_Tuning_CVPR_2024_paper.html"
  },
  {
    "id": "2405.09818v2",
    "title": "Chameleon: Mixed-Modal Early-Fusion Foundation Models",
    "year": 2024,
    "paperDate": "2024-05-16",
    "addedAt": "2026-09-15T06:08:59.526433Z",
    "tags": [
      "Multimodal",
      "Generation"
    ],
    "summary": {
      "zh": "采用早期融合的统一 token 序列，训练可理解和生成交错图文内容的 Chameleon 模型。",
      "en": "Trains Chameleon models on early-fusion token sequences to understand and generate interleaved images and text."
    },
    "url": "https://arxiv.org/abs/2405.09818v2"
  },
  {
    "id": "2409.12191v2",
    "title": "Qwen2-VL: Enhancing Vision-Language Model's Perception of the World at Any Resolution",
    "year": 2024,
    "paperDate": "2024-09-18",
    "addedAt": "2026-09-15T04:55:34.819931Z",
    "tags": [
      "Multimodal",
      "Vision"
    ],
    "summary": {
      "zh": "通过动态分辨率与多模态旋转位置编码，增强 Qwen2-VL 对图像和视频的理解。",
      "en": "Uses dynamic resolution and multimodal rotary position embeddings to improve Qwen2-VL image and video understanding."
    },
    "url": "https://arxiv.org/abs/2409.12191v2"
  },
  {
    "id": "dpo",
    "title": "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
    "year": 2023,
    "paperDate": null,
    "addedAt": "2026-09-14T11:56:59.651206Z",
    "tags": [
      "Alignment",
      "Preference optimization"
    ],
    "summary": {
      "zh": "将偏好学习写成直接优化语言模型的分类目标，省去单独训练奖励模型的步骤。",
      "en": "Reformulates preference learning as a classification objective that directly optimizes a language model without separately fitting a reward model."
    },
    "url": "https://proceedings.nips.cc/paper_files/paper/2023/hash/a85b405ed65c6477a4fe8302b5e06ce7-Abstract-Conference.html"
  },
  {
    "id": "2304.08485v2",
    "title": "Visual Instruction Tuning",
    "year": 2023,
    "paperDate": "2023-04-17",
    "addedAt": "2026-09-14T11:56:00.492359Z",
    "tags": [
      "Multimodal",
      "Instruction tuning"
    ],
    "summary": {
      "zh": "将视觉编码器与语言模型连接，并用生成的视觉指令数据训练 LLaVA 助手。",
      "en": "Connects a vision encoder to a language model and trains the LLaVA assistant with generated visual instruction data."
    },
    "url": "https://arxiv.org/abs/2304.08485v2"
  },
  {
    "id": "blip-2",
    "title": "BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models",
    "year": 2023,
    "paperDate": null,
    "addedAt": "2026-09-14T11:53:37.760155Z",
    "tags": [
      "Multimodal",
      "Efficiency"
    ],
    "summary": {
      "zh": "通过两阶段训练的 Q-Former 连接冻结的视觉编码器与语言模型，实现高效视觉语言预训练。",
      "en": "Bridges a frozen image encoder and language model with a two-stage-trained Q-Former for efficient vision-language pretraining."
    },
    "url": "https://proceedings.mlr.press/v202/li23q.html"
  },
  {
    "id": "instructgpt",
    "title": "Training language models to follow instructions with human feedback",
    "year": 2022,
    "paperDate": null,
    "addedAt": "2026-09-14T11:50:41.519146Z",
    "tags": [
      "Alignment",
      "Reinforcement learning"
    ],
    "summary": {
      "zh": "通过监督微调、人类偏好奖励模型与强化学习训练 InstructGPT，使语言模型更好地遵循指令。",
      "en": "Trains InstructGPT with supervised fine-tuning, a human-preference reward model, and reinforcement learning to improve instruction following."
    },
    "url": "https://papers.nips.cc/paper_files/paper/2022/hash/b1efde53be364a73914f58805a001731-Abstract-Conference.html"
  },
  {
    "id": "flamingo",
    "title": "Flamingo: a Visual Language Model for Few-Shot Learning",
    "year": 2022,
    "paperDate": null,
    "addedAt": "2026-09-14T11:49:58.114109Z",
    "tags": [
      "Multimodal",
      "Few-shot learning"
    ],
    "summary": {
      "zh": "连接预训练视觉与语言模型，使 Flamingo 能从交错图文示例中进行少样本学习。",
      "en": "Connects pretrained vision and language models so Flamingo can learn from a few interleaved visual and textual examples."
    },
    "url": "https://papers.nips.cc/paper/2022/hash/960a172bc7fbf0177ccccbb411a7d800-Abstract-Conference.html"
  }
];
