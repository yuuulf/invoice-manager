import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar, SidebarNav } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "請求書管理",
  description: "請求書の作成・管理を行うアプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full">
        <Suspense fallback={<SidebarNav pathname={null} />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 p-8">{children}</main>
      </body>
    </html>
  );
}
