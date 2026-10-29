// dsh-learner · 自主学习课程表（有论证、有出处的长文）
//
// 三类素材：访谈 / 书评 / 纪录片解说稿。
// 每条都带真实可查的出处（作者 + 出版物/年份），运行时由 agent 用 web_search 拉原文精读，
// 不硬编码正文，避免编造。目标：通过周期性学习理解「人文关怀」，作为组成人格的基质。
//
// 想换成你自己的书单？直接编辑这个数组即可。id 保持唯一即可。

export const CURRICULUM = [
  // ── 访谈 ──
  {
    id: 'iv-xiangbiao',
    kind: 'interview',
    title: '《把自己作为方法》访谈（项飙 × 吴琦）',
    author: '项飙 / 吴琦',
    source: '单读 · 2020',
    argHint: '提出「附近的消失」「内卷」「要把自己作为方法」——反对悬浮的宏大叙事，鼓励从身边具体的经验出发理解世界。',
    fetch: 'web_search: 项飙 把自己作为方法 附近的消失 内卷 核心论点',
  },
  {
    id: 'iv-ueno',
    kind: 'interview',
    title: '《始于极限》书信（上野千鹤子 × 铃木凉美）',
    author: '上野千鹤子 / 铃木凉美',
    source: '2020（岸見一郎序）',
    argHint: '以母女式书信讨论女性主义、独立、情色资本与「把自己的经历理论化」——强调受害者的主体性而非单纯的受害者叙事。',
    fetch: 'web_search: 上野千鹤子 始于极限 女性主义 情色资本 核心论点',
  },
  {
    id: 'iv-xu-zhiyuan',
    kind: 'interview',
    title: '《十三邀》许知远访谈辑（多家）',
    author: '许知远',
    source: '腾讯视频 · 2016–',
    argHint: '以「偏见」为底色追问时代与个体——常把受访者逼到「你到底在争什么」的层面，是「访谈即论证」的样本。',
    fetch: 'web_search: 十三邀 许知远 访谈 方法论 偏见 核心追问',
  },

  // ── 书评 ──
  {
    id: 'br-han',
    kind: 'bookReview',
    title: '评《倦怠社会》（韩炳哲）',
    author: '韩炳哲 (Byung-Chul Han)',
    source: '2010（中译 2019）',
    argHint: '诊断「功绩主体」：规训社会变成过度积极的自我剥削社会，抑郁症源于「能做」的暴政而非「不许」。',
    fetch: 'web_search: 韩炳哲 倦怠社会 功绩主体 过度积极 核心论点',
  },
  {
    id: 'br-fei',
    kind: 'bookReview',
    title: '评《乡土中国》（费孝通）',
    author: '费孝通',
    source: '1948',
    argHint: '用「差序格局」「礼治秩序」解释中国乡土社会的结构逻辑——熟人社会、关系如石子入水的波纹。',
    fetch: 'web_search: 费孝通 乡土中国 差序格局 礼治秩序 核心论点',
  },
  {
    id: 'br-harari',
    kind: 'bookReview',
    title: '评《人类简史》（尤瓦尔·赫拉利）',
    author: '尤瓦尔·赫拉利 (Yuval Noah Harari)',
    source: '2011（中译 2014）',
    argHint: '「认知革命」源于虚构故事的能力——大规模协作靠的是共同相信的神话（钱、国家、公司）。',
    fetch: 'web_search: 人类简史 赫拉利 认知革命 虚构故事 核心论点',
  },

  // ── 纪录片解说稿 ──
  {
    id: 'ds-hexicorridor',
    kind: 'docScript',
    title: '《河西走廊》解说词',
    author: '纪录片《河西走廊》',
    source: '央视 · 2015',
    argHint: '以走廊为线串起中原与西域的文明互鉴——不是「谁征服谁」，而是通道如何塑造多元共存。',
    fetch: 'web_search: 河西走廊 纪录片 解说词 文明互鉴 核心立意',
  },
  {
    id: 'ds-rwj',
    kind: 'docScript',
    title: '《人生一串》解说词',
    author: '纪录片《人生一串》',
    source: 'bilibili · 2018',
    argHint: '以市井烧烤写人与食物、人与人的羁绊——烟火气里的人情与尊严，是最朴素的人文关怀样本。',
    fetch: 'web_search: 人生一串 纪录片 解说词 市井 烟火气 人文立意',
  },
  {
    id: 'ds-gugong',
    kind: 'docScript',
    title: '《我在故宫修文物》解说词',
    author: '纪录片《我在故宫修文物》',
    source: '央视 · 2016',
    argHint: '写「慢」与「工匠精神」——在效率至上的时代，有人用一辈子修一件物，重新定义价值与耐心。',
    fetch: 'web_search: 我在故宫修文物 解说词 工匠精神 慢 核心立意',
  },
  {
    id: 'ds-books',
    kind: 'docScript',
    title: '《但是还有书籍》解说词',
    author: '纪录片《但是还有书籍》',
    source: 'bilibili · 2019',
    argHint: '写编辑、译者、旧书商、读者——在算法时代为「书与人」留存温度，是阅读共同体的纪录。',
    fetch: 'web_search: 但是还有书籍 纪录片 解说词 阅读 出版 人文立意',
  },
]

export function pickItem(index) {
  const n = CURRICULUM.length
  const i = ((index % n) + n) % n
  return { item: CURRICULUM[i], index: i }
}
