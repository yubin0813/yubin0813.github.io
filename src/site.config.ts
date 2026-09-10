export interface SocialLink {
  platform: string
  url: string
}

export const siteConfig = {
  // 站点地址，用于 sitemap、RSS、canonical 等
  url: 'https://yubin0813.github.io',

  // 站点信息
  title: 'Yubin 的技术笔记',
  description: '记录编程与学习过程中的思考，专注技术本身。',

  // 作者
  author: 'yubin',

  // 默认主题：auto（跟随系统）、light、dark
  defaultTheme: 'auto' as 'auto' | 'light' | 'dark',

  // 社交链接，空数组则不显示
  socials: [
    { platform: 'github', url: 'https://github.com/yubin0813' },
    { platform: 'rss', url: '/rss.xml' },
  ] as SocialLink[],
}
