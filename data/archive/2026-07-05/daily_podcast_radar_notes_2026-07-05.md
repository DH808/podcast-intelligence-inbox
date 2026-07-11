# 2026-07-05 投资 / AI 播客雷达 — 中文深度纪要

说明：本次按“深度纪要 = 高质量还原原文主要问题和观点”的标准制作；主文不压缩成泛泛摘要，尽量保留主持人的问题、嘉宾的回答路径、例子、数字、机制、限制条件和转场。广告与片尾仅作边界说明，不展开。

## 今日新增高信号播客/YouTube：2 个

1. **Intelligence on the Edge: Liquid AI's Ramin Hasani on the Search for Device-Native Foundation Models**  
   - 来源：The Cognitive Revolution / AI Builders, Researchers, and Live Player Analysis  
   - URL：https://www.cognitiverevolution.ai/intelligence-on-the-edge-liquid-ai-s-ramin-hasani-on-the-search-for-device-native-foundation-models/  
   - 发布时间：2026-07-03 22:14 UTC  
   - 为什么对 投资研究用户 重要：这期直接对应 AI infra / edge AI / model architecture / hardware-software co-design。Ramin Hasani 解释 Liquid AI 从 MIT CSAIL 的 liquid neural networks 到 Automated Foundation Model Design（AFMD）、LFM/LFM2、on-device foundation models 的路径，并给出 Shopify、Mercedes-Benz、mobile/PC dark compute、NVIDIA Nemotron/NIM 等商业与硬件层面的判断。
   - Source boundary：官网页面提供 **自动生成 transcript**；已归档网页、timestamped transcript、plain transcript、metadata。自动转写可能存在人名/术语误识别（如 Hasani/Hassani、Nemotron/NIM、Android/Aluminum OS 等），关键名词需回听或交叉验证。

2. **20VC: Open Models vs Frontier Models: Who Actually Wins? ... with Clay Bavor, Co-Founder of Sierra**  
   - 来源：20VC / The Twenty Minute VC  
   - URL：https://thetwentyminutevc.libsyn.com/20vc-open-models-vs-frontier-models-who-actually-wins-the-100000-token-budget-every-engineer-will-need-why-forward-deployed-engineers-are-the-future-of-enterprise-ai-with-clay-bavor-co-founder-of-sierra  
   - 发布时间：2026-07-04 07:07 UTC  
   - 为什么对 投资研究用户 重要：Sierra 是高估值企业 AI agent 公司，描述称估值约 $15.8B、融资 >$1.5B、投资方含 Sequoia / Benchmark / Greenoaks / GV / Tiger Global、服务 >40% Fortune 50、超过 $150M ARR；议题覆盖 open vs frontier models、token budget、forward-deployed engineering、enterprise AI go-to-market。
   - Source boundary：RSS/Libsyn 页面未发现官方文字 transcript；音频已下载并完成本地 ASR（faster-whisper base.en / CPU / int8）。ASR 可能误识别人名、产品名、数字与断句；但已保存音频、timestamped transcript、plain transcript 和 metadata，便于回听校验。

---

# Intelligence on the Edge: Liquid AI's Ramin Hasani — 中文深度纪要（原文高保真还原版）

## Source boundary / 本地归档

- Source：The Cognitive Revolution 官网 episode page + 官方网页自动生成 transcript。
- Transcript status：official_web_auto_generated_transcript（网页标注：automatically generated；可能有 wording / speaker identification errors）。
- 本地路径：
  - Markdown：`[podcast-archive]/2026-07-05/daily_podcast_radar_notes_2026-07-05.md`
  - 原始网页：`[podcast-archive]/2026-07-05/cognitive/page.html`
  - Timestamped transcript：`[podcast-archive]/2026-07-05/cognitive/transcript_timestamped_web.txt`
  - Plain transcript：`[podcast-archive]/2026-07-05/cognitive/transcript_plain_web.txt`
  - Metadata：`[podcast-archive]/2026-07-05/cognitive/metadata.json`

## 一句话定位

Ramin Hasani 的核心论点不是“更小模型一定替代 frontier models”，而是：**大规模 transformer 仍适合极大、极通用、低偏置的能力上限；但在手机、车、工厂传感器、机器人、边缘设备、低延迟/低能耗场景里，架构、gating、硬件在环搜索、kernel/post-hoc 优化和本地 orchestrator 会变成新的效率层与商业控制点。**

---

## 00:00–16:58 Liquid AI 的来源：从 MIT CSAIL、液态神经网络到“更小格式承载更多智能”

**主持人 Nathan 的开场问题：**  
Nathan 说自己长期关注 Liquid AI：一方面是其 MIT 时期形成的 alternative architecture，另一方面是过去几年公司从科研走向客户与商业化。他请 Ramin 先讲 Liquid AI 的“broad story”：公司如何走到今天，以及今天的 mission 是什么。

**Ramin 的回答路径：**  
Ramin 先把 Liquid AI 的起点放在 MIT CSAIL。公司约 **3.5 年前** spin out，但技术线索在公司成立前约 **10 年** 就开始。他说他们在 MIT 的 objective function 一直是：**maximize the amount of intelligence into smaller format of algorithms**，也就是用更小的算法格式容纳更多智能。因此“efficiency”不是后加的商业口号，而是研究的 cornerstone。

他解释，最初的问题来自 robotics / real-world systems：如果要把模型放到机器人、自动车、无人机、实体世界设备上，就不能假设都有云端大 GPU，也不能只依赖 billions of parameters。Liquid neural networks 的目标是让模型直接跑在 **CPU、NPU 或小型 GPU** 上，同时尽量达到更大 AI 系统的 reliability。

**为什么强调 out-of-distribution generalization：**  
Ramin 说，进入 real world 后 distribution shift 会非常快发生。自动车、飞行 drone、固定机器/设备进入开放环境时，会迅速遇到训练分布外的输入。人类和动物作为 natural learning systems 很擅长处理这种变化；Liquid 的科研动机就是构造能在分布外更稳健工作的系统。

**从神经科学到可训练系统：**  
Ramin 接着讲 liquid neural networks 的灵感：它们不是 spike 型神经元，而是更接近 **graded / electrotonic** 行为，因此和人工神经网络一样更容易做 differentiable learning。这样一来，可以把每个 neuron 看作一个带有 differential equation 的 process；把 2、4、8、100 个这样的 neuron 连接起来后，可以通过 backpropagation / differentiable programming 训练。

他强调，这类 neuron 的 differential equations 可以做得更复杂、更接近生物学，但复杂度越高，计算 footprint 越大。传统人工神经网络把两个细胞间的复杂 dynamics 抽象成 sigmoid / gated sigmoid 和 matrix multiplication；transformer + attention 也是为可扩展计算而做的简化。Liquid 的早期问题则是：能否把更丰富的 differential-equation computation 带回单个 neuron 或两个 neuron 的交换过程里，同时保留可训练性？

**关键 bottleneck：非线性与可扩展性冲突。**  
Ramin 说，每个 liquid neural network node 都可能是一个需要求解的 differential equation；节点越多，forward / backward pass 越复杂。他们不想牺牲 non-linearity，因为 non-linearity 增强 expressivity，尤其对小模型很重要；但非线性系统扩展困难，复杂度甚至会到 **cubic complexity**，不只是 quadratic。

传统做法是用 numerical solver step-by-step 展开 differential equation；步数越多，结果越准，但无法无限精度，也难以扩展。于是他们提出：如果能把整个系统做 **closed form solution** 呢？也就是不再每次通过 numerical solver 滚动求解，而是直接求 closed form。

**2022 Nature Machine Intelligence 与 VC 关注：**  
Ramin 说这条线发展成 2022 年 11 月 Nature Machine Intelligence 的论文，即 **closed-form continuous-time systems**，也可理解为 closed-form liquid neural networks。意义在于：不再需要 numerical solvers 后，可以从 hundreds of neurons 扩展到 much larger numbers，同时保留 non-linearity。随后 2023 年初 Quanta Magazine 对他和 co-founder Matthias 做了 profile；之后他的 inbox 被 VCs 塞满，硅谷开始关注这种不同于 transformer / attention、而是来自 biology / physics operators 的路线。

他也把 Liquid 放在更大的 alternative architecture 背景下：同一时期 state-space models、scalable convolutions 等都在发展，但很多路线为了 scale 需要 linearize；Liquid 则希望在某些尺度上保留从 biology / physics 学到的 operators，并用于更 general-purpose tasks。

---

## 18:51–34:27 “neurons vs parameters”：为什么早期用 neuron 计数，以及 liquid network 的第一性限制

**Nathan 的追问：**  
Nathan 注意到 Ramin 描述 liquid neural networks 时常用 **number of neurons**，而行业更习惯用 parameters。他想弄清这里是否代表 paradigm difference，并把问题连接到 robust out-of-domain generalization、adversarial robustness 等 mainline paradigm 仍未完全解决的问题。

**Ramin：早期 neuron 是 computation unit，但今天也回到 parameter 口径。**  
Ramin 说，早期他们把 neuron 当作 computation unit：每个 neuron 是一个可由 mathematical equation 建模的 process。一个 liquid neuron 内部有 gating / parameters，并且不只是一次 forward-pass computation，而有 **internal feedbacks**，包括类似 **three-degree feedback mechanisms**。如果粗略换算，早期版本里 **number of neurons × 7 ≈ parameters**。但随着 parallelization schemes 标准化，今天谈 liquid foundation model 的 1B parameters，就是和 GPT 等模型同一语义的 1B parameters。

**Nathan 追问 bottleneck：如果几十个 neuron 效果很好，为什么不直接做到 millions / billions？**  
Ramin 的回答很明确：主要挑战是把 **sequential computation 转成 parallel computation**。当从单个 neuron dynamics 扩展到多个 neural dynamics，权重从 scalar / vector 变成 matrix / tensor；要在硬件上高效跑，就要把 scalar computation tensorize。

问题在于：非线性关系不能简单一一映射到 vectorized / tensorized computation。RNN、liquid neural networks 的 recurrence 本身增加复杂性；如果 recurrence 里还有 non-linearity，就更难用常规 linear algebra 变成 tensor 形式。这也解释了为什么很多 state-space models 强调 linear dynamics：不是因为线性一定更“聪明”，而是我们有更好的方式 scale linear systems。

**closed form 能解决多少？**  
Nathan 继续问 closed-form solution 能解决多少，以及原始 liquid paradigm 现在能扩到什么规模。Ramin 说，liquid neural networks 的特征之一是多个 feedback mechanisms，不只是单层反馈，而是在 synaptic dynamics between two cells 里有多层 feedback，因此也有 nested nonlinearities。Closed-form 后，从 dynamics 角度可以从 100 neurons 到 **100k、甚至 1M–10M neurons**；但由于 nested nonlinear relationships，仍然需要某些 sequential computation，无法像 transformer 那样有效 parallelize。

他补充，有人正在研究 sequential scan 等方法，试图在不把非线性系统线性化的情况下把复杂度从 cubic / quadratic 降到 sub-quadratic。Liquid 自己也在做类似研究，因为这些 nonlinearities 对 function approximation 确实有优势。

**Scaling laws define architecture：模型越大越少结构化，模型越小越需要 bias。**  
Ramin 提出一个关键观点：**scaling laws define architecture**。Transformer 的成功来自极大尺度下的低结构化/低偏置：矩阵乘法可以在任意大小上无结构地扩展，适合 trillions / tens of trillions parameters。随着模型走向无限大，越希望架构 less structured；在超大尺度里，如果你加入太多 bias，事情会变 messy。

但 alternative architectures 有其适用 scale。Ramin 估计 Liquid 讨论的这类 architecture 可能在 **up to 100B parameters、甚至 up to 1T parameters** 的某些区间更有意义。模型越小、越面向某应用，越应该通过 nonlinearity、gating、recurrence、convolution 等 bias 去解决特定问题。

**硬件校准与 continual learning 定义：**  
Nathan 问那些 hundreds of thousands / near-million neurons 的 liquid networks 跑在什么硬件上。Ramin 说可以跑在 CPU 或简单 GPU 上，文件大小可能只有 **1–25 MB**，甚至 Raspberry Pi 足以执行某些计算。它们已在 predictive / specialized AI 上展示能力，例如 speech synthesis、multivariate sequence prediction。

Nathan 又问 continual learning。Ramin 区分：continual learning 是系统持续接收新数据并 retune parameters；liquid neural networks 不是这种系统，因为参数固定。它们的特点是 **dynamics input-dependent**：新数据来时，系统 dynamics 会根据输入变化，但参数不变。这个 dynamics 维度让小模型能压缩更多信息，也让它们更 adaptable。

他用自动驾驶遇到下雨举例：雨水打在摄像头上是噪声/输入扰动，但现实环境的 confounding variables 没变。传统网络若没见过这种输入可能被 bias；liquid networks 由于会对输入做不同反应、吸收输入、做 low-pass filtering，更可能适应这种 scenario。这里的“适应”不是改参数，而是输入依赖 dynamics。

---

## 34:27–46:22 从科研到客户：AFMD、硬件在环、下游任务而不是 perplexity

**Nathan 的问题框架：**  
Nathan 把话题转到商业化。他提到 Shopify CTO 在 Latent Space 上对 Liquid 有正面评价，并说 Liquid 似乎从“我有一种 liquid paradigm”变成了更 neutral 的架构搜索公司：不是拿 hammer 找 nail，而是用更高抽象的 process 搜索 architecture space。Nathan 还点出两个细节：第一，proxy metrics 如 perplexity 不够，要看下游任务；第二，要把 actual target hardware in the loop，因为机器人、sensor、手机等都有真实物理限制。

**Ramin：AFMD = Automated Foundation Model Design。**  
Ramin 说 Liquid 内部系统叫 **Automated Foundation Model Design（AFMD）**。它是一个 meta-learning system，把硬件放进 loop，用 evolution strategy 试验不同 operators。优化目标包括：

- device memory consumption；
- latency；
- speed；
- 在不牺牲 quality 的前提下提高效率。

他强调 quality 不是 perplexity，也不只是 public benchmarks，而是客户真正关心的 downstream applications；内部会看 **100 different benchmarks**。这使 problem space 在 meta-learning 角度非常复杂。

**为什么要自动化架构设计：减少人类架构偏见。**  
Ramin 说采用 AFMD 的原因是想尽量移除 early architecture design 中的 human bias。他认为即使在 OpenAI、Anthropic 等最大 foundation model labs，也会有一小群“Avengers of architectures / post-training / pre-training”的专家凭经验拍板：改这里会更好，因为过去经验显示它 work。Ramin 不认为这一定错，但认为真正可持续的路线是把更多判断交给算法；recursive self-improvement 的趋势也在迫使大家意识到“give it to the algorithms”。

**搜索空间：50–100 operators、10M 到 72B parameters 的 scaling laws。**  
Ramin 说 Liquid 搜索的 operator space 包括：

- convolution variants；
- recurrent operators；
- attention variants，包括 original attention / group query attention 等；
- dynamical-system variations；
- Liquid computational blocks，例如 gated / double-gated convolution 等。

这些合在一起大约 **50–100 different operators**。目标是构造 hybrid models，以最大化 computational efficiency without loss of accuracy。Liquid 在 2023–2024 年用这种方式做 scaling laws，从 **10M parameters** 的模型一直跑到 **72B parameters** 的 hybrid structures，以证明在某些 parameter regimes 和 product requirements 下，architecture search 能带来效率优势。

---

## 46:22–59:50 Gating、Mamba、LFM2：为什么“input-dependent transformation”反复出现

**Nathan 的 gating 直觉：**  
Nathan 说自己研究 Mamba 后很兴奋，他对 gating 的 rough understanding 是：我们不只想学习一个 transformation，还希望这个 transformation 能依当前输入而改变。gate 通常相对低维，可能是 scalar 或更复杂机制，用来告诉模型“在当前 input 下如何修改 learned transformation”。他请 Ramin 校正这个理解。

**Ramin：这就是 liquid structure；Liquid S4 提前提出 input-dependent SSM。**  
Ramin 回答：Nathan 说的就是 liquid structure。他提到在 Mamba 出来前约一年半，Liquid 发布过 **Liquid S4**，其 abstract 就引入了 **input-dependent SSMs**。目标是把他们认为对 representation learning / learning capacity 很重要的 input dependence 带入 SSMs、convolutions 和后来的 liquid foundation models。

他强调，input dependence 的价值不只在 forward pass 的 adaptive behavior；从 learning theory 看，关键发生在 backward pass。计算 gradients 时，input-dependent operator 会进入学习过程，因此模型不仅学习 parameters，也学习某种 dynamics。gate 的复杂度会显著影响效果。

**架构不是唯一维度：learning objective / learning algorithms 同样关键。**  
Ramin 随后提醒，不应过度迷恋 architecture。模型可以用 next-token prediction、word modeling、long-horizon sequential objectives 等不同 learning schemes 训练；objective function 本身也会强烈影响学习。Architecture research 在 Liquid 看来最重要的用途是 **efficiency**：在不损失质量的情况下减少资源消耗。

他把这放到资源约束的大背景：AI 需求指数级增长，最大 labs 正在“wiping out the compute off the planet”，因为它们既要训练也要 host models。若要让 AI accessible to all，就必须有更 efficient architectures。但如果目标是像人脑那样 **20 watts** 下完成强智能，那就超出 architecture 本身，还涉及 memory research、learning algorithms 和更大的机制创新。

**Nathan 总结并得到校正：**  
Nathan 总结说：在 recursive self-improvement era，真正突破可能更多来自 new learning paradigms / objectives，而 architecture optimization 是在之后把这些突破做高效。Ramin 校正说 architecture 是其中一个 component；空间应看成至少两个轴：data / representation / architecture，以及 learning algorithms。recursive self-improvement 本质上可看作多年 continual learning 研究的新名字。

**LFM2 的具体形态：attention 仍需保留，但非 attention 层可以很简单，只要有 gating。**  
Nathan 具体问 LFM2：架构搜索结果似乎是 reduced but critical attention layers，其他层是很简单的 gated convolution；可能类似 **70% gated non-attention + 30% attention** 的结构。Nathan 说，如果更新“attention is all you need”，或许应变成：attention 仍然需要，但其他层需要 gating，不一定需要很复杂的 SSM。

Ramin 说 Nathan 抓住了重点，但要看 operating regime 和系统目标。如果要最强 AI，可能需要最 unbiased 的算法；attention 是非常 rich、unbiased 的格式，即便复杂度是 **N²**，也许某些能力上限就是需要 N²。Liquid 一直想降低架构复杂度，因为 humanity resource constrained。

他的关键表述是：**架构存在一个随 scale 变化的 gradient**。小模型 / specialized models 可以加入很多 bias，利用 linear attention、convolutions、recurrence、gating 等在速度和资源上获益；模型越大，越可以 unstructured，attention 这类低偏置机制越重要。Hybrid 能在质量与效率之间折中。

---

## 59:28–1:07:19 哪些场景需要高度 bias 的架构：DNA、视频、微秒级 latency、物理/传感器数据

**Nathan 的问题：**  
Nathan 问：在客户场景里，什么时候因为资源约束或 domain narrowness，使得 architecture search 选择更有 bias 的架构？

**Ramin 的第一组例子：biology / DNA。**  
Ramin 说 DNA data 的 vocabulary 很小，不像自然语言有巨大 vocabulary；但 sequence length 极长，可能是 **1–100B sequence elements**。在这种极长 context、低 vocabulary 的数据里，不一定需要 attention，因为 attention 的 quadratic cost 会爆炸。可行路线包括 pure convolutions、pure SSMs、pure liquid neural networks、parallelized recurrences、linear attention 等。

**第二组：video / scene understanding。**  
在 video modeling / scene understanding 中，可能需要不同 architecture 和 learning algorithms。Ramin 提到 diffusion 的成功，并指出 diffusion 可以被视为某种 prior；它到底属于 learning algorithm 还是 architecture 的一部分，可以讨论。视频里有人仍相信 autoregressive modeling，但也有人认为 diffusion 或其他 priors 会更合适。

**第三组：极端低 latency、physical data、sensor data、digital twins。**  
Nathan 追问最原始的 differential-equation-inspired liquid neural networks 是否在今天仍有真实部署需求。Ramin 回答“100%”。如果 computation 必须在 **microseconds** 内完成，就不能承受高计算复杂度，必须用最简单可行系统。另一个典型场景是 simulation / physics：例如对工厂里的 chemical reaction 建 digital twin；或对 continuous-time physical / sensor data 建 predictive model。这些场景天然适合 differential-equation-based models，因为数据本身是 continuous time。

他补充，早期开源的 liquid neural networks repository 多年后仍有人用于 sequential / physical / sensor data 的 predictive modeling。今天随着 agentic pipelines 和 cloud compute 变强，机器学习人员越来越像 orchestrator：让 agent 去探索不同 neural networks，给定可选 bias space，让系统自动挑最适合的数据集模型。

---

## 1:07:19–1:16:18 商业化与 edge AI：Shopify、Mercedes-Benz、600MB 模型、$500B 手机市场与“dark compute”

**Ramin 先定义 Liquid 适合的 use cases：**  
Liquid 贡献的是 memory、speed、latency、quality、cost 的综合优化；客户场景通常是希望在不牺牲 quality 的情况下减少资源和延迟。

**Shopify：recommendations / search / product catalog / multimodal understanding。**  
Ramin 说 Shopify 正在探索很多应用，包括 recommendations、search、product catalog、multimodal understanding。Liquid 的模型已经在 Shopify production 中，改善 click-through rates 和 Shopify 内部关心的 criteria。

**Mercedes-Benz：车内 intelligence 与 600MB 模型。**  
Ramin 说 Liquid 的模型走出 data center 进入 cars，提供 in-car intelligence。最近与 **Mercedes-Benz** 签了一个他称为 historical 的 contract：Liquid 模型将驱动车内 audio 和 visual elements。比如用户和汽车对话时，新的 voice 将来自 liquid foundation model。Ramin 特别强调：它能达到当前最强 audio models 的质量，同时模型大小约 **600MB**，可以 fit inside the smallest processor inside that car。这改变游戏规则，因为它让 local AI 在 cars、mobile phones 等 billions of devices 上规模化。

**$500B 手机市场与 $1T edge compute substrate。**  
Ramin 提到 mobile business 是 **$500B market**。Nathan 接着重复这个数字，并把它和 data center capex 对照：即使数据中心 buildout 正在达到并超过智能手机年度市场规模，全球每年还有大量手机、笔电等设备被卖出，桌面与口袋里沉淀了大约 **$1T** 级别的 compute substrate，但从 intelligence 角度看有大量 **dark compute** 没被充分利用。

**Ramin 的能源约束论：**  
Ramin 说必须利用这些边缘算力，因为没有足够 energy 来把所有 intelligence 都 host 在 cloud。不是所有任务都该调用最昂贵的大模型；例如 one-shot predictive task、data extraction 等可以由不同层级的 intelligence systems 处理，最复杂问题才交给 cloud 中最强 AI systems。世界上 data center 之外的 processors 必然要被 enable；他感觉硅谷投资人对此有 lag，但现在开始意识到 efficient AI 的机会。

**Kernel / scan / post-hoc optimization：**  
Nathan 问：面对手机、factory sensor 等高度异构设备，Liquid 在多大程度上需要做 kernels / scans 层面的工作？Ramin 回答：有多层抽象。对于开源中已有的 GPU kernels，AI 已经可以开始辅助 kernel design；但很多 NPU 的 IP 不公开，需要另一层 architecture search。Liquid 的主要流程是在 pre-training 前做 architecture search / hardware-in-the-loop；架构确定后还要做 quantization、bit-width 调整、kernel-level post-hoc optimization。Liquid 内部也有能力在 kernel level 定义 operators，例如 matrix multiplication 可有很多 cache / no-cache 的实现方式。

---

## 1:16:18–1:24:19 硬件厂商该怎么做：从 CUDA/kernel 上移到“intelligence layer”

**Nathan 的问题：**  
硬件制造商应优先做什么，才能实现更 efficient / distributed AI future？

**Ramin：抽象层正在上移，硬件公司必须拥有 intelligence layer。**  
Ramin 认为每一代软件技术都会把硬件厂商需要建设的抽象层往上推。过去大家谈 CUDA / kernels；但当 agents 可以自动化 kernel level，硬件公司若想卖更多 hardware，就不能只停留在 kernel optimization，而要上移到 **intelligence layer**。

他举 **NVIDIA Nemotron / NIM** 作为例子：NVIDIA 在其 compute 之上建设 intelligence layer，降低 enterprise 购买 NVIDIA solutions 的进入门槛。他说这在企业销售中很重要：硬件不只是芯片，而是预置的智能与软件优化方案。硬件公司是否要成为 foundation model company？Ramin 的回答是：**to some extent, yes**。它们需要能训练自己的 intelligence layer。

**赢家不是单纯比较 bandwidth / memory，而是硬件 + intelligence layer + software optimization。**  
Ramin 说，最终企业是在硬件上 run tokens。CPU bandwidth 或 memory 稍高稍低不是全部；如果某硬件公司有高效 intelligence layer 和软件优化，就可能成为赢家。未来 PC / laptop solution 可能自然带有 intelligence layer。

他还提到 NVIDIA 正进入 CPU / device space；Google 通过 Android laptop / Chromebook replacement 方向进入；Meta 也会有自己的 devices。Ramin 的判断是：所有 processor builders 都需要更接近 intelligence layer，把软件与效率规划纳入硬件 roadmap。

**Nathan 追问 vertical integration / coupling。**  
Nathan 问这是否意味着未来模型和硬件更紧密绑定：买硬件时模型随硬件而来，模型为了硬件优化、硬件为了模型优化，模块化程度降低？

Ramin 的回答不是否定，而是从“choice”角度重构：如果默认模型已经高效、ready to go、可调优，用户为什么要换？这不是说只能有一个模型；你仍应能在硬件上加载 open-source ecosystem 中的模型，也可能有 cloud / on-device 多个实例。但硬件厂商提供默认 model class / intelligence layer，会给它们 advantage。NVIDIA NIM / Megatron 的逻辑就是：预置多模态模型、优化好、跑得快、还可 tune；用户自然没有强理由切走。

---

## 1:24:19–1:30:38 本地 agent 实践：LFM2 24B A2B、local coworker、PII filter 与 orchestrator

**Nathan 的具体场景：**  
Nathan 提到 Liquid 的 blog post：local co-work / no cloud / no waiting / tool-calling agents on consumer hardware with **LFM2 24B A2B**（他解释为 MoE，24B total、2B active）。他设想自己有过去五年的 digital output database，包括 email、Slack、播客 transcript 等；Claude desktop 可以本地 call tools，但会把结果发到 cloud 决定哪些结果重要。他想用 local model 先过滤敏感数据、减少 tokens、降低隐私风险，同时必要时仍调用 cloud foundation model。问题是：如何在本地电脑上获得好效果？需要 fine-tuning、distillation 吗？怎样用 Liquid base model 接近 Claude Opus / cloud model 的效果？

**Ramin：local coworker 现在更多是展示 application class；核心是 router/orchestrator。**  
Ramin 说，当前 local coworker 主要是为了 open minds：让人看到这类应用可以被 enabled。真正的本地 agent class 是一个 **local computer / orchestrator**：

- 如果任务复杂，可以 send to cloud 并 fetch answer；
- 如果数据敏感，可以先用小型 **PII models** 过滤 personally identifiable information，再送到 cloud；
- 用户不需要显式看到这些小模型，它们应在后台工作；
- 真正需要 tune 的是 orchestrator/router，让它在本地服务、小 specialist models、cloud models 之间路由。

Ramin 说这个 router 才是“computer”。打开 laptop 后，用户应该获得一个能调用服务、处理任务的 assistant，而不是显式面对一堆 file formats。用户需要一段时间适应这种 UI；他还提到 Claude Code 已经某种程度上变成 IDE。

**24B off-the-shelf 是否足够？Ramin：不够。**  
Ramin 直接说，**LFM2 24B off the shelf 还不能完成 Nathan 描述的全部事情；今天没有任何 local model 真正达到这种水平。** 要让本地模型好用，需要 fine-tune，让它专门适应用户要做的任务，并给 cloud agent 提供合适解释 / interfaces。换言之，短期不是“本地模型直接替代 Opus”，而是“本地 fine-tuned orchestrator + 小模型 + PII filter + cloud escalation”。Nathan 开玩笑说那就等 Liquid platform ready，不用自己 DIY；Ramin 基本认可这个方向。

---

## 1:30:38–1:38:00 智能小型化的上限：当前算法达不到人脑每瓦效率；需要新机制，不只是缩小 transformer

**Nathan 的最后问题：**  
他问 intelligence miniaturization 能走多远。生物世界是否已在某种 Pareto frontier 上？人脑消耗的 watts 是否接近该功率下的最大 intelligence？未来手机或 laptop 上的 intelligence 上限如何？

**Ramin：当前算法不能接近 human brain intelligence-per-watt。**  
Ramin 认为 current architectures，包括 transformer-based networks 与 Liquid 当前这类 architecture landscape，通过 scale 产生了 in-context learning capability。这种能力是从 next-token prediction 中 **emerged** 出来的；Ramin 反复强调 intelligence 是 emergent property。

但如果要把 intelligence miniaturize 到 physical world，他不相信当前算法能接近人脑的 intelligence per watt。原因之一是人脑背后有漫长 evolution 的能量投入。人类不需要看完整个互联网才会 reason，不是因为训练数据小，而是因为人类经过了长期生物演化。当前 AI 的 pre-training 与人类的 evolutionary priors 不是同一层级。

他还说，人类智能包含多种 in-context learning mechanisms；当前 AI systems 在 in-context learning 中学到的像是某种模糊的 least-squares / gradient descent 机制：通过 examples 让系统理解并给出 next example。这很美，但只是 emergent property 的一个形态。要达到更强的 miniaturized intelligence，需要的不只是把现有 transformer 变小，而是新的 mechanisms、learning algorithms、memory 与 continual/self-improving 系统。

**结尾：科学家心态、agent 时代与 curiosity。**  
Ramin 说这次聊到了一些他作为 CEO 平时不常讲的技术深处。虽然现在常谈 business opportunities / market aspects，但 Liquid 核心仍是 scientists pushing boundaries。他说自己即使在聊天时也在后端训练东西，不想脱离这种 mentality。

他认为现在每个人都可以 build；agents 给人做 frontier research 的能力。真正需要的是更多 curiosity，而不是被 fear 主导。他自称 techno-optimist，希望人们像科学家一样以 curiosity 去理解世界。AI 给了人“superpowers”，每个人都可以贡献于 understanding the world、创造价值、满足好奇心。但这也要求人们重新校准对 work、automation、agent army 的偏见。

Nathan 最后回应说，他现在某种程度上过着 curiosity-driven life，这也可能是一个能激励人的正面未来愿景。

---

# 20VC: Clay Bavor / Sierra — 中文深度纪要（ASR 原文顺序还原版）

## Source boundary / 本地归档

- Source：20VC RSS/Libsyn audio。Libsyn 页面未发现官方 transcript。
- Transcript status：`asr_faster_whisper_base_en`（本地 faster-whisper base.en，CPU/int8）。
- 音频时长：约 68 分 47 秒；正文约 00:00–1:05:19，之后为广告。开头 00:00–04:55 为 teaser + sponsors，正文从 04:55 开始。
- 本地路径：
  - Audio：`[podcast-archive]/2026-07-05/20vc/20vc_clay_sierra.mp3`
  - Timestamped ASR transcript：`[podcast-archive]/2026-07-05/20vc/transcript_timestamped_asr.txt`
  - Plain ASR transcript：`[podcast-archive]/2026-07-05/20vc/transcript_plain_asr.txt`
  - Metadata：`[podcast-archive]/2026-07-05/20vc/metadata.json`
- ASR caveat：ASR 对人名/公司名可能有误（如 Brett/Brad、Clay Bavor、Ravi Gupta、Sangeen/Sangi、Lovable、Nexx/Next、Cigna/Sigma、Omotenashi 等）；数字和专有名词应以音频或官方材料复核。

## 一句话定位

Clay Bavor 的核心信息是：Sierra 没有选择重资本 pre-training，而是“足够深地控制技术栈”——在 open-weight / frontier model 上做 proprietary fine-tuning、agent architecture、MCP gateway、company brain、forward-deployed implementation 和 vertical expertise；同时他认为 frontier intelligence 的需求仍近乎 unbounded，open models 会吃掉一些工作负载，但不会消灭 frontier 模型的价值。

---

## 00:00–04:55 Teaser 与背景：Sierra 的规模、资本与嘉宾履历

开头 teaser 先抛出几条核心观点：

- Clay 说市场还没有充分理解 **frontier levels of intelligence 的 unbounded demand**。
- 他认为中国 open-weight models 的一部分差异，可能来自中国公司更愿意对美国 frontier models 做 **scale distillation**；如果自己不能建 frontier model，distill 并提供出来就是 next best approach。
- Sierra 每轮融资都可以拿更高价格，但他们主动引导并接受了低于最高可得价格的 valuation。
- 公司里一些最有效员工只有 **22–23 岁**，但已经完全 **AI-pilled**。
- Sierra 已经彻底改变工程面试流程。

Harry 介绍 Clay：Sierra co-founder，被称为增长最快的 AI companies 之一；公司融资超过 **$1.5B**，估值接近 **$16B**，服务 **40% of Fortune 50**。Clay 在 Sierra 前在 Google 待了约 **18 年**，参与过 Google Labs、Google Workspace、Gmail、Drive、Photos 等项目。广告段包括 Rocks、Framer、Superhuman Go，正文从 04:55 开始。

---

## 04:55–10:01 为什么离开 Google 与 Brett 共创 Sierra；从 Google 带走什么、留下什么

**Harry 的问题：**  
他问 Clay：Brett 曾多次想雇他或和他一起创业，为什么第三次成功？为什么在 Google 18 年后才离开？

**Clay 的回答：**  
Clay 说他和 Brett 约 20 年前在 Google APM program 认识：Brett 是 class one，Clay 是 class three。两人通过 shared project 结识，后来在一个号称 monthly、实际一年可能玩两三次的 poker group 保持联系。Brett 离开 Google 后，无论是 FriendFeed 还是 Quip，都曾试图让 Clay 加入。

Clay 没走的第一原因是他真的喜欢 Google：文化适合他，学到的东西超出想象，身边人优秀，经理和领导愿意给他超出纸面资历的责任。他在 Google 一直成长、投入、快乐。

转折发生在 **late 2022**：他一直想创业，也在 13 岁时做过一个 modest company；如果要和某人创业，需要确认对方在 competence 和 character 上都 excellent，而且 timing 正确。那时他们看到 language models 将成为大事；新技术初期往往会重新洗牌，对 smaller companies 有利。因此他离开 Google，和 Brett 创办 Sierra。

**Harry 追问：从 Google 18 年最大的 takeaway 是什么？哪些留在 Google？**  
Clay 说 Google 和两人、十人、百人的 enterprise software startup 完全不同；但他带走的第一条是：**愿意在需要时深入技术栈底层，直到能建出你想要的 service/product。**

他举 Google 早期自建 data centers / cluster architectures、使用 commodity hardware、因此必须发明 distributed systems for serving and storage 的例子。Sierra 在 2023 年 4 月创立时就看到 agents 会成为方向——那时还不是人人谈 agents。他们意识到 agent 应该可行但尚不可行，因此必须发明 agent frameworks / architectures。Sierra 的 founding head of research 是 Princeton professor，写过 language-model-based agents 的 **ReAct paper**。

**是否考虑自训 foundation model？**  
Harry 问 Sierra 是否考虑过训练自己的模型。Clay 说 briefly considered and discarded。2022 年末、2023 年初，AI startup 好像如果不做 pre-training / foundation models 就“不算 AI startup”；Character、Inflection、Adept 等都在做。但 Clay 认为，从资本开支和持续资本开支看，训练一包 highly perishable floating point numbers 只适合少数公司。Sierra 的算盘是：在高度资本密集部分，尽量 **slipstream behind labs / hyperscalers 的投入**，能 off-the-shelf 就 off-the-shelf，但在必要处做更深工程。

---

## 10:01–18:24 Open models vs frontier models、token economics、中国 open ecosystem 与 distillation

**Sierra 自己的模型策略：**  
Clay 说 Sierra 今天有 proprietary fine-tuned models，但这些 fine-tunes 是基于 **open-weight models**，不是自己做 mega-cluster training runs。他强调要“足够控制自己的 destiny”，但不要给自己讲一个“必须走得比实际需要更深”的故事。

**Harry 问：未来是否是 open models fine-tuned to specific company needs？frontier models 是否太贵？**  
Clay 回答：更复杂。如果问任何软件公司“是否想把 staff-level engineers 升级成 principal / distinguished engineers”，100/100 都会说 yes。因此市场尚未理解 **frontier levels of intelligence 的 unbounded demand**。

但并非所有 domain 都需要 frontier。例如 Sierra 做企业与客户互动的 AI，退一双鞋不需要 Mythos；这类任务有 capability overhang。但在 coding、science、materials science、legal 等高复杂度高 stakes 领域，对更高 intelligence 的需求会近乎无限，frontier models 仍有长期需求。

**GPT-4 作为“曾经 frontier，后来 commoditized”的例子：**  
Clay 说会出现一条 assembly line：2023 年 3–5 月足够做很多事情的 GPT-4，到现在 equivalent intelligence token cost 可能只有当时的 **1/300**。某些 workloads 会从曾经的 frontier model 迁移到 open weights / fine-tuned models；企业会 mix and match，根据任务选择 frontier 或 open/fine-tuned。

**Harry 继续压问：open 越强，frontier 的问题空间是否越小？**  
Clay 承认 open-weight models 越强，便宜模型可做的任务越多，all else equal 会减少使用 frontier 的范围。但他认为大家仍低估了 frontier intelligence 的 demand ceiling：发明、发现、新产品、新服务，一旦有 intelligence 能 24 小时工作，能做多少事很难想象。

**Token economics：为什么 agent / reasoning 时代 token cost 可能不降反升？**  
Harry 说，过去大家以为 chat tokens 会越来越便宜；但从 pure chat 到 chat+agents，token cost 反而上升。Clay 补充一个被忽略的驱动：**reasoning models** 会“thinking out loud”，test-time compute 上升。OpenAI 2024 年末的 o1 模型展示了：inference / thinking time 增加，performance 往上走，虽然是 logarithmic、会 leveling out，但足以说明“时间和 compute 越多，模型越聪明”。

Clay 分解 token economics：

- 硬件会让 equivalent-cost token 产出增加，input cost 下降；
- 一些 workloads 会迁往 open weights；
- 但 compute availability 是核心约束：若对 frontier intelligence 或 open-weight GPU inference 的需求近乎无限，而 Blackwell / H100 供给是 limiter，就会形成 token cost floor，因为要付 compute 和 energy。

Harry 提到 Nebius 创始人说如果供给 10x 也能一天卖完；Clay 表示相信。Open weights 可能更便宜，因为避开 hosted frontier 的 margin stack，但底层 input 仍是 GPU capacity 和 power。

**Local inference 是否缓解 server-side challenge？**  
Harry 问本地运行（Mac mini cluster、phone on-device）是否能缓解。Clay 认为它会让一些 consumer applications 更好，但不会解决 frontier workloads：训练需要 peta/exaflops；inference 也需要快速大量 compute，手机有 thermal limits。未来 phones/computers 会有 language-model-optimized hardware，也可能有家庭 appliance 插电提供家庭 compute；但 frontier workloads 仍只能去 data center 里的 TPU/GPU racks。

**美国 open ecosystem vs 中国 models：**  
Harry 问美国 open 是否落后，中国 models 是否先进得令人担忧。Clay 认为差异的一部分来自中国公司愿意对美国 labs 的 frontier models 做 scale distillation。他的 impression 是，很多中国 open-weight models 派生自美国 training runs。美国 labs / hyperscalers 开发 frontier models 后，若发布同等能力 open weights，会自我竞争、压低自家 frontier model 价格；如果 Clay 经营那类业务，也不会这么做。若不能自己建 frontier model，distill frontier 并发布就是 next best approach。

---

## 18:24–29:01 Enterprise AI 团队规模、Pinecone internal agent、Sierra Brain 与 token budget

**Harry 的问题：AI 是否让团队极度精简？Sierra 这类 enterprise 公司是否仍需要大团队？**  
Clay 说总体方向显然是 **smaller, higher-leverage teams**。Sierra 工程师使用 Claude Code、Codex 以及公司内部 agent **Pinecone**，估计在 features shipped 维度有 **3x–20x** productivity gain。软件工程、数据科学、数据分析已经明显受益，未来会影响公司每个部分。

但 Sierra 面向大型企业：服务 **40% Fortune 50**，**50% 客户收入 >$1B**，**30% 客户收入 >$10B**；这些复杂且常受监管的组织都是 snowflakes。要成功销售和部署，需要深刻理解客户 business outcomes、technology stack，做集成、建立信任，不只是把 software 扔过墙，而是作为 partner 帮客户把 AI diffused 到 front office、sales、support、marketing 等流程。

**Pinecone 是什么？**  
Harry 对 Sierra internal agent Pinecone 很感兴趣。Clay 说这是过去 6–9 个月公司运营方式中最重要的发展之一。Sierra 先建了 **MCP gateway**：一个 single MCP server 聚合公司运行所需的主要 systems/services。员工可以把这个 gateway 加到 Claude、Codex、Pinecone 等 agent 中；在个人权限范围内，agent 可以访问自己的 docs、Slack messages、presentations、operating reviews 等公司信息。Clay 形容这像拥有 superpowers，可以 interrogate the entirety of the company 的公开/授权信息，更好地推理、决策、执行。

Pinecone 在 MCP gateway 之上，是为 Sierra purpose-built 的 harness。它知道如何 build Pinecone，也知道工程团队的 agent architecture、Agent Studio 等。公司还有 shared library of skills，每个人都可以建 public 或 private skills。Clay 自己有一个 skill 类似 “Clay scanner of interview packets”：他至今会 review and approve every hire，Pinecone 被训练成帮他扫描候选包，标记他关心的信号，帮助更快更深地读 packet。Clay 说 Pinecone 正接近 indispensable tool for running the company。

**Sierra Brain：战略 thought partner。**  
Sierra Brain 从一份 **20–30 页 document** 开始，ground 任何 agent：Sierra 是什么、做什么、组织结构、团队结构、竞争格局、强弱项。其上再接入最近 board letters、operating reviews，以及公司对世界的 insights/observations。Clay 可以用它推理公司应该做什么；它像一个很懂公司的 strategy thought partner。

**Token budget：未来 CFO 如何看 AI token spend？**  
Harry 问 CEO 是否应该限制 dev teams token spend。Clay 说过去 6 个月 token usage 是“你在使用 AI、leaning into it”的 proxy，通常是正信号。但他观察到最 top 的 engineers 使用 Claude Code / Codex，每年 token spend run-rate 可超过 **$100K**，已经是工程师薪资的 meaningful fraction。

因此他认为未来会出现 per-employee token budgeting。CFO 的 capital allocation 会像：opEx + headcount，而 headcount 不只是 salary / SBC，也包括 associated token budget。“Here’s your salary, here’s your token budget, have at it.” Sierra 目前还没到严格 budgeting 阶段，因为学习速度收益大于资本纪律；但未来软件开发的 constraint 会移动：过去是写代码，接下来可能是 review code，再之后是决定 what is worth building、从 what could exist 编辑到 what should exist。

Harry 提到 Benioff 称 Salesforce 每年在 Anthropic 上花 **$300M** 给 dev teams，约占 developer salaries **3.8%**；如果稳定在 3.8%，很多 AI infra/software 公司可能高估；若到 20%，则低估。Clay 认为 3.8% wildly off，steady state 更接近 **20%**。即便 AI 只带来 2x engineering gain，也等于工程团队翻倍，价值非常大。

**保持 product focus：Ghost Rider 与间接 B2C。**  
Harry 问服务 40/50 Fortune 50 是否会让公司远离产品。Clay 认为这是 false choice。Brett 和他自己都不断 build agents。过去 6 个月一个有趣发布是 **Ghost Rider**：agent for building agents，“agents all the way down”。Brett 仍是很强的软件工程师，部分 production code 由 Brett 写。Sierra 当然无法独自模拟大型企业复杂 multi-system environments，但他们始终在产品里，也关注客户的客户体验：voice fluency、latency、quality。Clay 说 Sierra 很快会通过客户间接成为更大的 B2C 公司，处理 hundreds of millions、soon billions of interactions。

---

## 29:01–38:03 市场结构、forward-deployed engineering、Japan/Omotenashi 与从 support 走向全生命周期

**Harry 的市场问题：竞争极多，这个市场 5–10 年如何演化？**  
Clay 先承认：巨大市场的好处是巨大，难处也是巨大，因为 startups、long-standing companies、incumbents 都会进来。5–10 年在 AI 时代很长；在 startups 中，客户正用脚投票。Sierra 的规模是相似 vintage startup competitors 的多倍，且增长更快，客户包括很多 great companies。

**市场结构：更像 Uber/Lyft 还是 AWS/GCP？**  
Harry 问是 two-player 还是 hyperscaler-like 多家并存。Clay 说很难知道，但因为平台深度/广度、specific industry vertical experience 等 economies of scale 会 compound，他的 hunch 是更像 **Uber/Lyft market**，并认为 Sierra 处于 pole position。

**是否必须有 FDE motion？**  
Clay 说 Sierra 在 AI space “rediscovered and borrowed” Palantir 的 model，几乎是 accidental。公司开始时问信任的人“最大未解问题是什么”，发现 service/support 是进入更广 customer lifecycle 的 foothold。随后找了半打 design partners，一起构建第一版产品和平台：Olukai、SiriusXM、Sonos、Weight Watchers 等。Sierra 工程师深度嵌入客户公司，甚至 founding engineer Mihai 像 Weight Watchers 员工一样收到 performance review emails。

他们发现没有人部署过这种面向客户的 AI agent。为了快速构建最好产品，需要极近距离理解客户业务、mechanics、people、business model。2024 年初开始系统搭建 forward-deployed team。

Sierra 平台是 extensible / transparent 的：客户可看到 agent 如何构建，可 export agent definitions 并自己 build；理论上不想要 FDE 可以不要。但通常第一版由 Sierra team drive、客户坐 passenger seat 导航，能显著缩短 time to market / time to impact / time to value：Next 六周上线 phone/chat；Cigna（ASR 作 Sigma）这类大型 healthcare company 约 **58 天**上线。Clay 不说“没有 FDE 就不能卖”，但认为 FDE 是加速 impact magnitude 的重要 catalyst。

**AI agent 是否处于所有 buyer 同时入场的独特时点？**  
Harry 说几乎每个 CEO 都被 board 问“我们如何使用 AI”。Clay 认为存在两个 unbounded demand areas：coding agents，以及 Sierra 作为 category leader 的 customer-interaction AI。Sierra 增长快是为了 meet that moment。公司在欧洲已有 **100 人**，最近收购日本 **Opera Technologies**，希望在日本有本地团队理解 cultural nuances，尤其 **Omotenashi**（极致 hospitality），这是日本服务预期。

**从 customer support 到 sales/marketing/lifecycle。**  
Harry 问 Sierra 是否未来是 sales platform、conversion platform、marketing platform。Clay 用 **Rocket** 举例：客户生命周期从 home search/discovery 开始；Sierra 与 Redfin 重新思考 search experience，帮助 Rocket 联系表达 refinance interest 的用户，构建 Rocket Assist 帮用户 shaping/sizing loan、收集信息；这些都不是 service/support。Sierra 也做 loan servicing。Next 的场景包括 personalized product recommendations、帮用户 build outfit / bigger basket。方向是从 support 进入 inbound/outbound sales、lifecycle management。

**Palantir comparison：更 consumerized、更大客户规模、vertical expertise。**  
Harry 说 Sierra 像 Fortune 50/500 Palantir，但更 consumerized。Clay 称 Palantir 是 amazing company，Sierra 确实从其 forward-deployed approach 借鉴/复制了一些元素。但他理解 Palantir 客户数是 low hundreds；Sierra 目标是更大规模。规模来自 specific industry verticals 的 domain expertise：比如 retail 的 basket building、healthcare claim status、checking account fees 等。越做越深后，可把行业 lessons scale 到更多客户。

**平台 vs 单客户定制：**  
Clay 说，做平台后等别人来，或做应用来反哺平台，Sierra 选择后者。能找到 commonality 就优先加强平台；但如果 Fortune 50/20/10/5 客户有 truly unique needs，也会构建。Coding agents 让基于深平台为单客户扩展变得可行。Clay 的直觉是：很多看似 one-off 的需求，后来会在别处复现，真正的 one-of-one 比想象少。

---

## 38:03–49:15 Board cadence、低于最高价融资、价值观：craftsmanship / intensity / family

**Board meetings：六周一次、memo 而非 deck。**  
Harry 听说 Sierra board 每 6 周一次，不是 quarterly。Clay 说他们从公司一开始就这样做，采用 tick-tock：一次 3 小时，一次 1.5 小时。原因是 AI time clock 更快。比如 winter break 后 coding agents 突然变得非常强（ASR 提到 Claude 4.5、Codex 5.2，需复核），这改变软件开发和核心产品方式；六周 cadence 让公司吸收新信息、update priors、change course。

Sierra 不用 board decks，而用 board memos。Brett 和 Clay 写 **6–10 页 memo**；writing is thinking on paper，很难躲在写作后面。提前发给 board，让 board members 有 soak time，而不是现场被 presentation managed。Board letter 的内容也很重要：即使公司前 8 个季度表现很好、持续超 forecast，memo 仍会写“我们落地了这些客户，但这里有 7 件不满意、可以更快/需要 hiring 的事情”。这样 board meeting 围绕真正问题展开，邀请 board challenge、improve、sharpen thinking。

**写“what you suck at”：**  
Harry 说听说 Clay 会写自己/公司哪里做得差。Clay 举例：早期明明有需求信号，却没有足够快招人、扩 recruiting team，导致本可承接更多客户。这是 2024 年初的教训，后来已纠正。

**融资定价：milestone-to-milestone funding，而非最高 valuation。**  
Harry 问 Clay 和 Brett 如何讨论新融资价格，因为他们几乎可以选择任何投资人、任何价格。Clay 说多数是 inbound；他们思考的不是 valuation，而是：需要多少资本才能到下一个 unequivocally higher watermark，包括 revenue、company scale 等，即 milestone-to-milestone funding。他们关注 dilution，但不是最大化价格。每一轮 Sierra 都主动引导并接受了 **低于可拿最高价格** 的 valuation。

**价值观：craftsmanship。**  
Harry 提到 Sierra 的价值观：craftsmanship、intensity、family。Clay 先解释 craftsmanship：他和 Brett 都关心把事情做好。Great company 是 thousands of great things 的 aggregation：great people、well-designed processes、great product、great culture。若值得做，就值得做好。

第二层是客户把最珍贵资产——他们的 customers——交给 Sierra。客户如何判断 Sierra 会怎样对待他们的 customers？很大程度看 Sierra 如何对待客户本身：专业、关心、关键时刻放下其他事。Clay 举 Black Friday / Cyber Monday 例子：面对 retail customers，lead engineer、head of operations、Clay 或 Brett 之一会实时亲自阅读 agents 与 customers 的每个 conversation，确保对客户负责。

**Intensity：巨大市场里没有 patience luxury。**  
Clay 说，公司与客户通过 sophisticated agents 互动、conversation 成为 interface 这件事有 inevitability。要在巨大市场中赢，需要 pace、winning、best product、competition、intensity；公司不能指望“自然会赢”。他招聘看 smart / nice / intense 的 Venn diagram，这三者在一个人身上很难同时出现，但一旦出现，办公室里能感受到。

Harry 问如何随规模保持 intensity。Clay 说从 founders 开始：Brett 和他必须 be pace setters、examples of intensity。他们深入细节，不断问：is this good enough？how could this be better？why can’t it happen tomorrow instead of next week？但 founder mode 需要 judgement，不能 17 层深地介入不重要细节；只有当某件事没有 founders 直接施力就不会发生或不会足够快发生时才深入，比如 next-gen agent architecture。

他还说 ambitious goals 往往 self-fulfilling：先设想一个高目标，再问 what would have to be true。例如为什么不能今年在日本建立巨大业务，而不是明年？需要 10 个本地人，那为什么不收购一家日本公司？但 date-driven development 也有风险，因为 work is like a gas，会填满你给它的全部空间。

**Family：不是不努力，而是反对 performative grind。**  
Clay 说 values 来自他和 Brett。他们在 5–6 名员工时用 **think apart, think together** 方式各自写价值观，再比较，发现高度重合。Family 来自两人真实生活：Clay 有四个孩子，Brett 有三个；Clay 和高中恋人结婚。对他们来说，唯一比 Sierra 更重要的是 family。

Family 不只是孩子，也包括接父母、朋友生日、家长会等“work 之外对你重要的事”。他们相信可以 intense、可以 turn on afterburners，但也需要 smart work 和空间。他反对硅谷 startup 中某种 performative grind。Clay 也承认如果 magically 每周多 15 小时会拿去工作，但他说自己极度 focused/efficient；通勤中他用两张蜂窝网络 + Starlink mini 保持稳定连接。

---

## 50:13–57:51 In-person、年轻人 AI advantage、AI-native hiring、cybersecurity、co-founder 分工

**为什么坚持 in-person？**  
Harry 问 Clay 为什么如此坚持线下办公。Clay 说，对 young company 而言，建立 culture、shared norms、camaraderie 很难完全通过 Zoom squares 完成。Enterprise software 是 team sport，属于优秀团队的感觉很重要。公司也发展了很多只有线下才会出现的 rituals。

他特别强调年轻员工的 apprenticeship / mentorship。自己早期职业能力来自经验丰富的人带他、甚至允许他在旁边看他们怎样做事。他引用 Richard Hamming 的演讲 **You and Your Research**：find great people, work with them, learn from them。人类学习很多时候就是观察并复制。Hamming 还说 knowledge and hard work are like compound interest；年轻人越早开始积累技能，轨迹改变越大。

**给大学毕业生的建议：成为 AI tools 的 master。**  
Harry 说年轻人面对 AI tsunami 很不确定，Clay 会如何建议他们。Clay 说，AI 对 entry-level jobs / apprenticeship 的影响确实令人担忧；但年轻人的 unfair advantage 是刚从大学出来，有四年时间可以高度掌控自己的时间、成为 AI tools 的 master。他认为从未有过这样的时点：一个没有工作经验但有正确 mindset、熟练使用 AI tools 的年轻人如此有价值。Sierra 一些最有效员工 **22–23 岁**，完全 AI-pilled，对工具的舒适度甚至高于更有经验员工。

**招聘如何变化：AI-native interview。**  
Clay 说 Sierra 完全改变了 engineering interview：给候选人一个 prompt，让其想一个想 build 的 application；公司给 **$150 token budget**，候选人可用任何 coding agent、任何 setup、带自己 laptop/tools，然后 build，并解释过程。工程面试至少是 AI-native；仍测试 architecture、systems design、product thinking、culture、smart/nice/intense 与 values。Clay 希望最多两个月内，公司每个面试都有强 AI-native component。

**Cybersecurity：重要性上升，但不确定独立产品还是 frontier tools 自身解决。**  
Harry 问 AI 生成代码增加是否让 cyber/security 进入 golden age。Clay 说 offensive capabilities 已经 ratcheted up five notches，cybersecurity 从未更重要，看起来是 good bet。但问题是 offensive tools 是否也会成为 defensive tools：如果 Mythos / Codex 的 cyber 能力本身就是解决方案，可能不一定需要更 narrow cybersecurity products。

**Clay 与 Brett 的 disagreement / 分工。**  
Clay 回忆最近一次分歧：某领域如何更快推进。他认为需要更好 process/structure，Brett 倾向认为需要 different leader/people；最终答案是两者都有。他们不是为了赢争论，而是 truth-seeking，常说 “this is correct” 来追求客观正确。

分工上，不是简单 divide company，而是每个领域有 majors/minors。Brett 的 majors 是 sales 和 engineering：很会卖软件，也仍是强工程师；Clay 的 major 是 running the company，包括 operations、finance、legal 等。他也做很多 first calls。关键合同像 two nuclear keys，需要两人都 turn。Clay 很信任 Brett 在 selling、system design、architecture 上的判断；Brett 也信任 Clay 在 people 和 running company 上的判断。

---

## 57:51–1:05:19 快问快答：Sundar、Google、Wright Brothers、亲子与早期支持

**从 Sundar 学到什么？**  
Clay 说 Sundar 有 remarkable ability 在非常不同 zoom levels 看问题：从最高层 strategy、未来五年 unfold，到 pixels、drop shadows、sound、texture 等细节。他很想 emulate 这种 dynamic range。Sundar 既极度 product-focused、building-focused，又是 wonderful human being，重视身边人的 humanity。

**人们低估 Google 的什么？**  
Clay 认为人们低估的是：当 enduring mission、incredibly smart people、truth-valuing culture aligned 时，Google 可以 solve almost anything。外界批评 Google “a thousand flowers bloom”，但如果聪明善意的人照顾每个 flower bed，并被正确方向引导，它会成为 invention/discovery/building 的强大力量。

**推荐书：David McCullough 的 The Wright Brothers。**  
Clay 说这本书是 entrepreneurship and invention 的准确画像。飞机的出现依赖此前一系列 invention network，尤其 lightweight internal combustion engine；之后就是 try、fail、try、fail，在 North Carolina 被蚊子咬，经历 hardship，最后建出能飞的东西。Harry 补充推荐电影 Those Magnificent Men in Their Flying Machines。

**亲子：clear goals + good habits，关注孩子真正点亮的东西。**  
Harry 问创业、四个孩子和运营公司的 advice。Clay 说有孩子是 greatest gift；抱起第一个孩子会让人成为改变后的人，是出生后最快/最大的个人变化。他努力 carve out time：family dinner、Sunday maker mornings，和两个儿子留一两个小时在家 build something。他的框架是：life 中重要事情来自 **clear goals + good habits**。如果你有明确 parenting goal，并建立习惯支撑，就更可能成为想成为的父母。

另一条是把孩子的兴趣变成自己的兴趣。Clay 说自己篮球很差，但一个儿子篮球很强，他会去看比赛、学习 sport、学习球员和 coaching，以便更完整支持孩子。对四个孩子都要观察 what gets the synapses going / what they light up about，然后让这些兴趣也成为自己的兴趣。

**婚姻 / partnership：shared goals 与互相实现。**  
Clay 和高中恋人结婚，已经在一起接近 30 年。他认为好婚姻是 partnership：共同追求一组 shared goals，比如让孩子成长为能 enjoy their lives、meaningfully contribute to others 的成年人，建立与自身价值观一致的 family values，并确保 partnership 中另一个人也 thrive、fully realize themselves。兴趣可以不同，但应有共同兴趣：帮助彼此成为能成为的最好版本。

**最善意的事：父母支持他对计算机的兴趣。**  
Clay 说最感激父母。他父亲是 cardiologist，母亲是 quilt maker，都不是工程或技术背景。但当他第一次接触电脑并“lit up”时，父母虽然不完全理解电脑会走向哪里，却全力支持。父亲带他买早期 Power Mac 时会问：如果加更多 memory，你能做更多吗？那就加。母亲每年会让他请一天假，去吃早餐，然后去 Macworld，对 Clay 来说像 Nirvana。他认为从这条支持线，直接连到 Google 18 年、创立 Sierra 和今天。

---

## 对 投资研究用户 的研究用途提示（不替代原文，只作索引）

### Liquid AI / edge intelligence

- **AI infra thesis：** 这期把“data center capex / cloud frontier models”与“edge dark compute / on-device intelligence layer”放在同一张图里；核心不是谁完全替代谁，而是任务路由和效率层会切分价值链。
- **半导体 / 硬件投资：** Ramin 的判断是硬件厂商必须上移到 intelligence layer；NVIDIA 的 Nemotron/NIM 被当作成功样板。需要跟踪 AMD、Qualcomm、Apple、Google、Meta、PC OEM、车厂是否形成自己的 default model layer。
- **企业 AI / agent：** 本地 agent 的真实形态是 orchestrator/router + PII filters + specialist models + cloud escalation，而不是单个 24B local model 替代 frontier model。
- **Liquid AI 商业进展：** 需后续验证 Shopify production 指标、Mercedes-Benz 合约范围、600MB in-car audio/visual model、LFM2 24B A2B 的公开 benchmark 与实际 deployment。

### Sierra / enterprise AI agent

- **企业 AI agent 商业模型：** Sierra 的论证是“大企业 AI agent = 产品平台 + FDE implementation + vertical expertise + customer lifecycle expansion”。这更像 Palantir/FDE 与 enterprise SaaS 的混合，而不是单纯 self-serve SaaS。
- **AI token budget：** Clay 认为 dev token spend 稳态更接近 engineering salary 的 20%，而非 3.8%；这是 AI infra / coding-agent 收入模型的重要 sensitivity。
- **Open vs frontier：** Sierra 不自训 frontier model，而是 open weights + proprietary fine-tuning + agent frameworks；但 Clay 同时强调 frontier intelligence demand unbounded，适合 coding/science/legal/materials 等高复杂任务。
- **年轻团队 / hiring：** AI-native interview（给候选人 $150 token budget、任意 coding agent、现场 build）值得作为 AI-first org 的招聘 precedent。
- **待复核数字：** Sierra 估值 ~$15.8–16B、融资 >$1.5B、40% Fortune 50、>150M ARR 等来自 RSS/节目描述与 ASR，应后续用官方/新闻稿交叉验证。

---

## Source health / 扫描记录

- Universe file：`[podcast-archive]/podcast_universe_20260701.md`
- State file：`[podcast-archive]/state.json`
- Scan report：`[podcast-archive]/2026-07-05/scan_report.json`
- Blogwatcher：`[local]/.local/bin/blogwatcher-cli` 可用；但当前无 tracked blogs，`blogs` 与 `scan` 均返回 “No blogs tracked yet”，因此 blogwatcher 本次未贡献文章覆盖。
- RSS scanned：18 个；全部返回 200。新增 high-signal：2 个。
