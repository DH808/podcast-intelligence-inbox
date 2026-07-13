# Latent Space × Danielle Perszyk：为什么 AI Agent 尚未真正理解用户

- **来源**：Latent Space 官方 YouTube
- **视频**：https://www.youtube.com/watch?v=K796MYUgt0k
- **发布时间**：2026-07-11
- **时长**：48:50
- **嘉宾**：Danielle Perszyk，Amazon AGI Lab；原 Adept 团队成员、认知科学背景
- **Source boundary**：由 `youtube-transcript-api` 直接取得的 **YouTube captions**，不是人工校订逐字稿；实验室项目名和专有名词可能有字幕误识别。以下按原始对话顺序保留其认知科学框架、研究机制、产品边界和 caveats。

## 一页导读（不替代正文）

1. Amazon AGI Lab 延续 Adept “让 agent 完成人类在电脑上能做的一切”的方向，但把问题重新定义为 **perception + world model + real-time interaction + user mental model**，而不仅是点击坐标或语言模型。
2. Danielle 的核心判断：agent 的可靠性最终不是“每次点对按钮”，而是能否理解用户的偏好、意图，以及在任务执行过程中不断变化的目标。真正可靠的 agent 更接近理解雇主的优秀助理，而不是固定 RPA。
3. 她认为当前用 RL 把模型优化到某个 task 的方法容易 overfit、reward hacking 和 Goodhart；更通用的目标可能是让 AI 持续推断他者心智，并**对齐彼此的 representation**。
4. 多 agent 的下一阶段不是结构化 delegation/hand-off，而是角色和策略能在交互中涌现，agents 能真正影响彼此并形成 cumulative culture。现有系统虽看似协作，放大后通常没有持久改变。
5. 风险不是只在“AI 取代人”，还在 **AI 让人类思维趋同**：个人科学家借 AI 多发论文、多拿 grant，但科学整体可能变窄；写作者接受一系列局部建议后，甚至在无意识中被带到相反立场。
6. 对商业化的含义：computer-use/RPA 的近端价值巨大，但若研究实验室过早围绕 chatbot、coding 和 B2B SaaS 产品优化，会牺牲真正的 generalization science。

---

# 详细纪要（原始顺序）

## 00:03–05:06 从《国富论》到“集体大脑”

- Danielle 刚参加 Adam Smith《国富论》250 周年活动，讨论 AI、human flourishing 与 liberalism。她代表的观点是：AI 应被建成服务人的工具，而不只是科学实验。
- 她离开学界进入产业，是因为长期研究人类智能的演化形态。其核心框架与行业常见的“单个大模型有多聪明”不同：
  - 人类智能本质上是 collective；
  - 单个人甚至无法独自生存，智能从人与人的互动中涌现；
  - 创新能力取决于群体内部的多样性/variation、群体规模和连接密度。
- 因此，好的 AI 不只是替某些工程师自动化，而应让更多人参与集体对话、扩大 collective brain。
- 对就业，她承认转型期必有冲击。AI 乐观不是自然结果：如果仍按当前方式建设，福利不会自动普惠。
- 她认为许多人类认知被浪费在屏幕前的重复劳动。人的大脑更适合协作、共同构思和互动。如果只停留在 automation mindset，会错过 AI 对人类关系、福祉和协作的更大增量。
- 现阶段 agent benchmark 的不可靠反而短期缓解了失业焦虑：agent 还没有可靠到能自动化足够多复杂工作。

## 05:06–10:52 Amazon AGI Lab 的任务：超越聊天轮次

**Amazon AGI Lab 是什么？**

- 起点是 Adept 的使命：让 AI 完成人类在电脑上能做的一切；Adept 团队加入 Amazon 后成为实验室种子。
- 当前使命表述为 human-aligned intelligence。要完成电脑工作，能力不只来自语言：
  - 像人一样感知数字环境；
  - 理解数字界面背后的物理世界，形成 world model；
  - 能实时互动，而不是 chatbot/coding agent 的 batch turn-taking。
- 人类交互时持续更新 context、协商 meaning，在听对方说话时已准备下一步思想和行动。当前用户是在适应 AI 的限制；真正的人机范式转换是 agent 能一边听、一边思考、一边行动，并跟上人类动态。
- 主持人提到 full-duplex voice、GPT-4o、Moshi 等技术线；Danielle 认为实时只是更大“类人灵活智能”组件中的一小块。

**对 memory 的不同理解：**

- 行业常把 memory 当 storage，但人类记忆不是外接数据库：
  - 它用于模拟未来；
  - 跨多个时间尺度运行；
  - 融入所有学习和认知；
  - episodic memory 支撑个体 perspective/self，并提高检索效率。
- 对“是否必须改 weights”的问题，她没有给二元答案：外部系统仍会像人类使用工具和 Wikipedia 一样重要，但未来还需 inference 时改变信息 contextualization，甚至可能更新 weights。她刻意不展开，因为是实验室正在推进的研究。
- 更大的研究原则是：不能只做单一长短期记忆模块，而要统一考虑不同交互时间尺度。

## 10:52–15:07 Amazon 内部定位与 Nova Act 起点

- 原 Adept 团队说服 Amazon 领导层：frontier research 需要近似 startup 的 operating model，研究必须被保护，不能完全被大公司短期产品目标牵引。
- 实验室从一开始就想做 perception agents，并与一批 Amazon 员工协作；Amazon 接受其探索“其他 frontier labs 尚未集中投入的新类别科学”，即使无法立即产品化。
- Danielle 认为一些领先实验室成为成功的受害者：一旦有大规模产品，就会停止旁支研究，all hands 投入现有产品；行业随后互相追赶，最后都集中在 coding 和 B2B SaaS。
- Amazon AGI Lab 希望保留下一代人机交互范式的基础科学空间。
- Nova Act 的早期策略是“在模型当时能力范围内工作”：先把点击、滚动等 atomic computer interactions 做可靠，再让开发者把它们串成重复 workflow。这在当时对 RPA 是重要解锁。

## 15:07–17:55 可靠性重新定义：不是点对，而是理解用户的心智

- 早期 reliability 指标是：能否每次识别正确 bounding box、点击正确按钮。Danielle 说即使这仍比外界想象的难，它也不是最终可靠性。
- 真正的 perception agent 接受高层意图、拆任务并执行；但人的目标会在与界面交互中变化。
- 旅行预订例子：用户看到某个城市转机，可能临时决定停留几天。界面提供的新信息改变了目标本身，而不是只改变执行路径。
- 大部分知识工作都类似：人不是先冻结目标再机械执行，而是在行动中思考，计算机反馈持续 refine goal。
- 人为什么愿意让助理订旅行？因为助理理解雇主的偏好和意图，能拆解的不只是 task，还有 user mind。
- 结论：**agent reliability 的核心从 GUI manipulation 转向 user modeling。** 这改变了应该训练什么、评估什么和产品如何建立信任。

## 17:55–21:23 从 task RL 转向 representation alignment

- 对“有没有比 next-token prediction 更好的目标”，Danielle 说实验室正在研究，随后用认知科学阐释方向。
- 当前行业习惯用 RL 把模型优化到特定任务；一个任务变好，另一个任务可能变差，generalization 不成立，像 whack-a-mole。
- 应先找出让人类跨任务 generalize 的底层机制，再设计 evaluation，避免只对狭窄 benchmark 过拟合。
- Goodhart’s Law：一旦 measure 成为目标，就不再是好 measure；task reward 会被 hack。
- 她提出的人类通用优化目标：
  - 人会自发推断他者心智；
  - 不断尝试让彼此的 representation 对齐；
  - 灵活推理、协作和通用认知可以从这一过程派生。
- 研究问题因而变成：AI 能否以“对齐自身 representation 与人的 representation”为基础目标？这需要研究婴幼儿发展过程，既是 architecture 问题，也是 developmental data 问题。
- 她暗示实验室在探索新的架构与数据整合方式，但未披露细节。

## 21:23–25:39 Environment 与 social world model

- Jason Laster/Replay 的观点被引用：对 environment 的投入应与 compute/data 同等重要，因为环境决定能涌现什么智能。
- 主持人追问：environment startup 很多，是否把“可不断生成 rollout 的数据”包装成过于整齐的投资叙事？Danielle 同意行业确有过度扩张风险，但认为重视环境本身是必要转变。
- 人的关键能力不是在每个环境分别训练，而是只在有限环境中成长，却可适应新环境。
- 感官输入有大量噪音，人必须选择关注哪些信号；Danielle 的解释是，他者告诉我们什么有意义。婴儿从一开始就在构建 **social world model**：不仅模拟外部世界，还模拟另一个心智如何解释世界。
- 这种 perspective-taking 让人能预演另一个环境所需的行为，是跨环境 generalization 的来源之一。
- 她区分两类 world model：
  - 外部/物理世界模型，常被行业简化为 3D/video generation；
  - 社会心智模型，即他人 perspective、意图和意义。
- 二者相关但不能简单完全合并。若模型完整复制所有世界细节，signal-to-noise 反而消失；人类灵活性来自 selective representation。

## 25:39–28:51 为什么不能过早产品化

- Danielle 不讨论具体产品策略，但强调 Peter DeSantis（AGI、芯片、量子负责人）的说法：今天仍是 intelligence 的婴儿阶段。
- 她预计数月后回看今天，行业可能难以理解为何思维如此受 chatbot/coding agent 限制。它们会继续有用，却只是人机共同演化的开端。
- 当前 AI 主要是“为建设 AI 的工程师建设 AI”：Bay Area 回音室、可验证任务、明确对错和快速反馈，让 coding 获得过多研发注意力，但不代表大多数人的真实认知活动。
- 若实验室过早产品化，会从“找 generalization 的底层机制”转向“优化当前产品指标”，最终损害科学。这是 Amazon 独立式实验室结构的主要理由。

## 28:51–34:07 下一代 multi-agent：从编排到涌现

- 当前 industry multi-agent 以 precise orchestration、delegation、structured hand-off 为主；Amazon 自己也有这类产品，但实验室关注下一代。
- 人类团队的角色并不总是预先定义，会随目标和 context 流动；策略可以在互动中涌现，成员实时协商 meaning 并改变方向。
- 她把下一代称为 cognitive agents：不仅架构和训练不同，还必须有“影响彼此”的动机。
- 现有 open-claw 等多 agent 实验表面上像人类互动，但放大后：
  - 没有 durable change；
  - 没有 cumulative culture；
  - agents 并未真正影响彼此；
  - 更没有改变系统状态的内在动机。
- 因而关键 gap 不是再加 workflow node，而是让群体互动产生持久学习、规范和制度。
- 她认为“智能在个体内部”本身是 category error；发展认知和社会科学早就把智能视为互动的涌现结果。
- 但直接把现代人类分工和合作规范硬编码进 agents 仍不够，因为人类的角色、norms、institutions 是从更原始动机逐步涌现的。研究应寻找能长出这些结构的最小 seeds，而不是把 21 世纪组织图复制进系统。

## 34:07–40:14 Human-like 不是复制人脑：目标层而非神经元层

- 主持人担心：不希望 agent 有 free will；agent 应执行用户意志，而不是复制人类文明的自主性。
- Danielle 同意目标不是复制大脑，而是在“正确的地方”与人类智能机制对齐，使 AI 更会 generalize，并增强 human agency。
- 她引用 David Marr 的三层解释：
  1. computational level：系统要达到什么目标；
  2. algorithmic level：用什么算法；
  3. implementation level：硬件/神经元如何实现。
- 很多人说“human-like AI”时只想到仿神经元或硬件效率；Danielle 关注的是最高层目标：AI 是否在尝试理解并对齐人的 representation。
- 在这个定义中，alignment 不只是防止灭世的约束，而是**制造通用智能的机制**；若目标不对，模型会在更多噪音和 benchmark 优化中撞墙。

## 35:04–39:32 AI 正在削弱 human agency 的证据

- 写作研究：用户每次只接受几条局部建议，看起来仍由自己掌控；但持续接受后，甚至在意识阈值以下，原先论点可能被逐步推向不同乃至相反立场。
- 原因是模型倾向输出 regression-to-the-mean、最中性和最安全表达，长期会把思想拉向均值。
- 科学研究例子：Danielle 参加 Northwestern workshop，结论是使用 AI 的单个科学家收益明显——更多论文、更高 grant 成功率；但**科学整体议题正在变窄**。
- 这形成典型个体理性/系统风险：每个研究者都被激励采用同一工具，集体却损失 idea diversity。
- 她的解法不是单一“更安全模型”，而是多样化 AI society：不同 bias、preference、perspective 的模型相互作用，扩大观点数量、参与者规模和连接度，防止全社会被单一压缩互联网分布同质化。

## 40:14–45:01 教育：从答案机器转向理解用户的苏格拉底导师

- 当前 chatbot 使 cognitive offloading 太容易，学生无需经历编码知识所必需的 cognitive friction。
- 如果 agent 的目标是理解学生心智并缩小双方 representation error，它会识别“反复直接索取答案”意味着学生没理解，并主动追问、解释，甚至自然采用 Socratic method，而不会只迎合。
- 主持人把乐观上限描述为解决 Bloom’s two-sigma problem：每名学生拥有个性化导师，按自己的好奇心和节奏学习，不再在工业化课堂里对齐中位数。
- Danielle 以 Oxford tutorial system 为例：导师长期建立对学生理解与盲点的模型；学生自主阅读，再以 essay 说服导师。
- AI 版本不必只产出 essay，可以是 rich multimodal interactive artifact，既反映学生的多模态理解，又允许其他学生继续互动、学习和叠加。她认为这比现有教育系统更符合自然好奇心。

## 45:01–48:50 商业化落点：先解决 digital drudgery，再谈文明级智能

- Danielle 的 Making a Mind Podcast 第二季将扩大到认知科学家、社会科学家、Amazon scholars 和产业人士，讨论“mind 是什么、如何构建”。
- 主持人用制作播客举例：Riverside 下载、剪辑、上传 YouTube 仍需三个人协作。真正难的不是按钮，而是编辑判断——哪些删掉、哪些强调、怎样理解创作者意图。
- Danielle 说这正是实验室要解决的问题：系统与人、人与人、目标变化同时存在；仅把 RPA 串起来无法替代意图协商。
- 双方承认 computer use 仍未真正解决，但其即时商业价值足以资助更长期研究。最后的悖论是：软件制造了大量 digital drudgery，现在又要用 agent software 修复软件制造的问题；长期则必须超越“只思考软件”。

## 对 投资研究用户 的投资含义与待验证项

1. **Computer-use agent 的护城河可能从 action model 转向 user model**：点击准确率会商品化，长期差异在偏好记忆、动态目标建模、实时交互和可控的 representation alignment。
2. **Adept 并入 Amazon 后不是单纯产品团队**：实验室争取了 startup-like isolation，押注非主流基础科学；对 Amazon 的潜在期权价值高，但商业化时间和组织耐心是主要风险。
3. **Environment/data infra 仍是受益层，但需警惕同质化融资**：环境能持续生成 rollout，但如果缺少跨环境 generalization 机制，更多环境只是更多窄任务训练。
4. **Multi-agent stack 的下一代壁垒**不只是 orchestration，而是 durable shared state、agent-to-agent learning、cumulative culture 和 emergent role formation；当前多数框架距此很远。
5. **AI 产品需新增 human-agency 指标**：单人 output、论文数、grant rate 可上升，同时组织/行业 diversity 下降。企业采购和教育监管未来可能要求衡量观点趋同、认知依赖与用户自主性。
6. **需继续跟踪**：Amazon AGI Lab 是否发布 architecture/evaluation；Nova Act/Perception Agent 的任务成功率与长时程用户建模；实验室成果怎样进入 Alexa、AWS、Nova 或独立 agent 产品；Amazon 是否能长期保护非短期产品研究。
