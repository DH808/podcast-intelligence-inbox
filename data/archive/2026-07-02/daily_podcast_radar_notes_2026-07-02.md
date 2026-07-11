# 2026-07-02 投资 / AI Podcast Radar — 中文深度纪要

说明：本次为 cron 日更扫描。按用户“深度纪要 = 高质量还原原文主要问题和观点”的标准制作：主体保留主持人问题、嘉宾回答路径、例子、数字、机制、限制与分歧；压缩广告、寒暄与 ASR 重复。不是二次投资 memo。

## Source boundary / 采集边界

- 扫描时间：2026-07-02 08:30 CST；RSS/podcast 官方 feed 扫描 18 个，blogwatcher 无订阅源、未贡献文章。
- 本次完整处理 3 个高相关新单集：
  1. Training Data / Sequoia — Dylan Patel of SemiAnalysis：RSS 官方音频；无官方网页 transcript 链接；已下载音频并用本机 faster-whisper `base.en` 生成 ASR。ASR 对专有名词/数字/模型名可能有误，以下保留原意并标注关键不确定处。
  2. Invest Like the Best / Colossus — Etched：Colossus 页面 transcript 需登录，公开页仅有介绍；已下载官方 RSS 音频并用本机 faster-whisper `base.en` 生成 ASR。ASR 对人名、芯片名、专有词可能有误。
  3. The Cognitive Revolution — Neural Concept：官方网页含自动生成 transcript，页面明确提示“automatically generated；verify key details”。以下基于该网页 transcript 与 show notes。
- 本地归档：`[podcast-archive]/2026-07-02/`；原始 RSS、metadata、audio、ASR transcript、网页 transcript 均已保存。

---

# 1) Training Data / Sequoia — Dylan Patel: Why Hardware-Software Co-Design Is AI's Real 100x

- Source / URL：Training Data RSS；音频 `https://pscrb.fm/rss/p/traffic.megaphone.fm/CPUAI5467568199.mp3`
- 嘉宾：Dylan Patel，SemiAnalysis 创始人
- 为什么对 投资研究用户 重要：这是今天最直接的 AI infra / semiconductor / neocloud / inference economics 信号。Dylan 把模型、kernel、硬件、数据中心、电力、neocloud 融成一个经济系统来讲，很多数字和判断可以直接用于 AI capex、ASIC/TPU/NVIDIA、neocloud、数据中心租金、推理利润率判断。
- Source boundary：官方 RSS 音频 + 本机 ASR，非官方 transcript；ASR segment 873，音频约 4215 秒。

## 00:35-14:06 SemiAnalysis 的形成：从互联网硬件论坛、供应链现场到“技术 × 成本”组织

主持人（Sequoia 的 Shaun / Sonya）先把 SemiAnalysis 的背景框定为：五年前西方并不认为半导体“性感”，但 Dylan 长期看多并做出高质量研究，覆盖技术细节、供应链和宏观图景；外界传闻 SemiAnalysis 可能已过千万美元收入、甚至未来可能做 venture fund。主持人问：Dylan 是怎么走到今天的？

Dylan 的回答从童年小生意讲起：父母经营 motel 和 gas station，他从小在柜台工作，开玩笑说自己训练的“第一个神经网络”是根据进店顾客的年龄、职业、种族、外貌去预判对方要买哪种烟，这样可以提前把梯子搬到相应货架前。这个故事不是闲聊，而是解释他很早就把“模式识别”和“成本/效率”结合在一起。

他真正进入硬件，是因为小时候 Xbox 360 “Red Ring of Death” 故障。他为了在表兄来访前修好 Xbox，拆机、尝试各种办法，最后通过短接温度传感器修好。12 岁左右他开始泡硬件论坛，后来成为 Reddit 上 Android、Apple、Google、PC build、GPU 相关社区的 moderator；一边看智能手机从简单设备变成在架构上某些方面超过 PC，一边跟踪 Intel、NVIDIA、AMD。即使当时网上很多人喜欢 AMD GPU 的价格/性能，他已经会从 die size、power efficiency、gross margin 角度说 NVIDIA 更好。

Dylan 还提到他曾是 StarCraft 2 北美 Grandmaster，强调自己的模式是对某些东西极度沉迷。后来他读了一些与半导体不直接相关的学位，做过两年 quant risk。2020 年前后，他在公司里靠市场风险机会为公司带来大量无风险收入但 bonus/credit 出问题，叠加祖母 dementia 后去世、个人关系问题、疫情 lockdown，他对原工作失去心理契约，住到 Nashville 的哥哥家。

SemiAnalysis 的直接起点是匿名账号被 doxxed 后，他决定用真名写博客。24 岁生日那天发了两篇 semi 文章，质量比普通互联网发帖高，立刻带来 traction 和咨询生意。之后他以近乎游牧方式学习：开车去美国各国家公园，工作日住便宜 motel 写 semi，周末在公园读 semiconductor / AI textbook、听 audiobook；2021-2024 年间继续“homeless”，一年跑 40+ 个 conference。

他特别强调 conference 的价值：NeurIPS 有 20,000 AI researchers，信息密度高；但像日本一个化学 conference，只有少数 ASML/TSMC/Intel 人说英语，其他 300 多人讲日语，也可能藏着关键供应链知识。他举 SPIE advanced lithography / photomask 的例子：第一次去 90% 听不懂，第二次听懂一半，第三次听懂 75%，现在仍然有不懂的。重要的不是 paper 本身，而是 paper 与当下量产技术的差异、供应链关系、某个 chemical 的真实成本、某个 tool 的用量、某个化学品短缺如何让 memory prices 翻倍/三倍。这解释了 SemiAnalysis 的方法：在最细的技术/供应链现场建立地图，再把它翻译成市场与投资语言。

## 14:06-20:20 InferenceX：为什么推理 benchmark 必须是“活的”，以及 throughput × interactivity 曲线

主持人切到核心主题：inference 会不会成为世界最大市场？Dylan 的立场很强：token 的使用、AI adoption 是最重要的事情，inference 无论 open model 还是 closed model 都会成为世界最大市场之一，甚至“much bigger than oil”，占 GDP 的多个百分点。

他解释为什么做 InferenceX：传统 inference benchmark 是 point-in-time，测完发布时已经过时；因为模型每周变，Chinese model、US model、开源模型不断更新；软件层 PyTorch、vLLM、SGLang、driver、optimization library 一周更新多次；新的 inference optimization 会持续改变性能。因此 benchmark 必须是 continuously running 的 living benchmark。

InferenceX 的生态支持来自 SemiAnalysis 的行业位置：CoreWeave、Crusoe、Nebius、Oracle、Microsoft、Amazon、Google、OpenAI 等贡献 compute；SGLang、vLLM、Radix、Arc、Infra Act 等 open-source/private infra 团队协作；NVIDIA、AMD、Google、Amazon 也参与，未来加入 TPU 和 Trainium。当前已有超过 $50M hardware donated；TPU/Trainium 上线后会超过 $100M；覆盖约 15 种 chip type，每天跑最新模型，包括 Moonshot、Alibaba、多个中国模型、US open-source models、GPT-OSS、Nemotron 等。

Dylan 强调 benchmark 的核心是 Pareto-optimal curve：interactivity（单个用户响应速度） vs batch size/throughput（同时服务多少用户）。很多比较是拿自己的最优点对别人的次优点，不公平；InferenceX 发布公开 configuration/container，让任何人下载并跑接近峰值的最优配置。

主持人问：这条 throughput × interactivity 曲线是否是最重要的曲线？Dylan 说几乎所有硬件、infra、model、application layer 都 downstream of that curve。不同 workload 需求完全不同：
- 如果是需要超低延迟、超快响应，可以用 speculative decoding、multi-token prediction 等牺牲成本效率换速度；
- 如果是 batch processing 文档，完全不在乎一夜跑完，就可以追求 batch size 和成本效率；
- 今天 AI infra 仍被当成 one-size-fits-all，但以后会按 workload 分化。

他用简单数字解释成本：假设 batch size 100、每用户 10 tokens/s，总吞吐 1000 tokens/s；另一端是一个用户 250 tokens/s，总吞吐 250 tokens/s。某些 workload 会要 4x cost decrease，另一些用户愿意付 4x，因为人的时间或 feedback loop 更贵。Anthropic 的 Cloud Code fast mode、OpenAI priority queue 都体现了这个分层。

## 20:20-23:18 Space datacenter、电力和 intelligence per watt

主持人问 10-15 年后多少 inference compute 会在太空？Dylan 的非共识答案：3-5 年内 space datacenter 基本不重要；20 年后大部分 incremental compute 可能去 space；2040 年可能一半以上 incremental compute 在 space；但 2030 年 sub-1%。关键变量是地面电力建设成本和可获得电力规模。

他给出一个很 aggressive 的 power forecast：到 2030 年，仅 OpenAI + Anthropic 合计就会超过 100GW；再加 Meta、Google 等，总量巨大；到 2040 年会是 terawatts。这里他承认自己的 curve 很 crazy，但认为 inference deployment 会非常大。

主持人问 intelligence per watt 是否在提高，以及离人脑差距。Dylan 说取决于任务，TI-84 做数学的 intelligence per watt 早就超过人类；但 general intelligence 还差 many orders of magnitude。InferenceX 会测 power/cost/interactivity；同等 benchmark quality 的 cost 过去每年下降约 60x，intelligence per watt 约 40x，部分效率来自非电力因素。他认为这种改善还会继续；离人脑差很多，但可以用更多电力弥补，人脑有 sickness、food preference、sleep 等约束。

## 23:18-29:08 核心论点：不是单独硬件、kernel 或模型，而是 hardware-software co-design 才有“100x”

主持人提出三层效率来源：硬件更高效、低层系统/kernel 优化、模型/算法改进。他猜过去三年主要来自 hardware 和 model。Dylan 直接说“我完全不同意”。

他的框架：过去三年 Hopper 到 Blackwell，在 DeepSeek 最优 deployment 上有约 30x improvement；但 intelligence per watt 的总进步更大，来自模型层的进步也巨大：从 GPT-4 到较小的 Qwen 系列模型（ASR 记为 27B total / 2B active）就能做到更强。硬件有显著进步，模型层更大，但真正重要的是 co-design layer。

DeepSeek 是公开可见的例子：DeepSeek V3 的 expert shape 针对 Hopper 优化；V4 会针对 Blackwell 和 Huawei chip 优化。TPU 本身是优秀芯片，跑 DeepMind、Anthropic pretraining 都很强，但跑 DeepSeek 很差；相反 TPU 擅长跑某些 NVIDIA 不擅长的模型。原因在于 model shape、network IO pattern、collectives、attention arithmetic intensity 等都被 model / hardware / infra software 共同优化。

主持人问：中国是否比西方更擅长这种 co-design？Dylan 不同意，他认为西方只是不公开：OpenAI 没告诉外界 GPT-4o 有多 sparse、shape size 等；GPT-4o 大致和 DeepSeek V3 同量级且更早发布。Anthropic、OpenAI、Google 都在按自己的硬件和模型方向做共优化：Anthropic 训练大量用 TPU、推理更多用 GPU；OpenAI 之前更偏 Hopper，现在更偏 Blackwell；Gemini 2/3 与 TPU v6e/v7 等共同演进。

他给出本集标题级结论：如果每层都是 2x，单独相乘似乎是 8x；但跨三层真正 co-optimize，可能不是 8x，而是 100x。NVIDIA、TSMC 也都是跨层优化的公司：NVIDIA 从模型需求到 silicon，TSMC 从 consumables/tools 到 customer chip design。

## 29:08-32:55 下一批技术 bottleneck：memory bandwidth、on-chip stacking、power density、以及“很土但有效”的电力方案

主持人问未来一年最关注哪些 bottleneck。Dylan 先说 memory capacity/bandwidth 是显而易见但仍重要的 bottleneck。NAND cell 已 25 年，DRAM cell 40 年，cell 本身没有大突破；过去五年主要是 HBM 更多 stack、更快。未来几年更有意思的是把 memory 直接 stack on chip，而不是 HBM 与 chip 分开 stack，带来 bandwidth 爆炸。

第二个 bottleneck 是 power density。过去二十年 data center/desktop chip 基本可以按 1 watt/mm² 估算功耗；最新 NVIDIA silicon、TPU 仍大体在这个区间。NVIDIA Rubin 约 2000W，Rubin Ultra 可能 4000W，本质是加 silicon 面积。现在行业终于开始尝试把超过 1 watt/mm² 的 power pump 进 silicon，减少 silicon 需求，但带来 thermal、电干扰等难题。

在 energy 端，他提出一个“土法但可行”的想法：美国能生产数百万 truck diesel engine，生产线上可较容易改成 natural gas，再反向驱动电机发电；维修可用汽车维修工体系。这段的含义不是推荐具体方案，而是说明西方过去 20-30 年缺少硬件/电力创新，因为最好的人才去做广告/软件；现在 AI infra bottleneck 会把人才拉回硬件。

## 33:06-38:44 NVIDIA GPU vs Google TPU：不是谁绝对更好，而是谁与模型架构更匹配

主持人问 NVIDIA vs TPU。Dylan 拒绝简单二选一：两年后 Google 可能一年做 1000 万+ TPU，经由供应链产生 100B+ 美元量级；NVIDIA 会做更多 GPU，可能 500B+ 量级（他强调不是 revenue forecast，只是 thought experiment）。

GPU 和 TPU 各有优势：NVIDIA 有 switch、general purpose；TPU 更 optimized、更 energy efficient、network 对某些架构更优化。Dylan 甚至说他可以“straight face”地论证 GPU 更好，也可以论证 TPU 更好，最后取决于 hardware-software co-design：OpenAI 模型方向可能让用 TPU 很糟；Anthropic/Google 模型方向可能让用 GPU 训练很糟。

底层差异包括 matrix multiply unit size、attention mechanism、expert structure、network topology。NVIDIA NVLink 用 switch，NVLink domain 连接 72 GPU；Google ICI 无 switch，可连接 8000 chips 但要通过其他 chip hop。OpenAI 模型更 sparse，Anthropic 模型仍 sparse 但更 dense。

主持人提 CUDA moat 变弱，因为模型公司可以写 custom kernels，AI coding tools 也能写。Dylan 说所谓 CUDA moat 很多时候不是 CUDA 本身，而是 downstream ecosystem 的模型已经 co-designed for GPUs：DeepSeek、Kimi、Zhipu、Alibaba、Tencent、小米等模型 shape 更适合 NVIDIA；下游 open inference API provider、RL 公司、企业定制 open model 的公司也因此倾向 NVIDIA。若 Google 开源足够好的 TPU-optimized model，同样会把用户拉向 TPU。

对小团队来说，PyTorch / vLLM / SGLang 仍重要；但大 lab 已经 fork/自建，不依赖开源实现。他们会选择最合适硬件，并让 AI 帮忙写配套软件。

## 38:44-44:10 Cerebras、fast token、SemiAnalysis 的“技术 × 经济”文化，以及 Dylan 的触发点

主持人问 Cerebras。Dylan 认为 Cerebras 很创新，在某些市场很强，尤其 fast inference。SemiAnalysis 内部几乎只用 fast mode，并会严格核算每项任务的 token spend 和 ROI；如果某人 token spend 异常，Dylan 会问“你做了什么”，判断是否值得。

他看 Cerebras 的风险：fast token 对高端任务值钱，但很多 use case 不需要 super fast token，会用 GPU/TPU；而真正最值得 fast mode 的通常是 best models。如果未来最强模型是 hundreds of billions、low trillions 甚至 10+ trillion parameters，加上 million context，SRAM-based chips（Cerebras、Groq）跑大模型/长上下文会很困难。收入和使用量目前多流向 best model，即使价格更贵；Fable/Mythos 之类新高端模型发布后，用户快速切换，美元量比 token 量更关键。

主持人称赞 Dylan 特别擅长同时看技术和经济。Dylan 解释 SemiAnalysis 内部约 90 人，一部分是技术/工程/供应链专家，一部分来自 hedge fund；内部会自然争论“技术更接近”还是“成本更重要”。

问到 trigger topics，Dylan 最反感的是“AI has no ROI”和否认模型进步。他认为 benchmark 没涨往往是 benchmark saturated；能力线一直 up and to the right。半导体太复杂，他不怪人不懂；他自己每天也学到新 chemical、新 process step。但他觉得最可笑的是“facts 都在面前，结论完全错”。

## 44:10-50:49 十年视角：co-packaged optics、analog compute、ASIC 多样化与 general-purpose compute 的必要性

主持人问十年期被低估/高估的东西。Dylan 认为 space datacenter 十年期非常 exciting；半导体里 co-packaged optics 确定会发生，争论只是 2027/2028/2029/2030。更长期如 Naveen Rao 的公司（ASR 未明确公司名）试图同时在 silicon layer、software abstraction layer、model layer 创新，例如 analog compute + energy-based models，非常 exciting，可能短期不成功，但值得关注。

主持人问最终生态是否每个 lab / hyperscaler 都有自己的 chip。Dylan 认为每个人都会尝试且不会停止；市场越大，supply chain diversification 越多。当前 AI chip 多数都像：中间大 logic compute die，四周 HBM，上方 networking，下方 PCIe/IO；Trainium、TPU、NVIDIA 和多数 startup 都类似（Groq/Cerebras 做得更怪）。未来硬件和模型架构会 bifurcate；有人会陷入 local minima，有人能跳到更优 minima。

NVIDIA 的优势是 general-purpose parallel compute，因为客户多、反馈广，不一定是每个局部最优，但更不容易押错。各家 ASIC（TPU、Trainium、Groq、Cerebras）可能在某时段/某 niche 很好，但如果模型架构突然换掉 attention，硬件最优点也变。Lab 连一年后用什么 architecture 都不确定；所以会保留 general-purpose compute bucket。

他提到 Google 尽管有 TPU，还以约 $11/hour per GPU 的高价向 xAI 租 GPU；Google 内部还有三个 TPU design program：Broadcom 版本、MediaTek 版本，以及第三个未披露架构，且架构不同。这说明即使 hyperscaler 也承认可能陷入 local minima。

结论：每家都会部署数十亿、数百亿甚至 Google 级别数千亿美元/年的自有 ASIC，但也会有不适合 TPU 的 workload，如 AI for science、drug discovery、Waymo 等可能有不同 algorithmic pattern。市场足够大，会让 niche chip 公司有生意，即使大多数 pie 去 NVIDIA、TPU、Trainium。

## 50:49-56:56 Compute crunch、Anthropic 利润率、资本开支是否会撞墙

主持人问数据中心 buildout 与 compute crunch。Dylan 说每季度部署 compute 都远超上一季度；今年即使考虑 delay 也会有约 20GW，明年 30GW+。是否永远 compute crunch 取决于模型进步，但 Fable/Mythos 级模型让可完成任务 TAM 不只是 2x，而是大得多；世界 compute 没在 6-8 个月内翻倍/四倍，但有价值任务集扩张了。

他给出非常关键的经济判断：Anthropic Q2 已 net income profitable（excluding SBC），Q3 可能 including SBC 也 profitable。Opus token API gross margin 可能 north of 80%，虽然 Bedrock/Vertex deal 会拉低 corporate gross margin。若每租一个 GPU/TPU/Trainium 都能立刻卖 token 且正毛利，那么即使以高于市场价租 GPU，把 compute cost 翻倍，75% gross margin 仍能变 50%，NOI 仍增加。所以在模型能力与需求扩张时，最优策略是继续抢 compute。

主持人担心高增长高杠杆的 buildout 会“go bump in the night”。Dylan 的判断：只要模型能做的经济有价值工作扩张速度快于 compute capacity，价格就会上行；过去 6 个月正是如此。若模型进步停止，潮水会反转，但他听 Anthropic/OpenAI 内部的说法是模型进步仍很强，甚至因为模型帮助写 infra、launch next model，形成 pseudo-recursive self-improvement，模型进步更快。

资本当然是问题。他提 Google 需要融资，虽然有 SpaceX 巨额投资和 gross profit，仍觉得需要 raise capital；Meta 宣布融资股价反应不好。但目前 Amazon 每加 GPU/TPU/Trainium 都在创造 gross profit。

## 57:03-1:04:17 Gigawatt 质量分层：Trainium/GPU 租金、数据中心租金、Google power smoothing、SpaceX/CoreWeave 差异

主持人用石油类比：Saudi barrel 成本/品质不同；同样每个 gigawatt 的 compute 质量也可能不同。Google 的 gigawatt 是否比 neocloud 更值钱，因为 optical switch、power smoothing、经验更强？

Dylan 说已有价格指标：Trainium 对 Anthropic/OpenAI 的 rental rate 低于 $10B per GW；GPU 在过去疯狂涨价前约 $12-13B per GW；SpaceX 与 Google 的 GPU deal 约 $25B per GW（即 $25M/MW/year）级别，非常高。Trainium 早期交易有 floor/cancelable/性能调整机制，Anthropic 帮忙写库让 Trainium 变有用；若 Amazon 今天卖 Trainium，价格可能更高。

数据中心 co-location 价格通常按 $/kW/month：过去约 $60/kW/month，现在很多 $120-160，质量好、客户信用差的可到 $200；印度等 grid/internet 较差的可低到 $80。建设端很多团队会失败：四个人说买了 turbine、要建数据中心，最后 delay/delay/fail；SemiAnalysis 会按 equipment、team、timeline probability-weight 每个 data center。

Google 的特殊能力：在 1GW data center 中放 1.5GW hardware，通过 workload/power management “slosh power around”，让 60-70% power utilization 的硬件合计吃满 1GW；还会与 utility 做 deal，例如 grid 平时可承载 2GW，只有一年三天不行，就让 utility 通知其关停，并用 battery/gas/generator 处理。优秀 operator 不一定拿更高单价，而是卖出更多有效 gigawatts。

Dylan 区分 data center layer 与 compute layer：data center/energy 更多是“有或没有、delay 或不 delay”的二元问题；compute side 更有差异化。给 Anthropic 的 1GW 可能比给 OpenAI 的 1GW 产生更多 revenue；给 SpaceX 的 1GW 也可能因 Starlink networking 和 Tesla power management 经验而更高效。

## 1:04:17-1:09:19 Neocloud 为什么存在，以及 Jensen 的“多极世界”

主持人问：如果五年前看，hyperscaler 应该拥有 GPU cloud，为什么 neocloud 机会存在？

Dylan 回顾他 2023 年写的 Amazon Cloud Crisis：AWS 传统云强在 Nitro NIC、tenant isolation、hypervisor on NIC、自研 SSD/买 raw NAND、自研 Graviton CPU 等，这些在 CPU/storage/security 时代是优势。但 AI cloud 里，这些有时反而伤 performance：AI workload 不像传统云把 socket/GPU 切给许多短租用户，而是整 rack、长期合同、大规模集群；security/time-slicing 优势不那么重要。Google/Amazon 的 custom network 对传统 CPU/cloud 好，但对 AI 不一定；Microsoft 自建 data center 团队在需求翻倍时摔跤，因此不得不买 neocloud capacity。

Neocloud 的优势包括 performance、time-to-market、激励结构。Crusoe、CoreWeave 等团队的 equity 和财富与交付速度高度绑定，愿意 faster build；许多来自 crypto/mining，高波动市场训练了他们。CoreWeave 的 GPU compute 在测试中 performance/reliability 优于 Amazon/Google/Microsoft，但因 balance sheet 约束，通常要提前六个月把 capacity 卖出去，用合同融资支付 PO；SpaceX 则可以先建好运行，再“buy it”，所以 revenue per MW 更高。

Jensen 的棋局：Dylan 认为 Jensen 绝对讨厌只有 hyperscaler 掌握 power 的世界。NVIDIA 投 AI labs、支持中国 labs、backstop neocloud clusters，是为了创造 multipolar world。如果只有 OpenAI/Anthropic/Google 模型，或只有 hyperscaler 建 compute，NVIDIA 会被卡住。今天卖给 Crusoe/CoreWeave/Google/Amazon 的 GPU 对 NVIDIA 价格一样；五年后 Crusoe/CoreWeave 存在会削弱 Google TPU 和 Amazon Trainium，也会让更多 inference 跑在非 closed-source lab 上。

他认为 neocloud/neo-lab 生态像 Wild West，很多会失败，但最强团队会冒出来。Thinking Machines/Tinker（ASR 可能混淆）据说几百 million ARR，即使媒体说人才流失，产品不到 6 个月做到这种 ARR 也很 impressive。Jensen 要的就是“throw bait into water, best fish survive”的多极格局。

---

# 2) Invest Like the Best — Etched: Building AI Hardware to Make Inference Faster and Cheaper

- Source / URL：`https://colossus.com/episode/the-future-of-ai-hardware/`
- 嘉宾：Gavin Uberti、Rob Wachen（Etched founders；ASR 将 Wachen/Uberti 等姓名可能转写不稳）
- 为什么对 投资研究用户 重要：Etched 是 post-ChatGPT 成立、first tape-out 成功、据称已有 >$1B customer demand、融资 $800M 的 inference hardware 公司。本集直接解释其低电压推理、cluster-scale memory、完整 rack、供应链、capital intensity、人才组织与“token factory”视角。
- Source boundary：Colossus 公开页 transcript 需登录；本次基于官方 RSS 音频本机 ASR，非官方 transcript；ASR segment 1624，音频约 5357 秒。

## 02:21-08:24 从“不可能”到 first tape-out：年轻创始人与“旧约束已失效”

Patrick 开场给出关键信息：Etched 创始人 Gavin Uberti 和 Rob Wachen 几年前想做比最大公司更好的 AI chip 时，几乎所有被 Patrick 咨询的人都说不可能；现在他们 first tape-out 就做出 working chip，成为 ChatGPT 后成立的硬件公司里率先做到这一点的公司之一；已有 >$1B customer demand，融资 $800M；产品不是单 chip，而是完整 inference rack，包括 chip、boards、power delivery、interconnect、manufacturing。

Patrick 回忆三年前第一次和 Gavin 聊时，行业共识是：半导体公司最好由 40-50 岁、有多次 ship chip 经历的人创立，两个 21 岁年轻人做不成。Gavin/Rob 的回答是：确实需要某种 naivete，才会相信能比所有 AI chip 更快、更好、更快建公司。但他们发现很多“不可能”的回答都来自已经失效的 silo constraints。

Gavin 举例：半导体/数据中心行业从 EDA tools、power modules、circuit boards、standard cells 到 chip design 都有大量 general-purpose buffer，因为要服务 data center、IoT、edge 等各种场景。但如果只为一个 specific use case 设计，就能改变很多约束。例如 EDA timing signoff 里默认 chip 要能在 freezing temperature 跑 full speed；AI data center 不会有 0°C 冰环境，所以可以取消这个约束，并沿系统做大量改变。每处 20%、50%、2x，最后复合成 inference 上 radically better 的系统。

他们也讲 early supporter Mark Ross（Cypress Semi 前 CTO）一开始说“不可能”，但愿意被说服：要求他们写 white paper、build functional simulation。几晚熬夜后他们拿 simulation 回来，Mark 说“这 works”，但你们至少要 $3M 才能开始；他们最后先筹了 $5M，Mark 从 advisor 到 half-time advisor 再到 full-time CTO。这个故事体现 Etched 用“愿意算数、愿意看证据”的人过滤掉只靠 heuristic 否定的人。

## 08:24-14:30 产品与技术架构：不是 chip，而是 inference rack；pre-fill/decode、low-voltage inference、cluster-scale memory

Rob/Gavin 明确说：Etched 不只是 building a chip，而是 full inference solution / rack：chip、power delivery、board、interconnect、mass production；“production is the product”。

他们把 inference 拆成 pre-fill 和 decode：
- pre-fill：读入大量文本，核心任务不是预测 token，而是把模型 memory / KV cache 设置到正确状态；
- decode：基于 KV cache 生成后续 token。

行业里常见 PD disaggregation：一个 server cluster 跑 pre-fill，再把 KV cache 转到 decoder cluster 生成 token。Patrick 用“loading the gun and firing it”类比，他们认可。

他们批评市场常用懒惰标签：pre-fill chip / decode chip、HBM chip / SRAM chip、3D DRAM、optics/copper。Etched 起初系统研究了各种方向：shared DDR memory pool、advanced packaging、memory die on compute die、3D DRAM 等，发现没有 free lunch：3D DRAM 有 thermal、supply chain、hybrid bonding、flop 等问题，容易变成只能做 decode 的 chip。真正要问的是哪些 metric 最重要。

对 pre-fill，关键是 real workload flops density / MFU（model flops utilization）：GPU 的 peak flops 常常只能拿到 20-50%；更高 utilization 会带来更高 power、thermal throttling，clock speed 自降。因此要先解决 thermal，再增加 flops。

他们抓住 Dennard scaling：voltage 与 power 近似平方关系，电压减半，功耗降到四分之一。于是他们问：为什么不能用比 GPU 更低的电压？行业很多人说不能，但 Bitcoin miner 能在 GPU 四分之一以下电压运行，说明物理上可行。Etched 由此发明/实现 low-voltage inference，首代产品电压低于其他 AI chip 的一半；他们认为未来所有 AI chip 都会低电压化，以在同样 silicon area 里塞更多 flops 且不 thermal throttle。

对 decode，核心是 memory bandwidth，但问题不应是“单 chip 有多少 bandwidth”，而是“full scale-up cluster 有多少 memory bandwidth”。Etched 的 cluster-scale memory 让 chip-to-chip latency/bandwidth 大幅改善，把 full cluster 的 SRAM/HBM 当作一个更可用的 pool。Rob/Gavin 说 Blackwell point-to-point 可能约 4000ns，因此 8x GPU 不会得到 8x token/sec/user；Etched 自研 interconnect stack，拿掉 Ethernet 第二层以上很多通用层，latency 可降低 >5x，让 world size 增大时 time/token 更接近线性下降。

## 14:30-18:23 为什么 inference hardware 是文明级 bottleneck：wall-clock、concurrency、token economies of scale

Patrick 问为什么更高 throughput、更低 cost/token、更好 tokens/watt 是未来十年 bottleneck。Rob/Gavin 把答案放到 productivity：模型已能解决多数人不能解决的问题，会带来科学发现、医疗、教育，但问题是同时多少人能用、任务完成速度多快。

他们用 wall-clock time 描述：如果一个 agent 用 inference-time compute 要一年解决某任务，更快 decode 可压到一个月；科学创新和技术扩散速度会因此提升。并发也重要：今天不可能让十亿人同时用最强模型；付费 plan 用户仍只有几百万，约全球人口千分之一。未来 giant models 会服务 billions of users，inference side 的规模会从 8-chip cluster / NVL72 走向 thousands / tens of thousands of chips；chip-to-chip data movement primitive 的重要性被低估。

Rob 用 iPhone 的 economies of scale 类比：有钱人和普通人买的是同一台 iPhone，因为制造达到规模经济；token 还没到这个阶段，现在像文艺复兴时期手工造 screw。Etched 想把 token serving 做成类似 iPhone/car 的规模经济，让更多人使用最高质量模型。

## 20:13-28:41 两位创始人的动机与公司组织：癌症、GPT-4V、inference cost、kernel 背景、FTC robotics、vertical integration

Patrick 要他们讲个人故事。Rob 说高中二年级参加 martial arts tournament 后受伤，第二天不能走，长期检查后发现背部 tumor，stage 4 bone cancer，医生说生存率低于 30%；两年 chemotherapy、surgery、重新学习走路。这个经历改变了他的“Overton window of human experience”，让他意识到如果活下来必须做非常有影响力的事。

GPT-4V 发布时，他把确诊前背部肿块照片上传，prompt 模型假设自己是 expert doctor，模型马上说这可能是 tumor，应立即 MRI。Rob 震住了：现实里这件事花了他六个月；昨天功能还不存在，今天就能提示。当他想给父母展示时，系统提示 image credits 用完，需要 Pro plan。他由此意识到 AI 会改变一切，但 infrastructure 远远不够；硬件是少数真正能把这种技术更快带到世界的环节。

Gavin 的动机来自另一条线：他运营过 startup incubator prod，孵化 Cursor、AnySphere/Mercor/Thatch 等早期公司；2022 年看到这些公司把融来的钱大量花在 compute，自己想做的 AI 产品一年 inference 可能花数千万美元，意识到软件公司的 COGS 不再接近 0，而是高 inference cost；每家公司的 OpEx 也会因为 coding agents 增加。因此 inference 会变成世界最大市场之一。

Gavin 还讲 17 岁在 Exnor 做 kernel development，因未成年不能签传统 NDA，只能被口头告知“不要分享信息”。Exnor 后来被收购；他也在 Octo 等公司做过。kernel work 让他理解：数学本身不难，真正影响 high-speed decode 的是 data movement，如何在单 chip 和多 chip 间移动数据。这就是 Etched 做 cluster-scale memory 的根源。

他在高中 FTC robotics 中和伙伴 Safran 两人组队，不按传统 20 人校队路线，不追求 outreach/documentation，而是只优化“赢比赛”：每三个月重做机器人，拿过 world record high score，按 OPR 软件开发排名第三。迁移到公司原则就是 velocity、shipping、product、parallelization：不是靠传播赢，而是靠最好的 product；不需要 20,000 人，只要足够聚焦和并行。

Rob 补充“best vendor is no vendor”：尽可能 vertical integrate，从 chip、board、cold plate、interconnect 到 production。Etched 可能是唯一同时自建 rack 和 chip 的 startup。他们早在 chip 回来前就做多轮 rack iteration，用 thermal chip 模拟真实 chip hotspot，提前 build/overpressure cold plate；chip 回来后 cold plate 没发生 leak；在台湾有 factory 和几十人；办公室里复制 test stations；本层有 2MW data center；用 day shift/night shift 做 24/7 development。

## 29:09-33:59 人才哲学：legends + elite naive builders，project-based recruiting

Patrick 问年轻创始人如何招到 elite talent。Etched 的人才哲学是 bimodal：
1. legends：世界上解决过某类最难问题的第一人，而不是第十或第一百；
2. naive/first-principles builders：极度有 drive、敢问 why、不知道“尸体埋在哪”的年轻/高潜人才。

他们用 project-based recruiting：列出各行业最难技术问题，追溯谁做了 zero-to-one、谁名义负责、谁实际做了工作；不断访谈、追踪。第一次 conversation say yes 的比例低，但第 20 次后 say yes 的概率 surprisingly high。拒绝不是结束，而是“等你里程碑更多再来”。

例子是 rack 团队：他们想找一个曾在 NVIDIA 从零建立 HGX/DGX rack 团队、见过规模、仍然 scrappy 的人。映射 NVIDIA rack-scale product 相关团队后找到三个候选人，两位退休，第三位 Brian 原本计划在 NVIDIA 再做一代后退休，最终被说服加入。Brian 创立/领导过 NVIDIA HGX/DGX 团队，关联 NVIDIA revenue 的大头；他能指出“这是一个 billion-dollar lesson”。

与 Brian 搭配的是 Safran 这类年轻 builder：让他一周内 build cold plate，传统 thermal engineer 会觉得荒唐，但他一周做出 contraption，derisk 一个关键 power question。这种组合的机制是：legend 知道 scale 和坑；naive builder 带来高风险高速度。

他们也说，早期 Etched 反而因为 contrarian 而过滤人才：愿意搬到 San Jose、住公司 housing program、加入两个 24 岁创始人、pre-product、挑战最大公司、目标不是 10% better 而是 10x better 的公司，这种人“must be wrong with you”。他们想证明相信自己的人是对的，而不只是证明怀疑者错。

## 34:00-40:25 风险、Bangalore、prefetching 与 40 天 bring-up

Patrick 问 Etched 对巨大风险和速度的态度。一个关键故事是 chip tape-out 前发现某 vendor 严重落后：继续用会延一年，换 vendor 也延一年。Etched 找第三条路：派 12 名顶尖工程师去 Bangalore 六个月，Gavin 自己住了四个半月；每天早上穿过街道去办公室，做代码审计、建工具、现场做设计决策，晚上 1 点回去；美国团队与印度团队 12 小时交接，形成 24-hour development cycle。其他同阶段 chip 在同 vendor 处多年未 tape out，Etched 则靠这种 urgency 推进。

他们总结 binding constraint flood-the-zone 的两个关键：
1. 芯片不能一个人做，要把 great people 带上并激励他们做 crazy things；
2. 决策要快。vendor/factory 等你一个小决定时，整个系统就停了。宁愿把责任下放，让人在信息不完美时作 reasonable call；大多数时候快速正确，比每次等待完美答案好。

关于花钱换速度，他们提出“prefetching”：当一个东西还没完成，但你知道完成后要做哪些事，就提前把能并行的全做完。chip 回来前，他们已经：
- 写完整 software stack；
- 把没有 chip 的 racks 先送到 customer data centers，networking/CPU/storage 先起来；
- 用 700+ FPGAs 把 full reticle chip 放到 FPGA cluster 上，提前跑十多个模型和 full inference stack；
- 用 thermal chip 模拟热分布并做 cold plate；
- 准备 production line；
- 做多版 circuit board。

结果是另一家著名 AI chip 公司从 silicon back 到 rack inference 用 10 个月，Etched 用 40 天。他们还用 day/night shift：有人 10am 到 midnight，另一个 midnight 到 10am；半数公司住办公室旁边。

## 41:40-45:28 供应链、TSMC、power scarcity 与“每兆瓦 token 最大化”

Patrick 问全球供应链什么令人害怕/什么运转良好。Etched 认为被低估的是协作：TSMC、memory vendors 不是买一次就结束，而是要共同优化。Gavin 说 TSMC 的真正价值不只是最强技术，而是 customer service：如果 Etched 建议某个改变能提高 yield，TSMC 会自己出钱做实验；证明确实更好后再迁移到产线。Gavin 说这在钢厂等行业很难想象，也是 TSMC 为什么会赢。

Rob 切到 power availability/time-to-power：想要的 power 越多越稀缺，和大 cluster 类似。为什么 Colossus 可以 $12/hour 卖 Blackwell？因为它是少数能一次买 20,000 张的地方。为什么 500MW data center 难找？同样原因。行业要从每 MW 榨出更多 juice：改善 PUE、改 hardware、提升 tokens/MW。building new buildings 很难；从 100MW 到 1GW、1GW 到 10GW/100GW 都在推极限。

## 43:53-49:33 Etched 相对 Blackwell/Rubin 的替代逻辑：不是绝对速度，而是固定 interactivity 下的 concurrency

Patrick 问 Etched rack 如何替代 Blackwell/Rubin 单位。Etched 的回答不是“某 chip 比某 chip 快”，而是客户真实问题：我有生产 workload，需要保证某个 interactivity/speed；在给定 power 下，我能同时服务多少用户？

他们认为 AI infra 第一阶段只在意 speed：SRAM chips 能打出 thousands tokens/s，激发新 use case；下一波 AI chip 都能达到高速度，真正问题变成：在该速度下多少用户并发？如果我有 100MW data center，我能跑多少 software agents？Etched 硬件通常能在给定 interactivity 下提供一个数量级更多 concurrency，转化为 tokens/watt、tokens/dollar。

当 Patrick 问更大吞吐曲线会启用什么，Rob/Gavin 回到 long-horizon tasks：如果某个数学证明/科学任务用当前模型要 1000 年，10x faster 或 smarter model 可把时间压缩；pretraining 里 wall-clock time 重要，inference 里的 long-horizon agent 也一样。Cursor 让多个 coding agents 一周写出 browser，未来可能一小时内完成。低延迟 decode 的意义是把 year-long compute job 变成 month，month 变成 days/hours。

他们还谈物理极限：NVIDIA chip-to-chip latency 约 4000ns，而 speed-of-light 限制下可做到个位 ns 量级；power efficiency 也可继续下降。未来可能出现类似 fab 的 mega token factory：$40B / $100B single monolithic cluster，服务一个或少数模型的大量用户。

## 49:33-52:46 Kernel、AI 写 kernel、以及不做通用 compiler 的 game selection

Patrick 问 kernel engineering 什么时候会被 AI 完全做掉。Etched 说今天 best kernels 是 human-AI collaboration；ML workload 由 matmul、convolution、chip-to-chip collectives 等 primitive 构成，overlap、memory allocation、retransmit 不 stall pipeline 等细节每处 3-4% 优化，叠加后很大。

三年前 Etched 在软件 stack 上做了 game selection：不重投 graphical compiler / arbitrary graph compiler，不支持 arbitrary PyTorch、arbitrary CUDA、arbitrary ONNX graph；他们预判真正重要的模型不到 100 个，底层数学结构相似，因此选择 kernel-first programming，给高级客户 direct hardware access。短期 out-of-box 不好用，但性能极高；AI coding models 变强后，kernel generation 会越来越由模型完成。他们甚至内部实验让 Codex 基于文档 overnight 把 GPT-OSS 跑起来。

这个取舍也吸引高频交易人才，因为 HFT 工程师也讨厌 compilers、写自己的 kernels。

## 52:46-56:31 Vertical integration 边界、production is the product、以及“专注才会做出最好芯片”

Patrick 问 Etched 会不会向模型、数据中心等上下游扩张。Etched 的原则是“production is the product”，目标是把最多 token capacity online。要做 rack 而不只是 chip，是因为没有 rack 无法规模；采用 CM 模式而不是 JDM，是为规模；但今天不建 data center，因为客户会为了高 throughput 把 power 和 cluster 挪过来，建 data center 不增加 token capacity。

他们认为自然边界是：下游到 chip，上游到 model layer，中间 gap 由 Etched 填。某 frontier company 的 AI chip lead 曾想挖 Etched 架构师，结果反被 Etched 挖走。他加入理由是：他的项目对原公司不是 existential；Google TPU 失败 Google 不会死，Meta MTIA、Microsoft Maia、OpenAI Jalapeno 失败也不致命；但 Etched 只有这个产品。Gavin/Rob 认为世界上最好的 chip 由只做那个 chip 的公司做出来并不意外，NVIDIA 就是例子。

他们还指出，hyperscaler/lab 自研 chip 的目标常常是“别付 NVIDIA tax”，所以 flops density 等不一定超过 Blackwell；而 Etched 必须为生存冒更大风险。

## 57:41-1:00:35 最难 technical episode：50 picoseconds clock alignment

Patrick 问最难一关。Etched 讲 silicon back 后出现 attention 操作结果错误，FPGA 可验证 digital logic，但无法完全测试 analog logic。问题定位到跨 clock domain crossing 的 back-pressure logic 失败，必须把两个 clock signals 对齐到 50 picoseconds（50 万亿分之一秒），且每个 chip 每秒做 20 亿次。有人说不可能，甚至有人因此离职。

他们的方法是先假设可解，再问怎么解：通过让两个 clocks 稍有差异，用 drifting mechanism 等到正确相位，再 lock phase，保证问题不再发生。两周解决，但那是“dark two weeks”。这段体现 Etched 的核心文化：assume it is possible；做 dozens of experiments，可能大多数失败，但只要一个 work 就够。

## 1:00:35-1:07:35 资本强度与 early funding：从 $15M 到必须筹 $100M，TSMC 如何相信他们

Patrick 引出另一个近死时刻：硬件不是软件，必须大量资本。2024 年初 Series A 前，他们 architecture/design 已经足够成熟，准备进入 physical design，需要签 physical design vendor，至少 $40-50M；同时模型变大、MoE 出现，他们意识到不只要 chip，还要 cluster、boards、interconnects、cold plates、networking，全栈成本远超银行里的 $15M。

他们 2023 年底写了 30 页极技术 memo，花 100 小时，讲架构、milestones、市场、use cases、cost/token 等；但 Valley major investors 几乎全 pass：两个刚从 Harvard 出来的孩子，没有 tape-out/test chip，inference 市场不确定，大家认为训练才重要，模型还 hallucinate，可能是泡沫。当时 semiconductor Series A 最大约 $40-50M，而 Etched 估算未来 12 个月要花 $100M。

他们也算过最省模式：创始人不拿钱、吃 ramen，只付 mask 和 tape-out，可能 $30M，但他们不想 half-ass、做 test chip 拖几年。最后进入 survival mode，打给所有可能认识 investor 的人，说明需要 $100M，不然公司不能存在；从 $1M、$2M、$5M、$10M check 慢慢滚雪球，董事会看到 soft commits 加总 $103M，决定 take it。这成为 Series A，之后多轮融资更容易，许多投资人 double/triple down。

TSMC 的早期支持也关键：在他们还没筹到 $100M 时，TSMC 提供非常 favorable terms，相当于多年的 loan。Gavin 回忆一次 semi event，自己 22 岁，是唯一 30 岁以下 speaker；晚宴上遇到 TSMC senior VP，两人都学过数学，拿纸讨论 modern AI models 的 tensor-by-tensor 运行与 low voltage 为什么关键。第二天 TSMC 发邮件说想与 Etched 合作，并一直成为优秀 partner。

## 1:07:35-1:13:15 Contrarian and right：base rate、variant perception、find-away mentality

Patrick 作为 Etched 投资人承认自己强烈 biased。他回忆当时写下自己最大 first check，很多 expert 逻辑严密地说这不可能；但他相信 market 可能极大、创始人对未来约束变化有明确 bets、团队气质极强。他反思如果按 base rate 投资，就该买 index fund；真正的 venture 机会往往来自 base rate 不适用、约束变了。

Etched 补充：许多传统 semiconductor fund 错过 AI chip，像 coding experts 错过 coding companies。看 tape-out 20 年的人会记得很多 first/second/third trial 失败，却容易忘记今天 EDA tools、FPGA、validation 已大幅进步。真正相信 Etched 的人要么是 market/team believers，要么是极技术的 HFT/chip builders，把 microarchitecture、RTL、board design、schedule、software stack 全审一遍；中间层最难懂。

团队内部积累了“看似 impossible 的问题能被解决”的证据。新员工看到红灯会害怕，老员工（也就两年）会说“the puzzle begins”。他们讲 wafer sort 时第一个 wafer 上全是 red squares，validation legend 让大家先呼吸，说 puzzle begins；一天内看到第一个 green square。文化就是盯着深渊、感到恐惧、然后解决。

## 1:13:15-1:16:37 Gen2/Gen3 与 supply chain：三件事与 gigawatts per month

Patrick 问下一代产品会如何不同。Etched 说他们早期试过很多方向：compiler 把模型转 FPGA、把 weights 烧进 silicon、HBM 分给 KV cache/weights 等。现在他们认为要跑世界 majority tokens，必须三件事：
1. 给定 power budget 下最多 flops；
2. chip 间最低 latency，支持最大 scale-up domain；
3. 尽可能多生产。

前两点指导 low-voltage inference 和 cluster-scale memory；第三点在过去一年变得极其明显：“best ability is availability”。如果每天有 1000 chips，就一定有人用；产品不仅要更强，还要能 many gigawatts scale、甚至极限上 gigawatts per month 生产。下一代设计因此更关注 simplicity、减少 parts、反复 assembly/disassembly、缩短 production cycle time、reliability、serviceability。

对 TSMC leading node、HBM4 等稀缺，他们刻意让 first-gen 使用不同于 Rubin 的供应链：Etched 在 4nm、Rubin 在 3nm；HBM 也不同。因此对客户不是 zero-sum，而是 positive-sum：不是 1GW GPU vs 1GW Etched，而是两者加起来 2GW。设计早期就考虑 supply chain，否则“most performant product but cannot produce it”只会变成 podcast。

## 1:16:37-1:26:05 模型未来、dynamism、agent workforce 与 token factory

Patrick 问硬件如何影响模型方向。Etched 的核心类比：机器不必像人一样思考，飞机不按鸟的方式飞。人脑里存储/加载记忆便宜，数学相对贵；芯片相反，数据移动贵、数学便宜，而且 math 变便宜的速度会快于 memory 变便宜的速度。因此下一代模型应更多使用 compute：多副本并行、激活大量 experts、巨大 experts、跨多个 server 同时运行。为了 superintelligence，为什么不能看 billion tokens context、不能用巨大 compute 读完整个短期记忆？

Rob 补充 model dynamism：按 token/user 动态控制 compute 和 memory，动态决定 attention/专家/跨 chip data transfer。随着 context length、model size、per-user compute 扩大，需要更细粒度地把重要 token 分配更多 compute/更长 context，让不重要 token 更省。旧硬件在这种 dynamic computation 上 overhead 很大，迫使架构 blocky/blunt-force。

未来 use case 上，他们提 Noam Brown 关于 long time horizon eval 的观点：agent 任务越来越长，六个月 eval 可能还没跑完，新模型已出现；cluster-scale memory 能把这种月级任务跑得更快。更重要的是不是一个 agent，而是团队：一个人不能造火箭，要团队；一个 agent 也可能不能造复杂软件，可能需要 10 个、100 万个 agent。

Rob 的未来判断非常强：inference 会成为 global GDP 的 majority（可能超过 10 年）；社会生产率指标会从 GDP per capita 转为 agents per megawatt / agents per gigawatt。他甚至说 2027 可能是知识工作中 agents 数量超过 humans 的年份之一（原话：second to last year / majority workforce human，ASR 可能有误，但方向是 2027 agents doing knowledge work > humans）。国家层面，能源效率决定多少 agent workforce；如果一个国家有 billion concurrent agents 24/7 工作，技术扩散会是人类史上最大。

他们用 MoE/brain 类比解释规模经济：人脑也不是全部同时 active；MoE 每个 token 只用一小部分参数。如果有大量用户共享硬件，就可把“brain”切成 experts/servers，让不同 traffic 同时使用不同部分，降低 cost per thought / cost per token，形成 giant distributed brains。

Patrick 问会不会有 trillion-dollar individual data center？Etched 回答 absolutely，只是时间问题。Fab 已从 $1B 到 $10B、$40B，wafer cost 随规模下降；token factory 也会如此。

最后 Patrick 问若外星人问机会是什么，他们的 framing 是：thinking is really valuable，每家公司都运行在 thinking 上；现在机器能接近/超过最优秀人类思考，building machines 是巨大机会，而运行这些 thinking 的方式会完全不同。未来 quadrillion-parameter models 要在 billion users 上同时运行，必须有新的 roadmap。Rob 说我们处于 intelligence 生产成本远低于其价值的时代，未来多年/几十年都将 token supply shortage；最大公司会是生产最多 global token supply、拥有 token supply chain 主要环节的公司。并且系统必须越大越便宜：不是 10x token 买 10x servers，而是 cluster-scale memory 等带来 economies of scale。

---

# 3) The Cognitive Revolution — Neural Concept: 1000 Designs a Day: AI-Native Engineering

- Source / URL：`https://www.cognitiverevolution.ai/1000-designs-a-day-neural-concept-s-thomas-von-tschammer-on-ai-native-engineering/`
- 嘉宾：Thomas von Tschammer，Neural Concept co-founder & Managing Director US
- 为什么对 投资研究用户 重要：从 AI infra 延伸到“物理世界工程软件/工业 AI agent”落地，覆盖汽车、F1、aerospace/defense、consumer electronics；有 JLR 50→1500 design/day、battery cool plate 80% cycle reduction、20% cooling improvement、15% lighter、OEM 48-60 months vs China 18-24 months 等可直接用于投资研究的数字。
- Source boundary：官方网页自动生成 transcript；页面提示可能有 wording/speaker errors。

## 00:00-05:41 主持人 framing：物理工程进入第三次革命

Nathan Labenz 开场把 Neural Concept 放在物理产品工程的历史脉络里：从手工 drafting/physical prototype，到 CAD + finite element analysis，再到 physics-aware AI models。传统 simulation 让 prototype 数从一年 5-10 个提升到 50-100 个，但 crash simulation 等仍可能在大型集群上跑几天。Neural Concept 的模型可在 minutes 内给出近似 physics solver 的结果，并有 Engineering Copilot 调用 domain-specific prediction models 和 CAD platforms 做设计改动。

主持人强调这是一种“agentic optimization + domain-specific validation”的 RL recipe。JLR 已经每天做 1000+ aerodynamic tests；人类工程师因此探索更大 design space、做更高层 trade-off，并看到 Move-37-like designs。F1 也是重要场景，因为 F1 对 aero simulation CPU hours 有监管限制。

## 05:41-14:29 汽车如何被设计：从撞车 prototype 到 simulation，再到 AI surrogate

Nathan 先请 Thomas 给 AI 听众补工程背景：工程师日常如何设计物理产品，AI 前的 iteration loop 是什么。Thomas 用 automotive 举例：过去造新车要做 physical prototype，把车撞墙，观察乘客/行人安全；如果不行，改设计、重造 prototype，一年只能探索 5-10 个。40 年前进入 CAD/CAE/finite element analysis 后，可以在电脑上模拟 crash，不必每次造物理车，一年可测试 50-100 个设计。但 solver 复杂、昂贵，单次 crash simulation 可跑几天，大集群也是瓶颈。

Nathan 把它类比到 protein folding：模型学到某种 intuitive physics，把 compute 需求降几个数量级，改变可探索 design 数量。Thomas 列出汽车中的 physics domains：aerodynamics（尤其 EV range）、crash safety、thermal management（battery/engine/ventilation）、electromagnetism（electric motor）、structural dynamics、chassis 等。大型 OEM 有数千工程师分别负责这些 physics 和 components。

Nathan 问模型输入/输出、是否训练在 simulation data 上。Thomas 说可用 simulation data、test data、external data；有些现象传统 solver 也不准确，可用 wind tunnel/test loop 测量，这叫 hybrid training。AI 不是完全替代 simulation，正如 simulation 没完全替代 prototype；prototype 和 solver 会更晚、更精确地使用，AI 用在早期探索更多候选并筛到值得高保真验证的设计。

Thomas 明确说今天还没有一个 off-the-shelf aerodynamics foundation model 可满足所有 OEM 精度要求；Neural Concept 会提供 pre-trained models，但仍需用客户的 company-specific data fine-tune，因为每家公司有自己的 know-how、best practices、requirements。模型会随每个 data point retrain/improve，成为知识保留 flywheel。

## 20:32-28:26 JLR 与 battery cool plate：AI copilot 不是 black box，而是扩展设计空间

Nathan 问 AI copilot 如何改变工程师体验。Thomas 给出公开案例：Jaguar Land Rover 在 NVIDIA GTC 展示了与 Neural Concept 的 external aerodynamics workflow。原来传统 solver 已高度并行优化，每天约 50 个 design evaluations；AI 生产后每天 1500 个，约 30x。这里本质是 studio aesthetics 与 aerodynamic drag/range 的 trade-off。

另一个供应商案例是 battery cool plates：development cycle 缩短 80%；由于探索更多设计，还能 cooling 20% better、battery part 15% lighter。Aerodynamics 中也能找到 2%、3%、5% 更 aerodynamic 的设计，这对汽车 range 可能很大。

Nathan 用 protein generation 类比 AI 从 constraints/point cloud 到新设计。Thomas 说今天不是 black box：不是把 spec sheet 丢给 AI，回来一辆最优车；而是 AI ingest specs、理解要求、set up base model，并与 engineer interactive。工程是多目标 trade-off：cost、design、performance、discipline constraints；domain expert 必须在 loop 里做最终 trade-off。AI 从“工程师凭直觉手动 tweak”变成“AI 提供 solution space/options，工程师探索并选择”。AI 也开始能调用 CAD、发送 geometry、调用 high-fidelity solver 自动验证。

## 28:26-35:17 Jensen 五层蛋糕、frontier reasoner + tools、以及为什么工程不像软件一样可完全 black box

Nathan 问 copilot 底层是哪些模型，frontier models 是否足以使用 CAD。Thomas 引用 Jensen Huang 的 five-layer AI cake：foundation 到最上层 application layer；真正重要的是 application layer，把 generic models 带入具体复杂环境。Neural Concept 做的就是工程 application layer：给 general-purpose reasoners 提供 3D geometry、injection molding constraints、CAD/solver tools 和 domain context。

Thomas 明确说 plain LLM 没有 very accurate 3D reasoning，也远不能解 fluid dynamics equations。Neural Concept 2019 年起源于直接 ingest 3D geometries 并从 physics 学习的模型，可预测 aerodynamics、deformation、temperature；今天这些 specialized physics-aware models 被 agent 调用。

Nathan 类比软件：如果 specs 清楚，AI 可直接 deliver；工程 specs 是否更清楚？Thomas 说 automotive RFQ/specification 仍然并不 fully streamlined/automated，仍有大量 human interpretation。汽车是无限 coupled constraints：改一个 under-hood component thickness 可能影响 engine block 等。AI 已能从 specs 到 3D，但不如软件 black-box，因为问题维度更大、trade-off 更多。AI 会消除 low-value tasks：手动 setup simulation、CAD 画新设计；但不会很快替代 final design decisions。

## 35:17-40:39 自动化边界、商业模式与 disruption

Nathan 挑战：如果 agents 能从 ideation、subsystem constraints、3D representation、simulation 全流程自动化，为什么不能设计下一年车型？Thomas 承认这些任务今天在某些特定产品/discipline 上已经能自动化，比如 battery cool plate、aero、crash；但整车 black box 有更高复杂性。工程师应保留 final trade-off，因为这也是 OEM 差异化所在。未来 OEM1 vs OEM2 的差异来自谁能把 engineering IP 深度嵌入 AI workflows。

Nathan 问 pricing 是否还能 seat-based。Thomas 说会走向 value-based，因为价值不再 tied to individual seat，而是 tied to agents / outcomes。如何衡量 value 取决于行业和应用，但 agent era 会推动软件定价从 seats 转向 value。

Nathan 问 100 年汽车公司是否会被新进入者颠覆。Thomas 认为会有 massive disruption，并在能采用 AI-driven workflows 的公司与不能采用者之间拉大 exponential gaps。传统 OEM 工具、团队、know-how、governance 都运行多年，改变困难；digital-native hardware companies（做硬件才十年）能更快采纳，跨多个应用在一年内获得巨大 speed-up。

## 40:39-48:27 中国速度、manufacturing constraints、foundation models for aerodynamics

Nathan 提到 Detroit 历史、欧美车企面对 AI-native company 的挑战可能比 70/80 年代日本竞争更严峻。Thomas 给出关键数字：Western Europe / US OEM 从 launch decision 到制造落地需要 48-60 months；中国是 18-24 months。欧美公司都在问如何从 60 个月到 24 个月。

Nathan 担心过度优化 design 会增加 manufacturing 难度。Thomas 说 optimize design 必须同时 optimize for manufacturing：把 stamping、manufacturing rules、cost constraints 尽早嵌入 design iteration，使 AI 只探索可制造且成本合理的 design。这里吸取 additive manufacturing 十年前的教训：以为可以自由设计、打印一切，但成本和 scale 不成立。

Nathan 问中国速度优势来自 design 还是 manufacturing。Thomas 认为更多来自后者：更 agile 的 plant rollout、plant operation highly automated，欧美工程高管已去中国学习工厂设置再带回本国；design 端中国公司也因没有 legacy processes/tools，能选择今天最好的工具，而不是昨天最好的流程。

Nathan 问从 per-customer model 到 aerodynamics foundation model 的重要性。Thomas 说 foundation model for aerodynamics 会很快出现，因为 aerodynamics 相对 low-hanging fruit，physics 虽复杂但跨 component 相似、可复制。Neural Concept 自己也研究，但即使不是第一个做出 foundation model，也会做 domain-specific integration layer，让它可在 100,000 人组织里部署、可视化、tweak geometry、与 conditional models 和工具结合。

## 51:21-58:03 Formula 1：CPU-hour cap、性能治理与“token-maxing engineer”

Nathan 对 Neural Concept 服务 F1 很感兴趣，尤其 F1 对 aero simulation CPU hours 有明确监管限制。Thomas 解释：F1 team 的 CPU hours 被 capped，用于 aerodynamic simulations；更有意思的是 cap 是 sliding scale，取决于上一年排名。排名越高，下赛季拿到的 compute 更少，意图是让比赛更平衡，避免 budget/compute race。Nathan 认为这是 AI governance 的有趣先例：把 simulation compute 与 performance 直接绑定并监管。

F1 工程文化是每个 OEM 想达到的状态：车每场比赛之间都在细节迭代，团队极度 agile，design iteration 自动化程度高。Neural Concept 用 F1 压测 workflow，因为如果能服务 F1，就更可能服务传统 OEM。

Nathan 问工程里的“token maxing”长什么样。Thomas 描述：F1 engineer 看下一场赛道 profile（直线多、弯道多、需要超车等），翻译成 aerodynamic requirements；AI-driven workflow overnight 生成并评估成千上万甚至 tens of thousands design configurations；第二天早上 aerodynamicist 得到 interactive dashboard，看到 thousands data points、trade-offs、对应 design，并选择周六比赛用的方案。token maxing 在工程中就是 overnight fully automated exploration。

## 58:03-1:06:15 Move 37 moments 与价值量化

Nathan 问是否有 Move-37-like 惊喜。Thomas 说这是工作中最令人兴奋的部分：工程师早上看 AI 结果，回来告诉 Neural Concept：AI 设计了一个我绝不会认为可行的 design；如果你给我看，我会说 scrap it；但它比我们任何方案都好。工程师因此回到 dashboard 研究为什么它有效，重塑直觉。

Nathan 要求校准 surprise 大小。Thomas 说不会 reinvent physics；模型仍 grounded by physics，不会给出违反物理的疯狂方案。但确实有工程师认为是 blunder/错误，后来发现不是，从而改变问题 intuition。

Nathan 问这值多少钱、客户是否愿意为高端模型付费。Thomas 说价值很直接：供应商若因为更好 battery cool plate 多赢一个 OEM program，就是 millions/tens of millions；若设计从 6 个月变 3 个月，省下 3 个月可优化 manufacturing process，让 part 便宜 10%，进而赢更多项目，价值 tens/hundreds of millions。OEM 侧，一辆车从零开发通常 billion-dollar 级别；开发周期缩短 20% 就是 hundreds of millions 的量级。

## 1:06:15-1:12:33 未来 1-2 年 OEM 该达到什么里程碑，组织阻力如何化解

Nathan 问美国车企未来 1-2 年必须实现的 AI 里程碑。Thomas 给出路线：
- Year 1：在 crash safety、aerodynamics、powertrain 等核心部门，让每次 iteration AI-led，即 AI workflow 能 orchestrate different tools；这可带来 20-40% speed-up。
- Year 2：打破 crash、aero、thermal、manufacturing constraints 等 silo，让 agent 跨 discipline orchestration；收益会 compound，cycle reduction 可到 50-60%。目前还没有 OEM 在整车 scale 完成，但特定 discipline 的 multidisciplinary automated workflows 已看到 50-60%。

Nathan 问工程师接受度。Thomas 说两端都有：很多工程师像 artists，享受手动 iteration、物理 intuition、30 年工作方式，因此自然有 resistance；同时 ML teams/methods teams 是 early adopters，想试 frontier models。关键是让传统工程师真正上手，一旦跨过 barrier，看到 AI 让自己不用 setup simulation、等待 solver，而能更专注 design decision，反应会变得积极。

## 1:12:33-1:24:30 差异化、自动驾驶新 form factor、RL loop、机器人与物理丰裕

Nathan 说今天汽车已经高度同质化，AI 会不会带来更有意义 differentiation。Thomas 说 autonomy 会推动 car commoditization：如果车能自动来接送，人不再需要拥有/驾驶，车可能更趋同。但在此之前，winning companies 会把品牌/engineering best practices 编码进 AI workflows，从而拉开差距。

Nathan 问自动驾驶是否会带来新 form factor。Thomas 说今天多数 robotaxi 仍是可人工驾驶的车改装为自动驾驶，如 Waymo 的 Jaguar I-PACE，监管也要求可驾驶；但 Zoox 这类 autonomous-first vehicle “not a car”，完全围绕 autonomous 设计，成熟后会出现更多不同概念。

Nathan 提出 end state：所有东西都是 RL loop，从 product strategy、virtual market testing 到 design/simulation，甚至像生成视频一样“说出”复杂机电产品。Thomas 认为能力上没有 fundamental gap；主要约束是 infrastructure、governance、data flows。physics solver 仍然是 grounding tool，也是 engineering model 的 fuel。

Nathan 问 humanoid/robotics 是否是制造端速度的关键。Thomas 认为 robots 会重要，但是否 humanoid 是另一回事；人类形态不一定最适合工厂。机器人要在工厂 scale 有用，还需要 AI models 和 hardware breakthroughs（物理交互、autonomy、防过热、灵巧手等）。但他同意 humanoid/general physical intelligence 是 second-order；更上游的 general automation/intelligence、设计 machine tools 等先能解决很多 bottleneck。

Thomas 最后强调：外界可能没意识到 AI-first product design 已经在工程行业发生；automotive、aerospace & defense、consumer electronics 未来几年很多 design/performance/product breakthrough 都会由 AI-driven workflows/iterations 参与。

---

# 本次扫描中未完整深读但值得 投资研究用户 注意的新增条目

1. Latent Space — Genesis Molecular AI / diffusion for drug discovery（2026-07-01，109 分钟）：高相关（AI for drug discovery、protein-ligand co-folding、PEARL、OpenBind、SAPPHIRE agentic discovery）。网页有长 show notes，但未拿到完整逐字 transcript；若下一轮有时间可 ASR 深读。
2. Dwarkesh — Grant Sanderson: AI and the future of math（2026-06-30，约 94 分钟）：官方网页有完整 transcript；高质量但偏 AGI/math epistemology，今日优先级低于 semis/inference/industrial AI。
3. Bloomberg Tech — Meta to build cloud business selling excess AI compute；Chip stocks best quarter：短、新闻型，适合快讯跟踪，不适合深度纪要。
4. a16z — Rick Rubin on AI creativity；Building AI for Creators：偏创作者/文化，投资相关性低于本次三篇。

# Source health

- blogwatcher binary：`[local]/.local/bin/blogwatcher-cli`；输出：无 tracked blogs，scan 无文章。因此本次 RSS 证据覆盖不来自 blogwatcher。
- 官方 podcast RSS：18/18 成功返回，raw RSS 已保存。
- ASR：Training Data 与 Etched 音频下载成功；faster-whisper `base.en` 转写完成。
