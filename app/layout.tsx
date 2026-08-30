import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nutllwhy.github.io/chigua-lens/",
);
const socialImage = new URL("og-preview.png", siteUrl);

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "吃瓜神器 Chigua Lens｜把热搜变成可追溯的 9 页简报",
  description:
    "固定虚构案例产品 Demo：展示如何用 Codex Skill 整理人物、时间线、争议说法与可追溯来源。",
  applicationName: "Chigua Lens",
  keywords: ["吃瓜神器", "Chigua Lens", "微博VibeLab", "VibeSocial", "Codex Skill"],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "吃瓜神器 Chigua Lens",
    description: "把零散热点公开信息变成可追溯的 9 页简报。",
    siteName: "吃瓜神器 Chigua Lens",
    images: [
      {
        url: socialImage,
        width: 1280,
        height: 720,
        alt: "吃瓜神器 Chigua Lens 虚构案例预览",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "吃瓜神器 Chigua Lens",
    description: "固定虚构案例 Demo + 开源 Codex Skill。",
    images: [socialImage],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
