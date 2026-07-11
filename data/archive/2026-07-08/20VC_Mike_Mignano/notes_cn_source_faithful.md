# 20VC — Mike Mignano（USV）：应用层、OpenAI/Anthropic 不会赢走全部、TokenMaxxing 与 AI 时代 VC 定价

- **来源**：20VC / YouTube，`https://www.youtube.com/watch?v=Gjjnb8j69C0`
- **发布日期**：2026-07-06（YouTube/RSS）
- **Source boundary**：YouTube 官方字幕在当前环境被 `youtube-transcript-api` IP/bot block；`yt-dlp` 要求登录。本文基于 `ytbtranscript.com` 返回的 **third-party YouTube subtitle-derived transcript**，不是官方人工逐字稿；ASR/字幕可能有姓名拼写错误（如 Mike Mignano、Suno、Granola、Abridge、Doctronic 等）。
- **本地归档**：
  - 原始第三方字幕 JSON：`[podcast-archive]/2026-07-08/20VC_Mike_Mignano/ytbtranscript_raw.json`
  - timestamped transcript：`[podcast-archive]/2026-07-08/20VC_Mike_Mignano/transcript_timestamped.txt`
  - plain transcript：`[podcast-archive]/2026-07-08/20VC_Mike_Mignano/transcript_plain.txt`

## 一句话定位 / Why it matters to 投资研究用户

这期是 USV 新 GP Mike Mignano（Anchor 创始人、曾投资 Suno/Granola）对 **AI 应用层价值归属、开放模型/路由层/agent harness、token spend 预算、AI 能源层、应用层 moat 与 VC fund math** 的一整套框架。高价值处不在“AI 应用层会赢”这句结论，而在他把投资判断拆成：基础设施 buildout 之后应用层进入扩散期；若模型智能进入 S-curve plateau，企业会围绕 cost/intelligence/routing/human-aligned harness 做优化；但如果 recursive self-improvement 成立，现有 frontier labs 仍可能凭 compute/model/chip/infrastructure 优势赢家通吃。

## Key notes（保留细节版）

1. **AI 基础设施建设并未结束，但应用层窗口已经打开**：Mike 类比互联网早期 fiber/broadband buildout 后的应用层崛起；AI labs（OpenAI、Anthropic、xAI、SpaceX 等）用巨量资本建出“新玩具”，已经创造数十亿收入、未来可能有数万亿价值，但现在轮到软件/应用层围绕这些新能力大规模出现。
2. **模型市场的两种五年路径**：路径 A 是 superintelligence/recursive self-improvement，领先 lab 可能凭 compute、frontier model、infrastructure、chip 优势拉开；路径 B 是 AI 智能进入 S-curve plateau，模型趋于 commodity，竞争转向价格、产品体验、routing、human-aligned harness。
3. **Token spend：大公司会控费，创业公司应在“正确场景”上最大化 token spend**：Salesforce/Microsoft/Meta/Uber 这种组织不能让几万员工无限花 token，否则经济模型受损；但 startup 组织小、可控，且需要每一点优势。Mike 明确说如果自己是 startup CEO，会 pounding the table 去 maximize token spend，尤其 coding/frontier model；简单总结、文档、运营任务可用 Sonnet/open models。
4. **开放模型/开放生态的定位**：他估计企业里约 **80% 非编码任务** 可由非 frontier model 完成；coding 仍应偏 frontier。中国开放模型进步快，但他把这解释为 incentive：如果“Rebel Alliance”（open weights、open-source harnesses、distributed compute、agents）有胜算，聪明团队会往 open 方向迁移。
5. **Routing layer 有机会，但商业模式仍未定型**：OpenRouter 被点名。路由价值在于企业优化 token spend、按任务选择 capability/cost 最优模型；但单纯加小 margin 可能 commodity。有人提出 bounty model：路由层因选对最有效/最佳模型而收费。Mike 承认不确定 routing-alone 能否出 $50B 公司，但基础设施若深嵌 developer workflow，可成为 gold standard。
6. **USV 没投大模型层，但用 energy 作为 AI 底层 bet**：Mike 认为 USV 在 2021 起押注 energy，不管模型谁赢，AI/intelligence 都需要 energy layer；并且比想象中更需要 energy portability。例子包括 Radiant（工厂线下来的小核反应堆）、Rune（micro data centers 靠近风电/发电机，解决能源靠近 compute/data centers 的问题）。
7. **“Don’t automate, obliterate” 是 USV 应用层标准**：USV 不太做传统 enterprise，因为很多 enterprise SaaS 只是卖给 middleman、让现有流程更快；他们更想投能重塑业务模型的公司。例子：Doctronic 不是让诊所更快处理保险/流程，而是“把 AI doctor 放进每个人口袋”。
8. **模型厂商不会吃掉所有 application layer**：Mike 承认担心 OpenAI/Notion/Microsoft/Anthropic 等竞争，但历史上 Google/Apple/Microsoft 也无法做所有事。强应用层 moat 来自：长期 regulatory/partnership/hard things（Abridge 医疗 5-7 年积累）、focus wedge（Granola 只做 notes 先切入 enterprise）、context accumulation（组织沉淀在产品里的上下文不想放弃）、trusted brand/product quality（Figma 面对 Claude/Anthropic design push 仍有多十亿收入）。
9. **VC fund math：小基金和大平台基金都可能赢，中间层难**：大平台基金在 capital-intensive AI infra/model 公司上可能获得 venture-like returns；小基金要 thesis-driven、早期拿 ownership、找 application layer 里资本效率更高的公司；Series A 定价已到 $80M/$100M/$150M post，若要 ownership 需要更大基金。USV core fund 被提到为 **$275M**。
10. **价格与 ownership**：Fred Wilson 给 Mike 的 VC 教训之一是 “never pass on price”，但 Mike 加了 nuance：早期小基金有 fund math 限制，仍要有价格上限；后期如果确认是 market winner/generational company，可以更像 cash-on-cash underwriting，不拘泥 ownership。
11. **投资人最大的 operator-to-VC 教训**：不要把自己的产品/公司构想投射到 founder 身上。即使你判断对了，如果 founder 不按你假设的 A/B/C/D 路径执行，你的投资前提也错了。早期排序从 product/market/founder 变成 founder/market/product；founder 的 resilience、execution、adaptability 与 communication 被 Mike 视为核心。
12. **Suno 与 Granola 的投资动作不同**：Granola 是 pure founder bet（Mike 认识 Chris 15 年，近距离看过 Socratic/Anchor 相邻办公室时期的 founder quality）；Suno 是 pure thesis-driven bet（从 Anchor 时期“democratize creative medium”延伸，音乐在 AI 前未被完全 democratize；他主动找遍 AI music 团队，见到 Mikey 后 founder lens 打开）。
13. **Suno underwriting**：Mike 用“unlimited upside potential”描述；类比 YouTube/TikTok/Twitter/Facebook 这些真正 democratize a medium 的 generational platform。他现在不再确定 Suno 必须从 tool 变成双边 platform，因为用户在 Suno 里的新行为是 “creative entertainment”：不是为了发布/商业化，而是为了制作音乐本身的乐趣，类似 Claude Code/Midjourney/AI game-making。
14. **媒体/independent publishing**：他认为 traditional media 在很多层面已死，自己低估了 independent media 的天花板；2022 离开 Spotify 时以为 audio/self-publishing 机会已 baked，但之后 YouTube/Spotify/X/Substack/独立主持人继续放大，电视仍在被 unbundle。

---

## 详细纪要（按原始对话顺序）

### 00:00–06:00｜约束、失败恐惧、内容生产：从 Anchor 到“insights per minute”

主持人开场介绍 Mike Mignano 是 USV 新 GP，过去是 Anchor 创始人并卖给 Spotify，也曾早期投资 Suno 和 Granola。开场摘出几个主题：agent 会让人类第一次把如此多自我交给技术；startup 应尽可能把 token spend 用在正确地方；USV 关注能“obliterate markets and existing business models”的公司；AI 产品时代速度和 first-mover/context 很关键；传统媒体在很多层面已死。

Harry 问 Mike 更受“害怕失败”还是“赢的兴奋”驱动。Mike 回答两者都有，但尤其强调 **failure as constraint**：伟大的公司、产品、人来自 constraints，失败是终极 constraint。他回忆 Anchor 最好的工作发生在公司只剩三个月现金、即将失败时，因为那种状态极度 clarifying：不扭转就会死。但仅有恐惧不够，也要有极度雄心的 mission——想赢、想完成一个听起来不可能的事情。成功需要同时持有这两种心理。

两人转到内容形态。Harry 说十年前 Anchor 追求自然 conversation，自己当时更相信被“manufactured/airbrushed”的音频。Mike 承认十年后更同意 Harry：现在内容太多、工具太好，默认就能做出 decent-looking/sounding podcast；若想 break out，baseline 必须是 excellence，包括剪辑、production value、Harry 当年说的 **insights per minute**。USV 自己也开始做高 production value 内容，跳出 studio、多机位、多麦克风，因为这是脱颖而出的方式。Harry 补充 **time to value** 很重要，不喜欢“where did you grow up”这种慢热问题，而更喜欢开场就问“fear of failure vs thrill of winning”这种 hook。他还认为内容生产要么极小（teenager 把手机架起来录），要么极大（Logan Paul/MrBeast/20VC/有完整 studio），中间态很难。

### 06:00–12:00｜为什么去 USV；AI infra buildout 后应用层机会；seed fund 怎样发 thesis 信号

Harry 调侃 Mike 从 Lightspeed 到“资金充裕”的 USV，问为什么加入。Mike 说自己来自纽约、一直在纽约附近，Anchor 时期就认识 USV，虽然 USV 当年 pass 了 Anchor，但体验很好，后来建立长期友谊，他也成为 USV fund LP。他欣赏 USV 愿意 **opinionated / thesis-driven**，即使市场阶段更奖励 consensus-driven。Mike 承认 thesis-driven 风险很高：押错 thesis 就 miss/fail；但他本人喜欢这样 build 和 bet。

Harry 追问：如果 venture 未来赢家就是 consensus-driven 怎么办？Mike 回答认为 AI 刚经历大规模基础设施建设：OpenAI、Anthropic、xAI、SpaceX 等公司需要巨量资本构建新技术与基础设施，已经产生数十亿美元收入，并可能创造数万亿美元价值。但现在像互联网早期 fiber/broadband buildout 之后，新的 application layer 将利用底层技术出现。Mike 不认为 infrastructure value 已结束，buildout 仍未完成；但应用层也会产生 massive value creation。USV 的优势在于知道自己在找什么，并在看到时下注。

Harry 引用 Menlo 的 Brandon 观点：未来 24 个月 infra 层价值增量可能仍大于 application layer。Mike 不完全反对，认为 infra 还有价值，但应用层已经有足够“new toys”可用。

随后谈 “always-on AI”。Harry 提 Sam Altman 越来越暗示 AI 会 always-on，这让他 bullish Nvidia。Mike 认为 context 对 labs 和应用层都越来越重要，产品会把用户推向 always-on。十年前 Alexa 在家里始终监听 wake word 让人惊讶；今天会议里常听到“I'm granolaing this”，说明 always-on note-taking/context capture 已在发生。

谈 seed fund，Harry 认为 50–100M seed fund 处境最差：既打不过大基金 lead rounds，也不够小到可以 collaborative。Mike 没直接否定，而是说做 seed 好要：建立强 network、遇到优秀人、把自己的 ideas 放到市场上、明确告诉 founders 自己在找什么。他举 USV 最近写 “Rebel Alliance” post 的例子：open-weight models、open-source harnesses、distributed compute、human-aligned agents。公开 thesis 像发 bat signal，让尚未公开产品的早期创始人知道该找你。Harry 问 thesis 若没想清楚或错了怎么办；Mike 说像创业一样，投资也要把自己放出去、承担风险，可以用 counter-position bet 对冲，但想在技术里成功必须愿意下注。

### 12:00–21:00｜五年模型格局：recursive self-improvement vs S-curve plateau；harness 与 agent alignment

Harry 做 prediction round，问五年后的模型市场构成。Mike 拆成两种未来：

第一种，接近 superintelligence 的 labs 到达 recursive self-improvement：AI 能做自己的 AI research，持续自我改进，直到某种未知限制出现。如果谁先到达，就可能 runaway，别人无法追上。Mike 说这并不是他希望看到的未来。潜在限制包括：transformer architecture 可能到某点不再 scale；模型需要的数据不可获得；硬件基础设施建设跟不上。

第二种，AI adoption 更像历史技术 S-curve：慢起步、指数增长、再因某种因素 plateau。若智能 plateau，模型会更 commodity，其他 labs 能追上，竞争焦点转为价格、产品体验，以及新 intelligence stack 里的不同组件。

Harry 问若走 recursive self-improvement，是 OpenAI/Anthropic 等现有模型提供商赢，还是新架构公司赢？Mike 倾向现有领先 labs，因为它们已有巨大 compute、frontier models、infrastructure、chip 优势。但他保留 caveat：也可能有新架构突破 transformer，例如 Thinking Machines、SSI（Ilya/Daniel）等研究团队，可能 leapfrog。

若走 plateau/linear path，Mike 认为企业和个人会优化两件事：
- **cost / intelligence trade-off**：开始认真管理 token spend；
- 使用 open-weight/open-source models，以及 routing layer，把不同任务路由到性价比最高模型，而不是永远 token maxing、只用最强模型。

Harry 问什么是 “harness”。Mike 定义为与模型高度耦合的 application：Claude desktop app、Claude Code、Claude Co-work 这类产品与模型之间形成 product-model engagement flywheel；Hermes（接管 Mac Mini）和 Arendelle 的 Pi 也可视为 harness。核心是未来用户会关心产品、agent、harness 是否 **human aligned**，是否与自己的目标/激励一致。大 labs 的模型激励是让 lab 的模型更聪明、更好、更快；但如果用户把 agency、个人信息、目标、信用卡都交给 agent，就会想知道“who is your agent working for?”

Harry 认为用户会很快习惯把钥匙交给 agent，就像大家把信用卡放网上、用 Apple Pay、在线找伴侣；且除 hardcore technologists 外，多数人并不关心 privacy。Mike 说历史上互联网和个人计算的发展支持 Harry 的判断，但这次不同：我们从未把这么多“自己”交给技术。Chrome/网页收集兴趣，但并不替你买东西、不替你给家人发个人消息、不是 second self；agent 会做这些，因此模型激励可能更重要。他也不认为每个 model/agent 都需 superhuman aligned，只要足够多用户在意，让一两个好 actor 通过市场力量约束其他 actor。是否会发生不确定，历史上不乐观，但可能。

### 21:00–27:00｜Anthropic、token spend、frontier coding 与 open model 在企业的边界

Harry 问 Dario/Anthropic 一直谈劳动力替代是否是 marketing own goal。Mike 不直接批评，称 Anthropic 是极 mission-driven company，而 mission-driven companies 可以非常成功；无论喜欢与否，Anthropic 已非常成功，并称按录制时点它是世界上最有价值的 privately held company（字幕如此）。

Harry 把 Anthropic 的增长关键归结为 developer salary 中有多少比例会变为 token spend。他引用 Marc Benioff/Salesforce 为 dev team 在 Anthropic 上花 **$300M**，约等于 developer salaries 的 **3.8%**。如果这一比例到 20%，Anthropic 仍被低估；若到 100%，市场远大于想象；若停留或迁移到 open models，格局不同。

Mike 认为这是风险，并区分两种组织：
- **Incumbents / large companies**：Salesforce、Microsoft 等，如果每个员工无限 token spend，基本面会出问题；组织太大，不可能让 5,000/10,000/50,000 员工失控花 token。Meta、Uber、Microsoft 等也出现控费迹象。
- **Startups**：组织小，可更紧密控制 spend；更重要的是 startup 需要每个优势。如果 Mike 是 startup CEO，会继续 pounding the table **maximize token spend on the right things**。coding 应用 frontier model，简单总结/运营/文档可用 Sonnet 或非 frontier/open models。最好的工程师会更愿意去允许其最大化模型能力的 startup，而非预算受限的大公司。

Harry 提出未来可能有 Fable 类工具回归，出现 100x engineer，用巨大 token spend 替代 10 个中等工程师。Mike 同意 engineering org 会演化：可能变成更小但更高质量的工程团队，低层任务更多 delegated to agents。

关于 open ecosystem，Harry 问企业 workflows 有多少可由 open 完成。Mike 给出估计：**80% of non-coding tasks in enterprise** 可由非 frontier models 完成；coding 仍大概率要 frontier models。总结、生成 docs/briefs 等不需要 frontier，因此可用 open source models。Mike 也观察 open source models 追赶更快。

Harry 提到中国 open-source models 很强，问是否令人担忧。Mike 说团队会流向 incentives；如果 Rebel Alliance 真的有机会，会看到更多聪明团队去 open。

### 27:00–33:00｜Routing layer 商业模式；USV 的 energy bet；AI compute 与 energy portability

Harry 问 routing layer 是否能诞生 $10–50B 公司，还是被 Fireworks、Baseten、Nebius 等 inference providers/stack players 吃掉。Mike 认为 routing 当下重要：企业想优化 token spend，要根据 capability 和 cost 选择 right model for the job。OpenRouter 被点名为纽约公司，做得有趣。许多不同 stack 层公司的商业模式都谈到自建 routing layer 并 monetizing。

但 Harry 追问如何避免 routing 变 commodity pipe。Mike 说当前很多人考虑加小 margin，但可能不是好模型。他在 X 上发帖后听到一个有趣想法：**bounty model**，即 routing layer 因选择了最有效/最适合某任务的模型而获得奖励/收费。这个还没看到真正 built out，但值得关注。Harry 仍觉得 routing alone 很难出 $50B。Mike 保留可能性：enterprise infra 公司一旦深嵌 developer workflows/ecosystem，成为 gold standard，就很难被拔掉。

Harry 问“USV 是否错过 model game”。Mike 回答 USV 玩的是不同 game，且 USV 历史上一直敢于 take a position。虽然 USV 没投大模型层公司，但过去几年一直押 energy。逻辑是：无论模型赢家是谁，只要相信 AI/intelligence，就需要底层 energy layer；后来又发现需要的 energy 远超想象，且需要更强的 energy portability。字幕里 Mike 先说 2001 后纠正为 **2021** 起 energy 是 USV 主题。

Harry 问 energy capex-heavy 如何适合 venture。Mike 承认 capex intensity，但早期创新团队可以在别人未想到前做 science experiments，最早期未必那么 capital intensive。USV 投 Radiant，做工厂线下来的 small nuclear reactors，并将成为美国最早测试核能的公司之一（字幕为 “test in the dome”，可能指具体设施/场地，需以官方材料校对）。

Mike 还提到 USV 投 Rune：micro data centers 直接靠近 generators/wind farms，解决如何让 energy 尽快、尽可能接近 compute/data centers 的 portability 问题。Harry 补充 Panthalassa 做海上 data centers、Elon 可能在太空建 data centers，认为这是市场解决 energy crisis 的资本主义乐趣。

### 33:00–39:00｜USV 标准：不是 automate，而是 obliterate；医疗 AI、Abridge moat、模型厂商不可能做完所有应用

Harry 批评部分欧洲创业者还在做 SMB accounting。Mike 说 enterprise automation 当然有机会，但自己更想投能 **obliterate** 的产品。USV 内部说法是 **don’t automate, obliterate**：不是自动化已有 workflow，而是重塑业务模型。传统 enterprise investing 很多是卖给 middleman、让现有企业更快；USV 更喜欢 reinvent how something is done。

例子是 Doctronic：USV 几年前领投 seed，当时看起来疯狂——用 AI 把 doctor 放进每个人口袋。Mike 对比说，他们不是投让 medical practices 更快、帮保险理赔的 AI，而是投“每个人口袋里都有 doctor”的模型重构。Harry 由此担心横向平台：医疗和教育的最大赢家可能是 YouTube，ChatGPT 的第二大使用场景也可能是 health；模型提供商可能侵入 application layers。

Mike 用 Abridge 回答：Abridge 做这个问题近十年，积累了巨大优势。在 healthcare 这种高度监管行业，不是模型厂商说“我们来做 healthcare”就能进门；要建立关系、partnerships、通过 regulatory hurdles，这些成为 moat。USV 2018 年左右投 Abridge，五六七年后才到 inflection，被许多医生和 healthcare systems 使用。Mike 的 general point：labs/hyperscalers 似乎能进入任何 market，但技术史上一直有巨头威胁；仍然会有 startups/founders 做专门化、困难、别人未想到的事并获胜。Spotify 也是 David vs Goliath，沿路可被杀 50 次，但因专注、早做难事而赢。

Harry 补充即使 model providers 进入也不是 binary：Anthropic/Claude 可以组队做 design、冲击 Figma，但 Figma 仍是多十亿美元收入的 great product/trusted brand。Mike 说通常市场赢家不会拿 100% 或 80%，可能拿 30%，剩下 70% 仍可产生多个大赢家。Harry 承认自己在 developer landscape 上误判过会 runaway，实际 Lovable、Cognition、Replit、Claude Code/Codex 等都可能同时很大。

### 39:00–45:00｜Granola、enterprise wedge、Microsoft bundling 与 context moat；VC fund size/ownership

Harry 问 Mike 现在在 USV 是否看到不同 deals。Mike 说如果把 thesis 公开，就会看到匹配这些 theme 的公司。小基金必须 pick spots，有 constraints，深度聚焦少数 thesis，如 energy、Rebel Alliance。

Harry 问 Mike 正在担心什么，并提出 model providers 进入 application layer 的威胁，例如 Anthropic 公开想进 legal，可能威胁 Lagora。Mike 承认担心 competitive threats：Granola 和 Suno 都面对巨大 incumbents；Granola 已遇到 OpenAI 直接竞争产品，Notion 也推出竞争产品。

Harry 质疑 Granola 能否进入 traditional enterprise：很多 startup/VC-funded products 可到 $500M revenue，但要到 $5B 很难。Mike 认为 Granola 的优势是 **focus**：它只做 notes。企业入口应该先卖一个东西，把脚伸进门；进入后再横向扩展。若一开始就很宽，就要说服企业放弃 Gmail、Docs、Sheets、Calendar 等一堆工具；而只做 meeting notes，可以说“我们只是你的 company second brain，而且我们最好”。

Harry 追问 Microsoft bundling 的威胁：Teams/Copilot 这种 65–70% “meh” 产品可借 bundling 打败竞争者。Mike 承认担心，Slack 已经经历过，但 Slack 仍是价值 **$27B** 的产品。对 Granola/AI 产品，他看到 **context** 极其重要：如果 Granola 进入组织，所有人使用并积累丰富上下文，这不是企业想轻易放弃的资产。AI 产品时代 about being first and moving very fast；context history 会帮助组织更好工作，形成 lock-in。

Harry 担心相对 SpaceX/OpenAI/Anthropic 的 trillion-dollar outcomes，$500M ARR 公司显得“meh”。Mike 回到 fund math：USV 选择小基金游戏；小基金可在自己的目标函数里成功，未必适合 $10B fund。Harry 说今天不靠 media 做不了 venture；还说 Series A 没有 $400M fund 做不了。Mike 同意 Series A 很贵，post-money 常在 $80M/$100M，偶尔 $150M；若要写足够 check 拿 ownership，基金需要比三年前大。

关于 ownership，Mike 区分阶段：seed/Series A ownership 重要，因为 outcome 更大、好公司很快融资很多、估值很高，后续轮小基金很难买 ownership，所以早期要拿；跨过 B/C、已识别为 market leader/potential generational company 后，ownership 不那么重要，变成 cash-on-cash underwriting：投 $25M 能否 10x/100x/1000x。

### 45:00–51:00｜FOMO deal、$275M core fund、大平台基金 vs 小 thesis fund；价格弹性

Harry 提到两人共同投资 Paul 的 FOMO（下一代 trading app）。Mike 说这正是后期不拘泥 ownership 的例子：他们看到市场规模，认为它会比现在大很多，所以不 ownership-focused，只要能 put a check in。由于 USV fund size constraint，未必每轮都能跟，但 upside 足够。

Harry 问如果不是 mega outcome 是否应该投。Mike 对 later stage 的回答是：若不是 gigantic outcome，对 USV 可能不值得。早期也希望公司在大市场、有 very large service area；但小基金相比大基金有更多 downside protection，因为 USV 当前 core fund 是 **$275M**，比数十亿美元基金更容易放大。如果拿到相同 ownership，小基金更容易 fund multiple。

Harry 认为未来也可能是大平台基金最好，因为 outcome size expansion 让它们能在大资金上拿 venture-like returns；Thrive growth vehicle 的表现可能比 90% seed fund 好。Mike 同意大型基金在过去 capital-intensive AI infra/model 公司中表现很好，但他同时认为接下来 application layer 会 proliferation，资本强度低，需要知道自己在找什么；这种公司可用更 modest check size 进入。结论是：要么很大、玩 consensus game；要么很小、很 opinionated、放大小基金；中间不好。

Harry 问 price elasticity，讲自己一年内两次因估值被 2–3x 出价击败。Mike 引 Fred Wilson 教训：**never pass on price**。但他强调 nuance：若 USV 后期投 market winner、multiple 很高，可在价格上更有弹性；早期小基金仍有 fund math 限制，不可能无限追价。

两人穿插 Fred Wilson/Brad Feld 回 email 的故事。Mike 讲 Anchor 刚发布时 app 意外替 Fred auto-tweet，Fred 很不高兴，在 Twitter/X 上批评；Mike 作为首次创始人很不舒服，但立刻 cold email 道歉并提出排查，Fred 很快回复且很 gracious/forgiving。Harry 说 Peter Fenton 教他：用 price as a litmus test for conviction。Mike 同意，回看自己最好的 deals，即便当时价格满意，事后也愿意付双倍。

### 51:00–57:00｜VC lessons：不要把 operator 想法投射给 founder；founder/market/product；Granola 与 Suno 的不同投资动作

Harry 问 Mike 做 VC 后最大 lessons。Mike 的核心回答：**不要把自己的 ideas 投射到 founder 身上**。作为前 operator/CEO，很容易以为自己知道业务/产品该怎么做；但这很危险。Lightspeed 前合伙人 Jeremy Liew 曾提醒他“你在以 former founder 身份 projecting”，这成为重要教训。

原因有两层：第一，即使你的想法很好甚至正确，公司是 founder 的，founder 可能想完全不同地 build；第二，如果你在评估时假设公司要做 A/B/C/D 才赢，而团队不这么做，你的 investment thesis 就错了。因此要相信团队自己的 judgment 和 execution，而不是投你脑中的计划。

Harry 让他排序 founder/market/product。Mike 说刚入行会排 product/market/founder，现在完全翻转为 **founder/market/product**。早期 startup 多数会 pivot，最重要的是 founder 是否 resilient、能执行、能适应变化。

问 founder reads 错时漏看什么，Mike 说常是 **communication**。领导者有效沟通很难，却贯穿公司建设全部：recruiting 要传达 mission/values/why exist；融资要能讲给 investors；产品愿景要让团队 alignment；市场也要听懂你的 story。评估错误里，communication 是最大项之一。

Harry 讲自己最大 misses：Suno seed 时 David Frankel/Founder Collective 介绍，他因只有 $200–250K check、约 1% ownership 而拒绝；Granola 是 lack of imagination，Chris 很好但 idea 未成形。Mike 分析二者不同：
- **Granola = pure founder bet**：Mike 认识 Chris 15+ 年。Anchor 办公室后面就是 Chris 前公司 Socratic，双方 founder 经常交流，他近距离知道 Chris 能做到。
- **Suno = pure thesis-driven bet**：来自 Anchor 时期“democratize a creative medium”的 thesis。音乐在 AI 前从未被完全 democratized；Mike 主动找遍所有 AI music 团队，后来遇到 Mikey 和团队，觉得团队极强，founder lens 也打开。

关于见 founder 是否立即明显，Mike 说 Suno 的 Mikey 是 immediate：在 Hoboken 餐厅见面，瞬间连接；他看到团队对模型、世界愿景很聪明，也看到 Mikey 作为 former musician 对“如何让音乐创作/自我表达/创造力更容易”有深层连接。

### 57:00–63:00｜Suno upside、creative entertainment、Substack missed、传统媒体与独立媒体

Harry 问 Suno 到 $5B 估值时 underwrite 什么。Mike 说他们认为 Suno 有“unlimited upside potential”（宽泛使用该词）。他类比互联网媒体史上真正 democratize a medium 的 generational platforms：YouTube、TikTok、Twitter、Facebook（写作/发布层面）。这些平台价值极大，上行很难设限。

Harry 问 Suno 是否必须从 tool 变 platform。Mike 说最初投资时可能会回答 yes：需要 creator side 和 consumer side，像 Spotify 那样。但现在他不确定当时是否理解 Suno 的真实形态。Suno 团队称之为 **creative entertainment**：用户进入 Suno 是为制作音乐本身的快乐，而不是为了分发、商业化。Anchor 的 podcast 创作是为了 distribution/monetization；AI 让音乐创作本身变得好玩。Mike 类比 Claude Code、Midjourney、AI game-making：很多用户没有成为 hit game developer 的追求，只是在电脑上玩创作。

Harry 追问 missed investments，Mike 讲 Substack。不是传统 AI 公司，但他相信过去八年并且趋势仍在继续：世界越来越走向 self-publishing，人们控制自己的媒体命运、发布和变现。除 X 外，Substack 可能是做得最好的公司。Mike 喜欢 founders、purpose、product、platform，但没机会投资。

问 traditional media 是否 dead，Mike 说很多层面 dead。Harry 讽刺大媒体有巨大的 podcast production teams 但没人听，没理解 game 变了。Mike 承认自己低估了 independent media 的规模。Anchor 当年愿景是 democratize audio、give everyone a voice；到 2022 离开 Spotify 时，他以为机会 baked：YouTube、Spotify、X 等都在了。但过去四年它又大很多：传统 TV show、media personality、大机构名字纷纷转向 self-publishing/independent media，做 YouTube/Spotify 节目。Mike 认为还没到 peak，television 仍在 massive unbundling。

Harry 提到 TechCrunch Europe/Wired Europe 关闭后，他曾聚合欧洲最好的 writers，并有 $10M 富豪资金支持，但投资团队问为什么做——没有 editorial control，就像 OpenAI 对 TBPN 没有控制，意义何在。Mike 同意 editorial freedom 是核心，因此喜欢 Substack、X、YouTube、Spotify。

### 63:00–69:00｜Quick fire：高信号 founder meeting、seed fund、deal referrer、growth fund、Fred Wilson、parenting 与模型厂商不能做一切

Mike 说最好的 first founder meeting 之一是 Brin Putnam（Bór/Board? 字幕可能误写，指 tabletop gaming console 公司 CEO）。她曾创办 Mirror 并卖给 Lululemon，带着硬件、supply chain 经验进入 tabletop gaming console，vision 清晰、domain expertise 深，Mike 见完就觉得必须投资。

若投一个 seed fund，Mike 先提 Matt Hartman 的 Factorial。其模式不是 scouts，而是给 angel investors 叠加额外资金；Factorial 通过 carry 变现，同时把 Clem from Hugging Face 等真实 angels 纳入网络。另一个答案是 Haystack，Mike 很欣赏 Semil、Divya 及其 generational outcomes。

最高 signal 的 deal referrer：Mike 在 Lightspeed 时与 Nat Friedman、Daniel Gross 密切合作；Nat 多次发 deal，Mike 总会认真看，Suno 的 Mikey 也是 Nat 介绍。Harry 称他们不再做投资是 venture 最大遗憾。

最喜欢的 growth fund：Mike 说 Lightspeed Growth Fund 很强，做了 Anthropic、xAI、SpaceX 等，尤其过去四年 AI 投资表现 phenomenal。

从 Fred Wilson 学到的最大 lesson：没有什么比 founder relationships 更重要。第一，帮助 founder 最好的方式是陪伴/支持；founder 是 lonely、punishing job，需要能信任、对齐的人。第二，更 selfishly，venture 里 reputation 是一切，而好 reputation 来自与 founders 的好关系。

Parenting advice：Mike 说自己成长中很幸运，父母支持他的兴趣但不强迫方向。家里 baseball 很重要，父亲是 former coach/player，但 Mike 没继续棒球，父亲只是支持他找下一个兴趣。Mike 希望对孩子也如此：支持、开车去训练、赋能，但不施压。Harry 讲自己告诉母亲要退 law school 做不赚钱的 podcast，母亲也支持。

问过去 12 个月改变最大看法，Mike 回到应用层：不久前他也曾以为 model providers 可以做所有事情，未来可能 1–5 家公司吃掉一切；但过去一两年提醒他，即使最大公司也不能做所有事。10–15 年前大家也以为 Google/Apple 会拿走一切，现实并非如此。Harry 补充 Microsoft 曾一度想成为银行，说明 incumbents 会看所有机会；Mike 说 AWS 是大公司成功扩张的例子，但总体仍不能做一切。

### 69:00–72:00｜未来 5–10 年：人、founders、returns 的优先级

最后问未来 5–10 年最兴奋什么。Mike 说他和 USV partners Rebecca、Nick 最近互问在 USV 想要什么，他给出三个按顺序的目标：
1. 每天上班，与自己喜欢、享受协作、有趣的人一起工作；
2. 与 incredible founders 合作，重点是关系与 dynamic，并希望这些 founders 改变世界；
3. 产生 generational fund returns。

他强调顺序就是这样：先 enjoy day-to-day、与喜欢的人合作；再 partner with founders；最后才是 generational returns。若优化 fun 和日常享受，好事会发生。Harry 以两人十年友谊和伦敦录制结束。
