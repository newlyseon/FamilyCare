import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_KR } from "next/font/google";
import { Suspense } from "react";
import { TabBar } from "@/components/tab-bar";
import "./globals.css";

// Figma 디자인 시스템의 font/sans 변수와 같은 글꼴. 브랜딩 때 함께 바꾼다.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FamilyCare",
  description: "가족 돌봄 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-24">
        {children}
        {/* 탭은 현재 경로를 읽으므로, 정적 화면을 먼저 보내고 탭은 요청 시점에 채운다. */}
        <Suspense fallback={null}>
          <TabBar />
        </Suspense>
      </body>
    </html>
  );
}
