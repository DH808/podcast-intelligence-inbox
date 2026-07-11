# Latent Space — Why AI Infrastructure must evolve for Agent Experience（Modal CTO Akshat Bubna）中文深度纪要

- **来源**：Latent Space / YouTube + Podcast RSS
- **标题**：Why AI Infrastructure must evolve for Agent Experience — Akshat Bubna, Modal CTO；YouTube 标题为 *The 100,000 Sandbox Problem — Akshat Bubna, Modal CTO*
- **URL**：https://www.youtube.com/watch?v=UwxxlTNPjWo；https://www.latent.space/p/modal2026
- **发布时间**：2026-07-08
- **Source boundary**：第三方 YouTube 字幕派生稿（ytbtranscript.com）。本环境中 `youtube-transcript-api` 被 YouTube IP/bot 阻断，`yt-dlp` 要求 sign-in/cookies；未伪造 transcript。字幕存在 ASR/专名误识别：Modal 被多次转写为 Moto/Modto，Akshat 可能被写成 Ashhat，Ramp/Runway/Suno/Cognition 等专名需按上下文校正。
- **本地材料**：timestamped transcript `[podcast-archive]/2026-07-09/LatentSpace_Modal_Akshat/transcript_timestamped.txt`；原始 JSON `[podcast-archive]/2026-07-09/LatentSpace_Modal_Akshat/ytbtranscript_raw.json`

## 为什么这期对 投资研究用户 有价值（短导读）

这期不是泛泛谈“AI agents”，而是把 **agent-native cloud / AI cloud primitives** 拆到很底层：Kubernetes 为什么不适合 bursty AI workloads；Modal 如何从 serverless runtime 走到 elastic inference、GPU snapshotting、sandboxes、multi-node training、private IPv6/RDMA、batch tier、auto endpoints；以及为什么 Modal 把 SDK 团队从 **developer experience（DX）** 转向 **agent experience（AX）**。对 AI infra 投资判断的核心信息是：Modal 试图成为“跨 17 个云/NeoCloud 的 supercloud 软件层”，资本开支轻、差异化放在调度/可靠性/弹性/开发与 agent 操作界面，而不是自建数据中心。它服务的需求不只 LLM inference，还包括音频/视频/机器人/computational bio/custom model inference/post-training/production agents，因此是观察 AI infra 第二层价值捕获的一个高信号样本。

---

## 00:00–08:40 起源：从更好的 runtime / self-provisioning infrastructure，到从 DX 转向 AX

开场先给出本期核心命题：Akshat 说 Modal 已经把 SDK team 的目标从 **developer experience** 改成 **agent experience**。他认为过去 DX 的收益同样适用于 AX：为什么要让 agent 去读几百个 Kubernetes 文件、写没有类型约束的 YAML？如果 agent 只需要改几行 decorator，就能拿到一个 self-provisioning runtime，并且实时看到自己改动的效果，这对 agent 更自然。

主持人回到 Modal 起源：Modal 一开始不是“GPU inference company”。Akshat 说他最初通过投资人认识 CEO Erik。Erik 当时思考的是为什么 workflow orchestration 产品这么难用：因为你必须跑在 Kubernetes 上；Kubernetes 难管理，不适合 burstiness / custom images，开发体验也差。早期 Modal 的想法是：如果能做一个更好的 runtime，它本身就是一个很有用的 primitive。Serverless functions 能覆盖 ETL、job queues、bursty processing——几乎每家公司都有这类需求。Modal 同时把 runtime 看成可以承载一系列垂直产品的基础层：最初可能是 data engineering，但当时也已经在想 inference，只不过那时更多是 classical inference，如 computer vision、XGBoost 等。Modal 在 ChatGPT 出现前一年就给产品加了 GPU，只是当时没有意识到这会变成如此大的事。

Akshat 把早期问题归纳为两点：第一，现有 tooling 没有真正为极佳的 developer experience 设计；第二，Modal 看到很多 workload 是“compute heavy”——需要更多资源、需要快速 scale up/down，而 Kubernetes 更像为 web servers / slow scaling 设计。AI/数据 workload 还会需要不同 accelerators、不同 images、不同环境，这在公司之间反复出现。

主持人提到“software-defined infrastructure / self-provisioning infrastructure”的概念：把 infra 配置放在 decorator 里，和代码 colocate。Akshat 说这一直很重要，因为 Modal 不希望用户把大量时间花在写 YAML 上。Decorator 把用户要做的事压缩到很小的 surface area，放进代码里，让 infra 配置像普通代码一样可以被操作、表达和动态化。

对 lock-in 的问题，Akshat 的回答是：Modal 的 DSL 只是配置层——你用什么硬件、如何 scale，但用户仍然拥有自己的业务代码。这一点到现在做 inference 仍然是他们叙事的重要部分。

主持人进一步问：如果今天构建，DevX 还重要吗？现在可以让 Claude Code / Codex 之类 agent 直接实现工具。Akshat 的回答是 Modal 已经把团队改为思考 AX；DX 的好处仍然适用于 AX。一个 agent 不该去翻 Kubernetes YAML，而是应该通过 decorator 改少量代码，拿到自我 provision 的 runtime，并看到行为变化。Modal 从客户那里看到：agent 在 Modal 上操作，比在其他 substrate 上快很多。

一个反向观点是“没人再看代码了，所以把 infra requirements colocate 到代码也许没意义”。Akshat 说即便人不怎么看代码，**observability** 仍然非常重要，甚至比直接读代码更重要。Modal 会把很多 observability 推到 CLI，让 agent 自己调查问题，但人仍需要解释发生了什么、做 judgment calls。换言之，agent-native infrastructure 不只是“给 agent 写代码”，还要让 agent 和人都能观察、调试、判断。

在 Modal 的定位上，Akshat 给出的定义是：Modal 是一个为 AI applications 从头构建 primitives 的 cloud platform，目前覆盖 inference、training、batch processing、sandbox workloads，还会继续扩展。主持人注意到他没有说 web server。Akshat 明确：Modal 不试图和 Render 这类 always-on web hosting 竞争；Modal 的差异在于那些需要 specialized compute、需要大幅 scale up/down、形状不同的 workloads。

---

## 08:40–16:45 与 AI startup 共建 primitives：Cognition、sandboxes、elastic inference、100,000 sandboxes

主持人认为 Modal 很多能力是在和前沿 startup 一起构建。Akshat 同意：Modal 团队小、移动快，工程师会直接和客户一起摸索需求。例如 Cognition、Decagon、Ramp 等客户都在与 Modal 共同创新。主持人提到他在 Cognition 第一天就看到有人穿 Modal 衣服，像是 Modal 的人嵌入到了 Cognition。Akshat 说那是 Payton，因为否则沟通 latency 太高，所以干脆把人派过去。这是一个很具体的 operating mechanism：Modal 不是纯 self-serve cloud，而是在高价值前沿客户侧低延迟迭代 primitives。

主持人回忆自己 3 年前做 small developer，需要 bursty compute，试用 Modal 体验不错，甚至因为 Hacker News 流量 spike 上了 Modal 董事会数据。Akshat 说当时主持人的 small developer 其实用 Modal functions 来跑东西，是个好 use case；主持人称之为 “proto-Cognition”。同一时期（2023 年），Modal 也在和很多客户讨论 sandboxing，2023 年 5 月就做了 sandboxes，在市场还没意识到 agent sandbox 会成为大需求前，就发布了把 small developer 放进 loop 里的例子，让 agent 可以迭代自己。

主持人指出 2023 年模型还没为这些能力做好准备：post-training 不理解 loop/self-correction，tool calling 也不够好，模型迭代 10 次后就会发散。回头看，正确路径似乎是把失败收集成 benchmark，再构建 RL environment，甚至可以卖给大公司；但当时很难有足够 conviction 预测模型会变好这么多。

Sandboxing 早期没有立即爆发，而是沉寂了一两年。主持人举例：一个 hackathon 上有人想跑一个没有托管的小模型，Modal 可以 spin up GPU sandbox，丢 Hugging Face link，demo 几天后冷启动回来。这种“instant hosting / spin up / spin down / stay cold”的价值今天仍然存在。

Akshat 说今天 workload shape 已经变化很大：Modal 服务很多大规模生产客户，不再只是从 0 scale 到 1，而是要在某个 region 内很快从 1,000 GPUs scale 到 1,500 GPUs。本质还是同一种形状问题：弹性、区域性、突发。

谈到 Cursor Composer / RL / inference gym 一类 workload，主持人问：是不是每隔几小时做 RL on model，需要每小时几千 GPU scale up/down？Akshat 先退一步说 Modal 今天最大的 use case 是 **elastic inference**，最早找到 PMF 的是 **custom model inference**。Modal 有意避开纯 LLM API 战场，服务的公司包括：Suno（音频）、Runway（视频）、robotics 公司、computational biology 公司等。这些公司在别处训练自己的模型，但用 Modal 做 deployment：把模型作为 black box 部署，并随着 traffic pattern 变化扩展到所需 GPU 数量。

这些客户的 traffic pattern 非常不可预测：某家公司发布新品/launch，一天需要的量会暴增；它们不是只部署一个模型，而是很多模型、很多 region，不同 region 的周期还错开。因此 autoscaling 变得复杂。Akshat 强调 Modal 专门深挖 autoscaling，因为并非所有 inference providers 都能真正 autoscale。Modal 还把 **GPU snapshotting** 做进产品：可以 snapshot GPU state，例如 Torch compiler 后的模型状态，让下一次 cold start 快很多。

在 workload 类型上，Akshat 区分：inference 需要 burstiness；on-demand training / RL rollouts 也 bursty；batch jobs 也 bursty，例如正式训练前需要几千 GPUs 做 encoding。Agents 平时未必那么 bursty，但 **sandboxes 在 RL 时极其 bursty**。他给出关键数字：做 rollouts 时，有时需要 **100,000 sandboxes**。

主持人问 continual learning 会不会成为新 workload。Akshat 说 Modal 的一些 frontier 客户在用 Modal primitives 做有趣尝试，包括 continual learning；但 Modal 还在观察这种需求会如何演化，等更成熟后可能成为产品能力。

---

## 16:45–24:20 深入 LLM inference：DeFlash、speculative decoding、Auto Endpoints、生产级 inference 的真实难点

主持人问 sandboxing 之后 Modal 加的下一个 primitive。Akshat 说是更深入 LLM inference。原因是 Modal 在 autoscaling、跨 region 等方面的优势在别处不明显；但 Modal 原本在 model layer 只是 black box。他们意识到通过组建强团队，可以做到 frontier-level model performance，并把很多工作开源。

他重点提到 **DeFlash**：一个 block-based speculator，并已开源。Akshat 称使用开源 DeFlash 可以达到 proprietary providers 的性能水平。主持人让他解释 speculative decoding。

Akshat 的解释很清楚：speculative decoding 用一个更小的 draft model 先预测后续 tokens，再用大模型验证。速度提升来自于：逐 token 生成时通常受 memory bandwidth 限制；如果能把 draft tokens 的验证 batch 起来，compute 利用率更高，速度更快。只要 draft model 预测出的 token 被接受的长度（accept length）足够大，就能获得原模型速度的数倍提升。相较之下，把 kernel 做快通常只带来几个百分点 improvement；提高 accept length 则是 2–4x 量级的乘法收益。质量不下降，因为最终永远由大模型验证，不接受错误 token。

Modal 的 DeFlash 是 block-based speculator，不是一次预测一个 token，而是预测 block。他们下一步要帮助客户为 custom models 训练 speculators。传统上这类事情很依赖 FTE / support deployed engineer：需要人和客户一起做。Modal 的愿景是把 frontier-level performance 做成人人可用的自助能力，所以推出 **Auto Endpoints**。

Auto Endpoints 的定位是：有些用户并不想从代码入手，只想先得到一个可用 endpoint，具备 Modal 的性能和 scale。Modal 允许用户从 UI 或 CLI 创建 endpoint，内置 DeFlash 等优化，同时又保持透明：把代码给用户，用户可以自己运行；如果更成熟，也可以 eject 到完整 Modal experience，自己 tweak models、fine-tune 等。下一步是随着用户数据分布变化，让 draft model 自动演化，而不是每次找人支持。

主持人问：如果用户自己拿 GLM 之类开源模型、用 vLLM/SGLang、找同样价格容量的 compute，Modal 额外提供什么？Akshat 的回答分几层：第一，Modal 开源并 upstream 自己的贡献，和 SGLang 团队合作，希望 improvements 在 Modal 外也可用；第二，Modal 有专业团队，如果客户的 workload 还没有现成优化，Modal 能先帮客户做到性能；第三，也是最重要的，Modal 的 endpoint 更 elastic，有真正 scale-to-zero 和 true burstiness。实践中，客户关心的不只是找到 GPU 并跑模型代码，而是生产级 inference：tail latency 控制、每个 request 至少送达一次、弹性扩展、可靠性等。

主持人问 Modal 会不会不断进入别人的 turf。Akshat 的边界回答是：Modal 会跟随用户，让用户得到一个能良好协同的平台；现在聚焦在 **model lifecycle** 和 **agent lifecycle** 两条线：从 data prep 到 training 到 inference；以及部署 background agent 时所需的 sandbox、persistent storage 等。Ramp 的 Inspect 是一个成功 background agent 的例子，因为它能使用 snapshotting 和 fast scaling，让产品感觉 reactive 且运行良好。

---

## 24:20–34:15 资本轻的 supercloud：17 个 cloud providers、NeoCloud reliability layer、私有 IPv6、sidecars、RDMA 与 serverless multi-node training

主持人提到 Jensen GTC keynote 中所谓 **inference inflection**：过去 AI/ML workload 可能是 GPU:CPU 约 8:1；现在因为 agents 会阻塞、调用 CPU-heavy 任务，实际限制因素在 GPU 和 CPU 之间来回切换，更像 1:1，需要把东西 colocate。Akshat 说这正是 Modal 的吸引力之一：Modal 建了跨 **17 个 cloud providers** 的 capacity pool，擅长在全球各种 cloud capacity 上运行 workload。

Modal 不自建数据中心，而是跨很多 NeoClouds 和 providers 运行。主持人追问什么时候该自建。Akshat 说 Modal 的差异在软件层；保持 capital light、专注软件层让他们移动快。目前外部有很多人在建 data centers，Modal 能和他们合作，把精力放在自己特殊的地方。

17 个 provider 也意味着可靠性差异。Akshat 说 NeoCloud 比大家想象多，而且可靠性水平不同；Modal 投入很多时间在上面构建自己的 **reliability layer**。如果 GPU falls off the bus 或 provider 出问题，用户 workload 不受影响。这让 Modal 能使用比单个用户直接使用更多、更分散的 capacity。主持人把它概括成 “super cloud of all clouds”，Akshat 同意这是想法。

区域性/colocation 也是需求来源：用户会指定 CPU/GPU 位置，比如 EU / US，原因可能是 data locality 或 latency。Agent workload 越来越多地需要文件系统、CPU、GPU、网络等 colocation。Akshat 把 Modal 底层抽象为 compute、storage、networking，然后围绕用户需要构建。

网络层新需求之一是 sandboxes。Modal 的 sandboxes 支持 **sidecar**：一个 sandbox 实际上可以是多个 containers 的 pod，类似 Docker Compose。用户需要控制 sandbox 的 outbound networking：例如运行 man-in-the-middle proxy 来记录 RL 行为、控制 egress 到哪些 domain、注入 credentials 等。Modal 为此构建了很多自有能力。

另一个 emerging need 是多个 node 上的 sandboxes 互相通信。Modal 支持在 sandbox 中暴露 tunnel，可以暴露 public internet，也可以加 HTTP auth layer。更底层的是 **I6PN**（ASR 可能为专名误写）：一个使用 IPv6 address 的 overlay network。开启后，同一 workspace 内 Modal containers 可以用 private IPv6 address 互相访问，外部不能访问。这个 private networking 最初是为 distributed training product 做 primitive：用户给 function 加 decorator，就得到一个 GPU cluster，有 RDMA networking，可以跑真正 serverless 的 distributed training job。后来用户发现 TCP overlay network 本身也能用于别的用途，甚至有些能力不在 docs 里也被用户找出来用了。

Akshat 澄清 private IPv6 overlay 是 TCP overlay network，用于做 RDMA 前的 key exchange；真正 RDMA 用来绕过 TCP networking stack，在 node 间更快传输。主持人联想到 RDMA、KV cache、training GPUs 到 inference GPUs 的 weights 迁移、RL 中的 memory movement / scheduling，本质都是 systems problem。Akshat 说 Modal 多节点训练不是针对超大规模 pretraining，而是针对较小规模 post-training，例如对 medium-size Qwen models 做 post-training，以提升 inference 质量。这类任务很适合 Modal。

另一个 use case 是即便公司有大 cluster，researchers 仍然需要做小 runs；在这种研究探索里，弹性比固定大集群更重要。Akshat 还提到 Modal 内部的 training / inference 团队也在用类似 auto research：有个内部 repo 叫 **auto inference**，自动化了原本 FTE 的工作。Agent 会 spin up 一系列 sweep，运行 Nvidia profiler，tweak configs，甚至把 GPU 从 H200 换成 B200，找到合适配置，效果不错。

---

## 34:15–41:50 Auto research、Modal Bench、compute strategy 与 batch tier：AI infra 的“tokconomics”

主持人追问 auto research：这是一层高于普通训练的抽象，还是 AI-driven hyperparameter search？Akshat 说他看到的还不到 neural architecture search 的 architecture 层面，更多是模型直觉引导的 hyperparameter sweep，比传统 sweeper 更有效。问题最终是把 compute 花在哪里。

这自然连接到 agent 自己 spin up infrastructure。主持人问 LLM 生成 Modal code 的能力如何。Akshat 说现在出人意料地好，Claude 4 之后能 one-shot 很多 Modal code。Modal 正在考虑发布 **Modal Bench**，覆盖 LLM 还做不好的 harder things。例子是：agent 不太会在没有正确 guidance/skill 的情况下使用完整 observability；当东西失败时，如何看 logs、如何改对的东西，这种 reasoning 仍难。Modal 因此有一个 Modal skill，用 Modal Bench 找出这类缺口，再在 skill 或 product surface 中弥补。

供给侧，主持人问 Modal 是否面临 GPU/CPU/memory shortage。Akshat 说增长很快，因此必须更主动地做 capacity planning。Modal 有一个叫 **compute strategy** 的角色/团队；这不只是 FP&A，而是大量金融与 supply chain 问题：一年 vs 三年 reservations 的组合、如何预测自有 capacity、因为 capacity 在不同 GPU types 和 regions 之间可替代，需要建模；还要判断 supply chain 如何演化，然后据此下注。主持人把这戏称为 “tokconomics”，并类比航空公司 fuel hedging：比如 Southwest 曾因燃油对冲做对而成本显著低于同行。

Akshat 说 compute business 的一个核心就是 capacity management。做好它既能有更好的 unit economics，也能给客户释放更多价值。例如 Modal 正在做一个 **batch tier**：如果客户不关心 latency，可以用更便宜的价格，结果可能在未来 24 小时内返回。Modal 能提供这些 lever，是因为控制了整个 stack 和 scheduling。Akshat 观察这类需求不主要来自 LLM，虽然 evals / synthetic data prep 有时适用；更多来自 non-LLM 公司，例如 computational biology，需要跑很大的 batch jobs，但不在乎准确什么时候完成。

---

## 41:50–48:05 下一阶段产品：post-training + open model inference、实时音视频 regional routing、agent hard guardrails、Modal 在 foundation labs 之外的位置

主持人问 Modal 下一阶段是什么。Akshat 说 Modal 的方向仍是构建 primitives，让用户生活更容易。对 LLM inference，他判断未来会有成千上万家公司 post-train 自己的模型，并部署 open-source models 做 inference。Modal 因此思考最佳产品形态：从 training gym 到 endpoints，给出无需联系人工即可达到 frontier-level performance 的体验。

其他 verticals 的形状不同。例如 real-time audio/video 需求在增长，Modal 在做 regional routing with fallbacks，让 GPU 尽可能靠近用户，以降低 video streaming 等场景 latency。Agent 侧变化太快，Modal 仍需和客户紧密工作；在 sandboxes 和 persistent file systems 之外，production agents 还需要很多 stack 组件，Modal 在思考哪些适合进入平台。

主持人提出一个更抽象的问题：传统 cloud 的 principal components 是 compute/storage/networking；agents 是否需要新 permission level？例如 Claude Code 的 dangerously skip permissions、allow list by command，甚至 LLM-mediated permission。Akshat 对 **LLM-mediated permission** 持怀疑态度，尤其在 sandbox level；他认为仍需要 **hard boundaries**，可以配 softer guardrails，但不能只让 LLM 当 kernel/权限裁判。主持人故意推到极端：如果未来 LLM OS 的 kernel 就是 LLM 呢？Akshat 仍坚持：对于需要边界的东西，硬 guardrails 永远需要。

谈到 managed agents（Gemini、OpenAI、Claude 等），主持人指出它们对 Modal 有用，但也可能进入 Modal 空间。Akshat 的立场是：Modal 很高兴和 Anthropic 等 foundation labs 合作。Managed agent 很适合开始构建 agent；但当你要做更 production-grade 的东西，例如 Ramp 那样的内部/外部 accounting agent，就需要更强控制：agent 访问的文件如何处理、如何 snapshot/restore、如何控制 networking、是否需要 GPUs 等。到这个阶段，公司会需要 specialized sandbox provider，而 Modal 试图扮演这个角色。至于 harness 运行在哪里——在 cloud managed agent 里接 Modal sandbox，或 harness 本身跑在 Modal sandbox——Modal 不强设观点，会看市场收敛。

主持人问各种 meta harness / pseudo agent cloud（OpenAI、Vercel、Databricks Omnien 等）。Akshat 没有深入评价，只说只要这些东西消耗更多 infra，对 Modal 都是 bullish；Modal 专注 infra layer，因为这是相对能力所在，也是难题。

---

## 48:05–53:05 Modal 的非 LLM 暴露：drug discovery、robotics、model API vs product backend、custom architectures

主持人感叹：这是 infra 领域最令人兴奋的时期之一，过去 data infrastructure 很难让人兴奋，如今因为 AI scale，大家重新关注。Akshat 同意，原因是这些系统需要巨大 scale。

主持人请 Akshat 展望。Akshat 说，大家过度谈 LLM inference，但 Modal 还服务很多 drug discovery / computational bio 公司，例如 Chai Discovery 一类；也服务很多 robotics 公司，机器人已经在 active deployments 中取得不错结果。这提示 Modal 的 primitives 不只押 LLM，也在音频、视频、生物、图像、机器人等领域分散。

主持人问 Modal 是否会有 air-gapped/on-prem 版本。Akshat 明确：没有，Modal cloud-only。主持人总结：因为 Modal 专注 primitives，好的 primitives 会自然找到多种 use cases，也让 Modal 不完全依赖 LLM inference。Akshat 同意，Modal 的目标不是只服务 LLM first 市场。

谈到 Replicate 这类“模型 API marketplace/hosting”的对比，Akshat 说 Modal 一直避免只提供 model API，因为那容易服务 hobbyist 市场，粘性低。Modal 更想服务正在构建产品、需要比 API 更多灵活性的公司。Modal 的例子不是“启动模型，给你 API token”，而是给代码，用户可以 tweak。

主持人追问：何时从“只是 API wrapper”变成真正 product？Akshat 说有 selection effect：愿意深入代码层的公司往往在构建更差异化产品。例如早期一些客户会构建自己的 post-training frameworks，Ramp 甚至训练过自己的 tokenizer、替换 LLaVA tokenizer（他不说那一定成功）。更好的例子是某些公司有完全 custom model architecture，因此必须在代码层调整，不能只靠通用 API。主持人延伸视频模型：未来视频可能不是单个 video model，而是由一个更强的 language-model backbone / agent 编排多个 video tools/code 来生成更长视频。Akshat 说 Modal 最近确实看到一些公司使用 GPU sandboxes 做 video manipulation / editing agents；他之前没把这和 video production 完整串起来，但方向合理。

---

## 53:05–58:55 CI、GitPod/Runner、语言栈与最后的 AX 命题

主持人让 Akshat 评论 GitPod（后来 rebrand 到 Ona/Owner，ASR 可能有误）以及类似 CI/CD / cloud dev environment 公司。Akshat 说 Modal 对 CI 市场也很 bullish，因为 coding agents 越多，就会运行越多 CI；CI primitives 可以更好。最高优先级问题之一是 CI 中大量时间浪费在准备 artifacts、dependencies 等。Build systems 有帮助，但如果有 memory snapshot/restore 等 primitive，就能更高效运行 CI。这本质也是一种 on-demand compute，仍需要 Modal 这类平台能力。

主持人提到 GitPod/Ona 团队加入 OpenAI 后，可能构成很强的 Codex Cloud。他把这类“给 agents 自己的 cloud / secure boundaries / networking”与 Modal 类比。Akshat 的判断是：这些团队可能没有在正确时间切入正确市场；Modal 也有运气成分，因为 agentic use case 真的起飞，而且更偏 runtime sandbox，而不是 build-time sandbox。主持人总结成：build-time sandboxes vs runtime sandboxes，结果 runtime 更好。Akshat 补充，runtime sandbox 的配置 surface 不同，包括如何配置 images、attach storage 等。

语言栈方面，Modal 最初选 Python SDK，因为 data/ML 人群使用 Python。现在 Modal 有 Go 和 TypeScript SDK，runtime 与语言无关（底层不是绑定 Python）。但 inference/training 仍然很 Python；agent 相关使用 TypeScript SDK 更多，因为很多 agent product 并不直接做 ML。Akshat 不认为短期需要支持更多语言，因为 Python 和 TypeScript 仍然主导。主持人戏称“世界上最后两门语言”，又补充 English/prompting。

最后主持人回到核心问题：Modal 曾经是押注 developer experience，现在 pivot 到 agent experience；是否仅靠更好的 agent experience 就能构建完整公司/独角兽？Akshat 回答：AX 是 Modal identity 的重要部分，但不只是“agent 如何使用 CLI”这种战术问题，还包括：spin up 新服务有多容易、从想法到 production 的 iteration time 有多短。实践中这对用户很重要，而且随着人们构建速度变快，减少 overhead 会持续重要。

主持人问 AX 和 DX 是否有本质差异。Akshat 倾向于两者相似度很高，但 Modal 的变化是：用 Modal Bench 观察 agents 缺什么；如果 agent 反复想要某个能力、甚至 hallucinate 某个 feature，这就是 product feedback，Modal 可能真的把它做成 CLI 或产品 surface。过去 logs/metrics 只在 UI 中，现在也迁移到 CLI，让 agent 能访问。这就是 AX 产品化的一个具体例子。

---

## 投资研究摘记：需要跟踪的验证点

1. **Modal 的价值捕获层级**：它不自建数据中心，而是跨 17 个 providers 做软件层调度、可靠性、弹性、observability、developer/agent interface。需要跟踪：gross margin 是否能在 NeoCloud 上游价格波动下维持；capacity strategy 是否形成类似“云燃油对冲”的优势。
2. **客户分布是否真正非 LLM 多元化**：Suno/Runway/robotics/comp bio/custom model inference/post-training/agents 都是好叙事，但需验证收入集中度、头部客户与用例留存。
3. **AX 是否成为独立购买理由**：Akshat 认为 agent 更需要 decorator/self-provisioning runtime/CLI observability，而不是 Kubernetes YAML。需要观察：coding agents 与 production agents 增长是否直接拉动 Modal sandboxes、CI/runtime workloads。
4. **Elastic inference vs generic GPU rental**：Modal 把差异放在 scale-to-zero、burstiness、tail latency、request delivery、GPU snapshotting、regional routing、Auto Endpoints。需要比较 Fireworks、Together、BaseTen、Replicate、RunPod、Lambda、CoreWeave/NeoCloud 自有软件层。
5. **100,000 sandboxes / RL rollout 是否成为真实大市场**：如果 RL for agents/post-training 持续增长，sandbox burstiness 是非常具体的 infra demand；若 agent training 路径变化，这部分需求可能低于叙事。
6. **Security/permission 边界**：Akshat 明确反对纯 LLM-mediated permissions，强调 sandbox hard boundaries。对 enterprise agents 来说，这可能是 Modal 与 managed-agent labs 的合作/分工边界。
