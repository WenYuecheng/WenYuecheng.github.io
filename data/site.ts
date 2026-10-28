/** Public portfolio facts and copy. No secrets belong in this file. */
export type Locale = 'en' | 'zh';
export const locales: Locale[] = ['en', 'zh'];
export const site = {
  name: 'Eugene', email: '15698557180@163.com',
  url: 'https://wenyuecheng.cn',
  api: process.env.NEXT_PUBLIC_GUESTBOOK_API || 'https://wenyuecheng.cn/api/portal',
  portrait: "/images/eugene-avatar.webp",
  art: { home: '/images/generated/letter-garden.webp', day: '/images/generated/hero-day.webp', night: '/images/generated/hero-night.webp', weyra: '/images/generated/weyra-cover.webp', solaceai: '/images/generated/solaceai-cover.webp', contact: '/images/generated/contact-garden.webp', profile: '/images/generated/profile-garden.webp', wall: '/images/generated/message-garden.webp' },
};
export type Track = { title: string; artist: string; src: string; cover?: string };
// Add local MP3 files to public/music/ and list them here. Autoplay is attempted only when a real track exists.
export const music: { autoPlay: boolean; volume: number; tracks: Track[] } = {
 autoPlay: true, volume: 0.25,
 tracks: [{ title: "Can't Give Up", artist: 'ZXXXQ', src: '/music/cant-give-up.mp3' }],
};
export function routeFor(locale: Locale, path = '/') {
  const clean = path.replace(/^\/zh(?=\/|$)/, '') || '/';
  return `${locale === 'zh' ? '/zh' : ''}${clean.startsWith('/') ? clean : `/${clean}`}`;
}
export const content = {
  en: {
    nav: { home: 'Home', projects: 'Projects', wall: 'Wall', contact: 'Contact' },
    brand: 'Eugene’s little universe', tagline: 'The road is long; keep walking, and you will arrive.', name: 'Eugene',
    hero: { greeting: 'Outside the window is Florence; on the desk is death. If today I withdraw from everything, it is because I can do nothing but love and look up.', title: 'With fortune, all things align.\nWithout it, even heroes are bound.', subtitle: 'Agents · Recursive Self-Improvement · PEFT', intro: 'Building AI systems that learn from experience and act with care.', meet: 'Meet Eugene', work: 'Explore my projects', contact: 'Say hello', scroll: 'A little more about me' },
    profile: { eyebrow: 'Hello, fellow explorer', title: 'Undeterred by fate,\nrenewing myself daily.', motto: 'Participation or withdrawal depends on the reality. Action or inaction is my decision.', text: 'I’m Eugene. Welcome to my little corner of the internet — a place for curiosity, ideas and good conversations.', photoAlt: 'Anime avatar of Eugene', interests: 'Things I’m exploring' },
    interests: [ { title: 'Agent', sub: 'From intent to action', body: 'Runtimes, tools, context and memory that help an agent carry a task through.' }, { title: 'RSI', sub: 'From feedback to improvement', body: 'Exploring self-improvement through skill updates, independent verification and reversible changes.' }, { title: 'PEFT', sub: 'Small updates, useful adaptation', body: 'LoRA, efficient local inference and preference alignment for domain-specific models.' } ],
    projects: { eyebrow: 'Made with curiosity', title: 'Projects', intro: 'Exploring how intelligent systems work, improve, and help people.', all: 'All projects', open: 'Discover the project', back: 'Back to projects', detail: 'Learn more', architecture: 'How it fits together', contributions: 'What I built', links: 'Explore further', other: 'The other side of the story', demo: 'A window into the system', demoNote: 'An illustrated walkthrough of the implementation, not a live execution.' },
    contact: { eyebrow: 'There’s always room for a good conversation', title: 'Let’s make\nsomething meaningful.', intro: 'Questions about agents, skill evolution or model adaptation? I’d love to exchange ideas.', email: 'Write me a letter', github: 'Follow the code', csdn: 'Read my notes', copy: 'Copy email', copied: 'Email copied', copyFail: 'Please select and copy the address', guestbook: 'Leave a little note', guestbookSub: 'A small wall for thoughts, greetings and connections.', line: 'Every good collaboration starts with a hello.' },
    guestbook: { title: 'A little note,\na lovely connection.', intro: 'Leave a greeting, a thought, or a question. Notes are public—please keep personal details private.', name: 'Your name (optional)', message: 'What would you like to say?', send: 'Pin my note', sending: 'Pinning…', empty: 'A quiet corner, waiting for the first hello.', error: 'Notes are unavailable right now. You can still reach me by email.', success: 'Your note is on the wall. Thank you!', failed: 'Could not send your note. Please try again in a moment.', loading: 'Opening the message wall…', anonymous: 'A visitor', back: 'Back to contact', max: 'Up to 500 characters' },
    controls: { theme: 'Switch colour theme', motion: 'Toggle background animation', menu: 'Open navigation', close: 'Close navigation', music: 'Background music', noMusic: 'A soundtrack is on its way', noMusicHint: 'Music is not configured yet.', pause: 'Pause music', play: 'Play music', blocked: 'Tap to start the soundtrack', audioError: 'This track is unavailable', language: '中文' },
    footer: 'The road is long; keep walking, and you will arrive.', rights: 'Eugene', skip: 'Skip to content', notFound: 'This path leads somewhere new.', notFoundSub: 'That page has left this little universe. Let’s head home.'
  },
  zh: {
    nav: { home: '首页', projects: '项目', wall: '留言墙', contact: '联系' },
    brand: 'Eugene 的小小宇宙', tagline: '道阻且长，行则将至', name: 'Eugene',
    hero: { greeting: '窗外是佛罗伦萨，桌上是死。如果今天的我远离一切，那是因为除了爱和仰望，我别无所能。', title: '时来天地皆同力，\n运去英雄不自由。', subtitle: 'Agent · RSI · PEFT', intro: '探索能够从经验中成长、在真实世界可靠行动的 AI 系统。', meet: '认识一下', work: '看看我的项目', contact: '和我聊聊', scroll: '往下走，认识更多一点' },
    profile: { eyebrow: '很高兴，在这里遇见你', title: '知命不惧，\n日日自新。', motto: '用舍由时，行藏在我。', text: '我是 Eugene，欢迎来到我的小小世界。在这里，记录好奇，也期待每一次有趣的相遇。', photoAlt: 'Eugene 的 Q 版头像', interests: '最近感兴趣的事' },
    interests: [ { title: 'Agent', sub: '从理解意图，到完成任务', body: '关注运行时、工具、上下文与记忆，让智能体在长程任务中持续推进。' }, { title: 'RSI', sub: '从一次反馈，到下一次改进', body: '以技能更新、独立验证和可回滚的变更，探索智能体自我改进的路径。' }, { title: 'PEFT', sub: '小规模更新，更贴近场景', body: '通过 LoRA、端侧高效推理与偏好对齐，让模型适应具体领域。' } ],
    projects: { eyebrow: '认真做过的事，会留下痕迹', title: '项目', intro: '探索智能系统如何工作、持续改进，并为人带来帮助。', all: '全部项目', open: '走进这个项目', back: '返回项目列表', detail: '进一步了解', architecture: '系统如何运转', contributions: '我完成的工作', links: '继续探索', other: '看看另一个项目', demo: '打开系统的一扇窗', demoNote: '根据实现整理的交互式流程示意，并非实时执行。' },
    contact: { eyebrow: '有趣的想法，值得交换', title: '从一句你好，\n开始新的可能。', intro: '如果你也对智能体、技能演进或模型适配感兴趣，欢迎一起交流。', email: '给我写封信', github: '看看我的代码', csdn: '读一读技术笔记', copy: '复制邮箱', copied: '邮箱已复制', copyFail: '请选中邮箱地址手动复制', guestbook: '留下一张小纸条', guestbookSub: '问候、想法和建议，都可以留在这里。', line: '也许，下一段有趣的合作就从这里开始。' },
    guestbook: { title: '一张小纸条，\n一次温暖的相遇。', intro: '留下问候、想法或建议。留言公开展示，请不要填写私人信息。', name: '你的名字（可选）', message: '有什么想说的话？', send: '把纸条贴上去', sending: '正在贴上…', empty: '安静的小角落，等待第一声你好。', error: '暂时无法打开留言本，也可以通过邮箱联系我。', success: '纸条已经贴好，谢谢你的留言！', failed: '发送未成功，请稍后再试。', loading: '正在打开留言墙…', anonymous: '一位访客', back: '返回联系页', max: '最多 500 字' },
    controls: { theme: '切换日夜主题', motion: '开关背景动效', menu: '打开导航', close: '关闭导航', music: '背景音乐', noMusic: '等待一段合适的旋律', noMusicHint: '暂未添加音乐曲目。', pause: '暂停音乐', play: '播放音乐', blocked: '点击，让旋律开始', audioError: '暂时无法播放这首音乐', language: 'English' },
    footer: '道阻且长，行则将至', rights: 'Eugene', skip: '跳转到正文', notFound: '这条小路，通向了新的地方。', notFoundSub: '这个页面已经离开小小宇宙，我们回首页看看吧。'
  },
};

/** Opaque routes only; descriptions and assets are returned after authentication. */
export const projectSlugs=["weyra","solaceai"] as const;
