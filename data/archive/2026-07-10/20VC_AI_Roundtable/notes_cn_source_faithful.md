# 20VC：Sam Altman 提议政府持股、企业不信任前沿模型、DeepSeek 自研芯片 — 中文深度纪要（source-faithful）

- **节目/来源**：20VC / The Twenty Minute VC；YouTube 版标题：*Sam Altman Offers Trump 5% of OpenAI | Enterprises Fear Frontier Models | DeepSeek Builds Own Chips*；RSS 版标题：*20VC: Sam Altman Offers Trump 5% of OpenAI: Fool or Genius? | Alex Karp Sounds the Alarm: Enterprises Fear Frontier Models & Questionable ROI of AI | The Rise of Chinese Open Source: Deepseek Building Own Chips*。
- **URL**：YouTube https://www.youtube.com/watch?v=LUkbZHSQIog；Podcast RSS 页面 https://thetwentyminutevc.libsyn.com/20vc-sam-altman-offers-trump-5-of-openai-fool-or-genius-alex-karp-sounds-the-alarm-enterprises-fear-frontier-models-questionable-roi-of-ai-the-rise-of-chinese-open-source-deepseek-building-own-chips
- **发布时间**：RSS 2026-07-09 07:07 UTC；YouTube 2026-07-09 14:17 UTC。
- **Source boundary**：主纪要基于 `ytbtranscript.com` 返回的 **third-party YouTube subtitle-derived transcript**（2576 个片段，plain transcript 约 96k chars）。`youtube-transcript-api` 在本机被 YouTube IP/bot block；技能目录内未找到 `fetch_video_subtitles_ytdlp.py`；`python3 -m yt_dlp --dump-json` 也被 YouTube 要求 sign-in / bot confirmation。故本纪要不是官方逐字稿，保留 ASR/字幕错字风险，例如 Fable≈Claude/Anthropic 模型名、Clling/Kling、SAS/SaaStr 等。
- **本地素材**：原始字幕 JSON：`[podcast-archive]/2026-07-10/20VC_AI_Roundtable/ytbtranscript_raw.json`；时间戳稿：`[podcast-archive]/2026-07-10/20VC_AI_Roundtable/transcript_timestamped.txt`；本文：`[podcast-archive]/2026-07-10/20VC_AI_Roundtable/notes_cn_source_faithful.md`。

## 对 投资研究用户 的投资相关性（短导读）

本期是 20VC trio/roundtable，对 AI 投资链条的多个核心变量给出一手投资人视角：**政府介入前沿 AI、OpenAI/Anthropic 监管叙事与股权/税收外溢、创始人与后期投资人的稀释敏感度下降、企业客户对前沿模型 ROI/IP 风险的怀疑、Meta/xAI 式“过剩 compute 转 neocloud”的市场含义、Nvidia 通过 credit support/put-back 权利扩客户的周期风险、Anthropic/DeepSeek 自研芯片背后的垂直整合逻辑、中国开源/视频模型竞争、企业 AI 服务化部署瓶颈，以及 AI 独角兽二级流动性对人才市场的影响**。这些都直接映射 AI infra、semis、enterprise AI、private-market valuation / liquidity 的跟踪框架。

---

## 00:00–03:59 Washington 解除 Fable/前沿模型 19 天限制：软件从“自由 shipping”进入预审批时代

主持人开场列出本期议题：Washington lifts the 19-day “Fable Five” ban；OpenAI floated giving US government 5%；DeepSeek developing its own chip；Meta/compute cloud business causing stock jump。随后切入第一个问题：Washington 解除 19 天 ban，对 OpenAI/Anthropic 未来权限、审批意味着什么。

一位嘉宾把它定义为一个 **quagmire**：
- 现在已经被卷入某种 **pre-approval process**，而且结构化预审批流程尚未最终定稿。
- 六个月前还可以像“自由人”一样 ship software；现在 shipping 前需要 Washington permission。这是一个大的制度变化。
- 他承认 cyber security / safety 维度可能存在某种流程理由，但商业上，其他条件相同，企业显然不希望每个重大动作都要行政批准。
- 他用美国 vs 欧洲作对比：美国经济动态性部分来自不需要太多 permission；欧洲有更多 permission/regulatory regime。现在美国 AI 也在往这个方向靠。

另一位嘉宾补充：AI safety 讨论很久了，虽然这次不是完全同一问题，但相关；这是 LLM/AI 走向成熟后的“grown-up state”——无论喜欢与否，都会有这种 oversight。他认为这次具体 ban 的 immediate impact 可能小，因为所谓 Fable 会很快进入 variable / per-token pricing，普通人因太贵而不会使用，直到逐步进入 standard Opus/Sonnet 体系。但真正改变世界的，是 Sam Altman 提议美国政府拿 5% 这一点；相比某个模型的监管，后者更有制度和资本市场含义。

---

## 04:00–16:05 OpenAI/Altman 提议政府持股 5%：alignment 还是“自愿请监管进门”

主持人顺势问：如果前一个话题是政府意见/政府介入，Sam 说“take 5%”该怎么看？

### 反对方：不是 security 问题，而是把宏大叙事变成政治索取入口

一位嘉宾从 first principles 问：Sam 想解决什么问题？他的判断是，这不是刚才 cyber/security 风险，而是某种宏观再分配叙事：AI 会毁掉 jobs，所以要 give back。OpenAI 最近还出了一个九点计划，讨论由于 AI 经济学，是否需要重构美国税制：更多 tax on capital gains、更少 tax on income，因为 AI 可能让很多劳动者失业，所以降低劳动税负、提高资本税负。

这位嘉宾认为这个框架“delusional”和过早：
- OpenAI 是一家增长很快的公司，但目前还没有可辨识的就业冲击。
- 它还有更直接的问题要解决，例如“被直接竞争者 lapped”（字幕如此，语境应指竞争压力）。
- 如果 5% Anthropic/OpenAI stake 价值约 $50B，而美国国会每年筹资/预算规模约 $5T，那么整个“捐赠”只相当于一年收入的 1%。用这样一个数字去要求国会重构整个税制，非常不现实。
- 一旦打开政治流程，就不可控：从 pre-approval 到 ownership interest，再到 board member，都有可能延伸。
- 他用强烈比喻说，这像改写 *Atlas Shrugged*：John Galt 自己跑到 Washington，说“为什么不更多监管我、拿走我的东西”。

他进一步警告：如果 OpenAI/Anthropic 自己不断说 AI 将对 $30T 经济、50% 白领岗位造成冲击，那么政治系统不会满足于 5%。Bernie Sanders 已经说过想要 50%。如果真的会摧毁中产白领岗位，$50B 或每人约 $140 根本无法“keep the wolf from the door”。所以要么他们的灾难叙事是错的，5% 是不必要的；要么叙事是真的，那 5% 远远不够，而且会激发更大政治索取。

### 支持/解释方：5% 虽小，但对大组织 alignment 的心理效果异常大

另一位嘉宾最初也觉得这是“kiss the ring”，尤其在一个被他形容为 crypto / meme coin 利益冲突很多的 administration 下。但他换位思考后认为，Sam Altman 不仅是 OpenAI CEO，也是极成功的 startup/scaleup investor，非常懂关系、融资、叙事和 scaling。他把 OpenAI 当 super startup 来跑。

他从投资组合经验解释：
- 小公司给大 partner 5% 股权，在经济上对大 partner 可能不重要，但会创造超出预期的 alignment。
- 类似 Klaviyo 给 Shopify 股权，不是因为大公司经济上 care，而是让小公司进入大公司的 boardroom / mental map。
- 如果给美国政府 5% 可以让 OpenAI 成为“good guy”、重回类似 Stargate 2.0 时 Sam 站在 Larry 等人旁边的政治位置，从 investor 角度或许可以接受 dilution。
- 他把 5% 看成 anchoring：Sam 可能知道更大政治索取会来，所以先把讨论锚定在 5%，而不是 20% 或 50%。他认为 Sam 是非常 thoughtful communicator，会提前 socialise ideas，看似随口一说，实则为未来路径铺垫。

### 反驳：Microsoft 已持有 OpenAI 约 30%，并没有变成 besties

反对方给出两层反驳：
1. **商业例子**：Microsoft 持有 OpenAI 约 30%。如果 ownership stake 足以带来 alignment，他们应该是 besties，但现在更像僵住的婚姻，想离婚却付不起税/代价。
2. **政府逻辑**：政府不是 profit-maximizing entity。TARP 时政府没有 voting control，也会管银行付薪、谁能拿钱。即使 JP Morgan 觉得自己不该被同等对待，也会被卷入。

因此，他认为“政府拿一点股权就会 align with you”不是 politics 的运行方式；相反，一旦你自己承认技术对就业和经济有灾难级影响，就会为更强监管、更高索取打开口子。

### 为什么聪明人会这么做？因为他们真的相信“世界级影响”叙事

主持人追问：这些人并不笨，为什么还会这样做？回答是：因为他们相信这项技术影响极大，而且这种 belief 也是他们能 raise billions 的叙事基础。若去融资时只说“我需要 $10B 做些东西，对部分 compute 有小影响”，不会有人给钱。必须讲世界最大故事，才能拿到现在 $160B 级别资本。

但一旦自己和员工都相信“这东西危险、会改变 jobs、cyber、经济”，那么监管、税制、政府持股这些事情都会成为 next-level logical consequences。反对方只是认为前提不成立：AI 重要，但不会让 50% 美国劳动力失业，所以这些预防性制度安排是 wildly early / wildly overreaction。

---

## 16:05–28:07 AI 时代融资/稀释敏感度下降：5% 对很多创始人已“不算什么”

讨论从政府持股转向 startup dilution。嘉宾指出，OpenAI 的提法本质上是“companies should give 5%”，等于替其他公司（包括 Anthropic）也在 volunteer other people’s capital。

一位嘉宾把这和互联网早期做对比：1990s 的互联网监管环境对创新极友好，包括 telecom deregulation、Section 230、长期 no sales tax。那时硅谷对 Washington 的信息是 leave us alone；而今天 AI 公司的姿态是“不要错过我们、请监管我们”。他甚至说 oil & gas 看到 AI 公司主动要政府持股和审批，可能会觉得这些人疯了。

随后 Jason 提出一个更 micro 但投资上很重要的点：AI 时代 massive dilution 被 institutionalized。很多热门 startup 表面上每轮只稀释 5%–6%，但 stub rounds、up rounds、half rounds 加起来可能已做 16、17、20 轮。以 Anthropic 为例，Dario 只拥有 1.x% equity，Sam nominally zero；这让 5% 看起来“不是什么”。

Rory 同意这改变了传统模型：
- 过去 Microsoft、Bill Gates、Paul Allen、甚至 Ballmer 都持有可观 equity；今天顶级 AI 公司创始人可能只有 1.x% 或 zero。
- 这会让 dilution conversation 的 edge 消失，因为花的是 someone else’s money。
- 对 seed investor 来说，传统“入场估值乘以 2”作为真实成本（因为未来稀释）可能要改成乘以 4。例如 Harry 做 $60M seed，Rory 会认为真实 entry price 是 $240M。

他们讨论 Carta 数据显示 dilution per round 在下降，可能因为 pricing 更高、每美元稀释更少。但 Jason 观察到的现实是：single-round dilution 小，但 rounds 太多。Ramp 公布过 12 轮，Jason 猜实际加上 stub rounds 可能 24 轮。Databricks 则“诚实”地命名到 Series M。

围绕 Linear 的例子，Harry 称赞 Karri/Linear 极其 disciplined，只融资两轮、拒绝 VC intro。Jason 追问：这在 2026 是否是正确选择？如果 outcome 是 $1B–$5B，资本效率保留 optionality；但如果 prize 是 $100B 或 $1T，少融资、少投入可能降低成为巨型公司的概率。Rory 总结为 **optionality vs upside**：如果 prize 是 trillion dollars，任何能增加到达概率的资源都值得；如果 prize 是 $1B–$5B，过度融资会让 $1B exit 的 optionality 消失。

另一个变化是 founders 不再害怕让 last-round high-priced investors 赚钱。Jason 说，他那一代创始人会担心高价轮投资人 block exits 或要求 2x；现在 founders 相信投资人会接受 1x，不会 blocking / threats。Rory 同意：late-stage investor 本来只承担 valuation risk，downside 就是拿 1x，应当接受。这会让 founder 更敢拿高价成长轮，因为它增加 upside optionality，同时不一定 preclude downside optionality。

---

## 28:07–33:08 Alex Karp 警告企业不信任前沿模型：ROI、IP/data 和 DoD 价值观风险

主持人提到 Alex Karp 在 CNBC 的 viral clip：他说大企业对 frontier model providers（特别是 Anthropic/OpenAI）的 skepticism 从未这么高；企业也质疑 AI ROI 是否真实。

Rory 完整看了视频，认为虽然 Karp 风格看起来“crazy style”、有个人 baggage，但核心两点 spot on：
1. Corporate America 正在问：我花了这么多钱，到底有没有得到东西？这是 ROI 问题。
2. 企业担心：我是否把信息都给了模型商？他们是否训练/学习我的业务，然后把我的 business 卖给别人？我的 IP 怎么办？

他指出这对 Palantir 是自利但有效的 positioning：Palantir 可以说自己能解决这些问题；当天 Palantir 股价上涨约 9%。

Jason 只看了 clips，但同意 application side 对 token/model cost 敏感。他认为 Karp 对 OpenAI/Anthropic 是否真的训练企业数据的指控可能略夸张，但 enterprise data concern 是真实的。他用 HubSpot 例子说明：HubSpot 曾计划把客户 prospecting data pooling，让所有客户使用更 validated contact set；客户强烈反弹，一周内 rollback。这说明 B2B vendors 会不断 push limits：为了让 LLM/AI 更好、在竞争和增长压力下，它们会 tempted to cut corners on training privacy。OpenAI/Anthropic 已被指在 books、YouTube training 上“lied/pushed envelope”。Salesforce 等老 B2B 公司也会有同样诱因。

Rory 进一步补充 Karp 还抓住了 defense/customer values 问题：Anthropic 对 DoD 用法有自己的“opinions”。Karp 的定位是：当客户付你几百万美元时，他们不要你的 opinions，只要你的 technology。这对政府和高度监管行业销售尤其重要。

---

## 33:08–42:41 Meta 转向出售 AI compute / neocloud：市场为何给 Plan B 10% lift？

主持人用讽刺句转场：“those that can do, those that can’t open a cloud business to sell excess compute.” Meta 推出 MetaMP / compute cloud business，售卖 AI infrastructure，既可以 hosted，也可以 raw GPU by hour，类似 CoreWeave/Nebius。市场反应是单日涨 10%，创五个月最大涨幅。

Jason 第一反应是：why not earlier？如果有 capacity，为何不 lease？Amazon 当年 AWS 也来自 excess e-commerce capacity；SpaceX 也做了类似事情。Meta 现在 massive infrastructure spend，cash flow 也不是“完全不需要钱”，出租 compute 讲得通。

Rory 把 Meta 和 xAI/SpaceX 类比：两家公司都买了大量 compute 来打造 proprietary assets；如果 proprietary assets 没有按预期建立，就把 compute 卖给别人；市场都给了正反馈。他提出两种市场解释：
1. **Goldilocks scenario**：短期有 excess compute，卖掉很好；长期 Meta 仍会找到 AI-centric use case，把 compute 收回来使用。
2. **云业务本身好**：市场认为即使原 plan failed，做 hyperscale cloud provider 也是好生意。

但他也指出坏情境：如果很多公司都走 Meta 的路——误以为自己需要大量 compute，最终无法产生足够有用的模型/产品，只能把 compute 卖出去——那市场会从“compute demand 永远紧张”变成“少数买家（OpenAI/Anthropic）+ 很多卖家”。届时 neocloud 供需和毛利可能恶化。CoreWeave/Nebius 下跌 10%–15% 很合理，因为竞争者从 2 个变 4 个，供给增加。

关于 Zuck 能否执行，Rory 说关键不是 Zuck/Elon 是否 “real”，而是市场上是否还有 5 gigawatt / gig-level demand 等待被满足。如果 Anthropic/OpenAI 正好想买，Meta 有 compute，sale 会发生；如果没有买家，一切另说。

Jason 从 Kunal Shah / CRED / WhatsApp head 例子扩展：Meta 核心 apps（WhatsApp、Facebook、Instagram）仍然强劲，是继续试错的 engine。即使 Llama/Scale 等 AI 投资是否 overpay 尚不清楚，Zuck 至少在 game 里。对有强 core business 的 founders，他给出同样建议：stay in the game。

Rory 同意：Meta core business 现金流约 $100B 级别，AI targeting 也在改善广告，虽然可能不能 justify $70B spend，但没有 fatal error risk。董事会角度，如果一个 CEO 已经建立如此现金流机器，并且不是把公司带到致命风险中，他“earned the right to play”。

他还提出一个关键 AI capex 观点：spending 不会因为 supply side 自己说停而停。Facebook、Google、Microsoft 都不会主动停；真正 shut off spigot 的是 demand side。只要 OpenAI/Anthropic revenue growth 仍 2x/3x，即使 revenue 只有 capex bill 的一小部分，spend 还会继续。

---

## 42:41–47:06 Nvidia “compute now, pay later”：扩大客户基础但把周期风险留在资产负债表外/内

主持人说 Nvidia 开始 financing own demand：让 providers 通过 revenue sharing、credit support，而不是 upfront cash access GPUs。

Jason 讽刺说 round-trip revenue 现在“totally cool”；但从商业上他认为 leaders 应该早期 shower startups with infinite love。对 startup 前 24 个月锁定客户，是长期最好投资。Nvidia 的动作是为 next-generation neoclouds（例如字幕提到 Shaon AI）提供某种 upfront chip sale，同时给买方 backstop：如果 compute 用不掉，有 put-back rights / guarantee。

Rory 更细解释：
- Nvidia 会 upfront 认 hardware revenue。
- 同时给 NeoCloud 一个 backstop / put-back right，如果用不了 compute，有某种对冲。
- 他没完全确认 cash 何时换手，但确认 revenue recognition 是 upfront；在 ASC 606 下可能 legal / accounting legit，分离 upfront revenue 和 over-time guarantee。
- 这很 aggressive，本质上是 Nvidia 为了 diversify beyond hyperscalers，把新 neocloud customers 做起来。数据中心 top customers concentration 从 80s 到 50s（他说不要 quote exact number），说明客户多元化在发生。

风险是 contingent liability：如果 compute demand 持续 up and to the right，这些 deal 会非常聪明；如果 demand slows、excess capacity 出现，客户失败，Nvidia 不只是增长放缓，还可能 debook prior revenue / take money back。Rory称这是 “derivative bet on keeping this thing going”。

Jason 说这个 bull run / bubble 里没有人管理 downside；如果 board meeting 讨论 downside，他会把 junior associate 派过去。Rory 反而说，如果 Nvidia 要激进使用现金，这比 buybacks 更能 keep the thing going。但他也提醒：当没有人管理 downside 时，恰恰是该管理 downside 的时候；这有点像 1999/2000 的 cycle rhyme。好客户现金支付能力触顶后，就要 subsidize 新客户来维持增长。

---

## 47:06–50:11 Anthropic/DeepSeek 自研 AI chip：垂直整合、定制效率与 Nvidia margin recapture

主持人连接到 Nvidia 大客户之一 Anthropic：Anthropic 与 Samsung 开始谈自研 AI chip；DeepSeek 也宣布自研芯片。这是否是成熟行业自然演进？是否所有人都会做自己的芯片？

Rory 说他上周觉得 OpenAI 自研芯片“mad”，但看到 Anj Mida（字幕如此）对 Harry thread 的回应后，开始更温和。他总结自研芯片的两个理由：
1. **必须 own compute**：类似 crypto “not your keys, not your coins”，如果不 own compute 就被卡住。该观点来自过去对 Anthropic/compute need 判断很准的人，所以值得 pause。
2. **silicon-model co-design**：自研 silicon 可以针对自己的模型优化，效率显著高于购买 Nvidia 通用计算平台再适配。

但他仍然觉得，从 app layer 到 model，到 hosting provider，再到 chip，所需 vertical integration 太重、太奇怪。他不完全理解 big picture，只是承认自己可能低估。

Jason 则反驳“我们需求太特殊，Nvidia 满足不了”的说法。他有 semiconductor 经验，认为如果你给 Nvidia 带来那么大 volume，需要 special version of chip，Nvidia 会为你做 custom / tape-out。对 OpenAI 这种 50%/80% revenue 量级客户，Nvidia 没理由不配合。因此他认为真正动因不是“定制需求”，而是相信 Nvidia margin 太高，必须 recapture that margin。所谓 custom for us 是 soft language，因为双方都要维持关系、不想太 aggressive。

---

## 50:11–55:03 Kling/AI video：为什么中国视频模型能商业化，Sora 反而关闭？

主持人提到 Kling 融资 $2.8B、估值 $18B；Q1 ARR / revenue run-rate 约 $500M；可能在港交所上市。与此同时 OpenAI shut down Sora。

Jason 说有两个问题：
1. 如果 Kling 能 pull this off，为什么 Sora 做不到？
2. 估值对比：Kling $500M revenue、$18B valuation；Higgsfield（Harry/Jason 都是投资人）也宣布 $500M revenue，credit-card billings $2M/day，且只是用 Kling 等模型作为底层之一，传闻融资估值约 $5B。是否存在中国 AI valuation bubble？或者美国/中国估值体系出现 3x arbitrage？

Rory 反驳说 DeepSeek 以 $50B raise，相对西方替代品是 huge discount；ByteDance 也有巨大价值，不能简单说中国估值泡沫。但 Jason 的 meta learning 是：他一年前没意识到 AI video demand 会这么大。视频消费本来就是 infinite；当人们开始用这些平台做 films，demand 可能会非常强。

Rory 指出 Kling 似乎更少 freebies，更快 charge。Sora 可能免费给太多；OpenAI 有更高价值的 GPU 用途，例如 enterprise coding。若 GPU 有限且 OpenAI 在 coding 落后，coding 的 money 比 consumer video 更大。Kling 作为 pure consumer video business，只要有 charging model 能 cover GPU cost，就是好生意。Rory提到 30 秒视频生成 GPU cost 粗估约 $1.30–$2，只要能收费就成立。

他们总结：对 OpenAI/Anthropic，$500M revenue 可能低于 materiality line，且消耗宝贵 capacity；对 Kling，这就是 wonderful business。也正是 startup 投资的机会：大公司 distraction 可以成为独立创业公司的巨大业务。

---

## 55:03–1:00:07 中国开源/模型竞争：被封锁后的自建、open-source tokens 与 geopolitical feedback loop

主持人问：最商业成功的 AI video product 是中国的；OpenRouter top 6 models 也是中国的。中国是否正在 model layer runaway？

Rory 先区分：短视频社交 pre-GenAI 时代，中国已有 TikTok；GenAI video 上 Kling 是 top model，Sora 选择做别的；但在更大市场（LLM、coding），美国 frontier closed models 仍领先。中国的 counter-strike 是 open-source models，合理人可争论有多少是 distilled from OpenAI/Anthropic，但在 non-closed-source financial model 市场，中国确实跑得很快。

Jason 刚从中国/Hong Kong 两周回来，他以前没完全理解 Jensen Huang 的观点：在中国，OpenAI/Claude/Anthropic 不服务你，不只是被墙，而是无法 access。虽然有绕路方式，但官方 access 被限制。第二大经济体当然会构建自己的替代品；如果美国不喜欢中国模型崛起，也要承认是自己不让中国使用这些 frontier systems / GPUs 所造成的后果。他说中国有很强工程师和多年互联网/AI经验，当然能做出接近甚至更好的产品。

Rory 同意这是 actions have consequences。国家可以因为 national security 做出禁止高端芯片/模型出口的 sober decision，但不能期待另一方“认输、不做了”。他们会 build their own，商业后果就是现在看到的中国 open-source / video 模型崛起。

主持人提到中国政府可能限制海外用户访问部分中国 open-source models。Rory觉得这很讽刺：美国担心使用中国模型危险，中国又担心让美国使用危险；这两种担心不一定能同时成立。如果中国开源模型从西方市场被移除，对 US frontier models、US open-source players（Reflection、Poolside 等）会非常利好。

---

## 1:00:07–1:06:48 Open-source vs frontier model：成本、复杂任务、CX resolution economics

讨论转向应用方为何更多用 open models。Jason说大家进入了从 experimentation 到 cost management 的阶段，CIO 天然会管理成本。但他用自己的 coding / algorithm 例子反向说明 frontier 的价值：他在 Replit 中用 Sonnet + open-source 花约 10 小时解决不了一个复杂算法问题；把问题丢给 Fable/Opus 组合，大约 20 分钟解决了核心问题。真正成本不只是 token，而是时间和机会成本。

Rory 引用 Decagon 创始人 Jesse Zhang 的观点：
- 当你尝试新问题、不知道边界、存在 unknown unknowns 时，会使用 frontier models，因为它们更聪明。
- 当任务 commoditized、你知道要什么答案，就会推到 open source。
- OpenRouter 上 open-source tokens 很高可能误导，因为 tokens 在一边，dollars 可能在另一边；frontier model tokens 更贵，但解决的是高价值问题。

他们用医疗类比：有时去 nurse practitioner，有时必须去 heart specialist。

Jason 将这个框架应用到 AI CX（customer experience）：行业似乎围绕约 $0.50 per resolution 标准化，LLM cost 需要控制在 $0.25 或更低。他看到很多 AI CX 数据有 plateauing；为了控制 cost per resolution，许多公司推 open-source，但这可能限制复杂问题解决率。若想从“40% 不太难问题”走向“95% true resolution of complex problems”，可能要重新引入高端模型。

Rory同意 cost/latency/response time 都重要，但更看重 CX 类别已经跨过 chasm：客户能清楚 articulates ROI。客户知道从 30% resolution 到 65% 有价值，知道人工处理一个 query 可能 $3，所以 $0.50–$1 AI resolution 值得付。未来从 65% 到 75% 也许要 $2，但如果价值明确，客户仍会付。这是 AI application 中少数已经从 experiment 走向 real ROI 的市场。

---

## 1:06:48–1:16:38 Microsoft/Amazon 6000 人/数十亿美元企业 AI services：会成功还是人才供给不足？

主持人提到 Microsoft 启动 $2.5B、6000 人计划，把 engineers 嵌入 enterprise clients；Amazon 两天前也做类似动作。背景是 MIT 称 95% enterprise AI pilots 没有可测 P&L impact。问题：这是否表示 AI 从 model business 走向 services ecosystem？

Jason 第一反应：**I think it’s going to fail**。原因不是理念错，而是没有足够 talent。他举 SaaStr 自己与多家 AI/enterprise vendor 的 FDE 互动：顶级 FDE 非常强，可能是他职业生涯见过最好的 customer success/support 人才；但 depth 不存在。一位优秀 FDE 休三个月 paternity leave，替代者说要等原人回来才能修 bug：AI 仍在谈已经发生过的 SaaStr 2026 event（五月已结束，现在七月），要等到八月才能修。这说明大型公司即便有好 FDE，也无法规模化。

Rory 部分不同意。他不买 MIT “95% fail” 这个数字，但承认 Jason 例子说明企业需要帮助。解决方案不是不要 support，而是有人必须 build business，提供足够多 capable people。大问题是：谁会满足这个需求？Corporate America 是 oil & gas、banking 等；OpenAI/Anthropic 是 product companies。中间需要 services companies 帮企业 adopt。

Rory 的核心类比：每个科技公司不是破产，就是活到变成下一代 IBM。IBM Global Services 的角色，就是在 PC/cloud/e-commerce 等新技术扩散时，利用 trusted enterprise relationships 帮企业采用别人家的新技术。Microsoft 曾是新技术公司；现在 OpenAI/Anthropic 才是新技术产品公司，Microsoft 变成成熟、可信的 enterprise services partner。它可以说：“那些 Silicon Valley 人很可怕，谈世界末日；但我们卖给你 20 年了，你信任我们，我们帮你用起来。”这会是大服务业务，但利润率不会像卖 OS 那样高。

Jason 说两边都对：
- Rory 对：比企业自己做要好。
- Jason 对：FDE 人才深度不存在，很多 deployment 会失败或痛苦。VC 也在投 AI enabling old businesses，但如果吸引不到足够聪明的 domain+tech talent，就很难。

Rory把它连回 demand：模型公司收入 adoption rate 部分不受它们控制；Exxon/Bank of America 部署 GenAI 的最大问题不是买不到 Anthropic，而是 enterprise change management 和 application building。如果服务质量不足，AI diffusion rate 会变慢。过去三年 OpenAI/Anthropic 到 $12B/$4B revenue 的速度史无前例；如果下一轮 10x 因企业采用慢而花 3 倍时间，会影响整个 capex / compute demand thesis。

Jason 用 Harvey 例子补充：Harvey 每个 deployment 都有 FDE + lawyer。法律 AI 成功部署需要技术专家和 domain expert 一起。若只是 generic B/C-tier 人员 rollout，可能不成功。Rory 同意：当你买的是 database，只需 database expert；当你买的是“关于自己业务的 intelligent answers”，就必须 tech expert + domain expert 组合，这正是 AI services 难建的原因。

---

## 1:16:38–1:21:15 Ashton Kutcher 离开 Sound Ventures：名人投资人、firm brand 与 AI/deep tech 新基金

主持人提到 Ashton Kutcher（Sound Ventures）宣布离开自己的 VC firm，与 Morgan Beller（曾在 a16z、NFX）成立新 VC firm。Sound Ventures 在 OpenAI、Anthropic 等 SPVs 上非常成功，是过去几年最成功的 AI investors 之一。

Jason觉得表面上很奇怪：离开自己的 firm 通常只有被 manage out 或内部问题，但对 Ashton 似乎不合理。他类比 Jack Altman：能为 solo GP fund raise 半十亿美元却加入 Benchmark，这在以前不合理，但 2026 年可能合理。

Rory认为没有 deep dark story，可能只是两边想做不同事情：传统 venture firm 之所以维持，是因为 firm brand / asset 重要，即使 partners 互相不喜欢，也会维护 franchise。但 Ashton 不同：他的个人名气远大于 firm brand。多数 founder cap table 上会说“Ashton Kutcher 在我 cap table”，而不是 Sound Ventures。他可以直接说自己要做 seed/pre-seed deep tech，重启一个新品牌。

他强调：Ashton 最初投资时很多人可能 sneer，但他 killed it。Sound 的 OpenAI/Anthropic 等 brilliant investments 其实是 late / multi-billion pre-money，与 pre-seed deep tech 不同。作为一个 famous rich person in America，他几乎能做任何想做的事。

Jason 仍觉得若原 firm engine（CFO、IR、partners、operating setup）运转良好，他会倾向留下，因为重建所有东西麻烦。但 Rory/Jason 都认同：venture 里真正有品牌的 firm 只有少数；Ashton 本人的 search/awareness 可能超过大多数 VC brands。

---

## 1:21:15–1:26:53 11Labs $22B secondary 与 AI 人才市场：没有二级流动性，顶级员工为何加入？

最后一个话题是 11Labs 以 $22B 做 secondary。嘉宾认为估值不一定高，和今天高增长 AI round consistency 较强。真正有趣的是员工激励：今天顶级员工为什么要加入一个他们不相信会有 secondary options 的公司？

Jason 的观点：
- 对 hyper-talented employee 来说，加入没有流动性预期的 startup 不划算。
- Anthropic/OpenAI 虽然大、岗位可能窄，但有巨大 money 和 liquidity；11Labs 可能更 agile、岗位更有趣，但也必须提供 secondary liquidity。
- Clay 等 $5B 公司也做 tender offer；问题是如果公司略低于这个层级，明年 soft 一点，tender 可能消失。
- 他修正自己的表述：不是必须已经有 tender，而是员工要有高确定性：未来 24 个月会有 tender / liquidity program。单纯成为 unicorn 不够。

Rory 纠正 framing：如果已经在做 tender offer，你拿到的 grant 会反映低风险/高估值，upside 较小。员工真正的 alpha 和 VC 类似：加入一个今天还没有 tender、拿到健康 equity grant，但 1–2 年后变成能做 tender 的公司。过去是 IPO，现在 IPO window 可能 12 年，tender offer 成为 public market 的 proxy。

他给 operator 的建议：加入 startup 像“single-shot VC”，你只能选一个 deal，要选对。VC 有 20 个 shots，员工通常只有 1 个（Jason补充说员工是 sequential VC，不是 parallel VC；跳槽频繁可有多次 sequential shots）。选择因素当然包括 mission、喜欢团队、市场，但从 stock picking perspective，目标是加入 1–3 年内会成为 unicorn / tender-worthy 的公司。

讨论最后提到，OpenAI/Anthropic 等顶级公司为了抢人，已经取消或弱化 cliffs（不是没有 vesting，而是没有 cliff），这解决了部分员工流动性/风险问题。

---

## 投资研究 follow-up checklist

1. **AI regulation / government equity**：跟踪 OpenAI、Anthropic 是否继续把 5% government stake / tax reform / labor displacement 叙事正式化；关注是否从 PR anchor 演变为 policy proposal。
2. **前沿模型企业信任**：跟踪 Palantir、Microsoft、Accenture、Deloitte、ServiceNow、Salesforce、Databricks 等如何定位“enterprise data/IP-safe AI layer”。
3. **Compute supply chain**：核查 Meta compute cloud、xAI/SpaceX compute leasing、Nvidia credit support/put-back deals 的真实 accounting、duration、customer concentration、capacity risk。
4. **Custom silicon**：跟踪 Anthropic-Samsung、OpenAI、DeepSeek 自研芯片细节：是 inference ASIC、training accelerator、还是 packaging/networking 优化？对 Nvidia gross margin / customer lock-in 的影响不同。
5. **China open-source/video AI**：跟踪 Kling、Higgsfield、ByteDance、DeepSeek、Qwen/Kimi 等的用户、收入、GPU cost、海外 access policy；特别关注如果中国限制海外使用，对 US open-source 和 closed frontier 的 pricing power 影响。
6. **Enterprise AI services**：Microsoft/Amazon 6000 人级别嵌入式工程师计划若推进，关注 utilization、gross margin、是否变成低毛利 IBM Global Services；同时跟踪 Harvey 式 domain expert + FDE 部署模型是否可复制。
7. **AI talent liquidity**：11Labs、Clay、Anthropic、OpenAI 等 tender frequency / discount / eligibility 将直接影响下一波创业公司 hiring competitiveness。
