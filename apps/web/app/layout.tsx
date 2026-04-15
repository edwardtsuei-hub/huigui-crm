import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "洄归生态客户管理与报价协同系统",
  description: "面向网页端的 CRM、农业方案报价与协同系统"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
