import type { Metadata } from "next";
import "./globals.css";
import { MainLayout } from "@/components/layout/main-layout";

export const metadata: Metadata = {
  title: "AI台风预测分析平台",
  description: "基于人工智能的台风路径预测与风险分析平台，提供实时台风监测和智能预警服务。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col font-sans">
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
