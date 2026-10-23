"use client";

import { CalendarDays, House, ListChecks, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "홈", icon: House },
  { href: "/checkup", label: "올해 검진", icon: ListChecks },
  { href: "/records", label: "기록", icon: CalendarDays },
  { href: "/members", label: "부모님", icon: User },
] as const;

// 하단에 저장 버튼이 붙는 입력·검토 화면에서는 탭을 숨긴다.
const hiddenOn = [/^\/uploads\//, /^\/upload$/, /^\/members\/new$/, /^\/members\/[^/]+\/edit$/];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar() {
  const pathname = usePathname();
  if (hiddenOn.some((re) => re.test(pathname))) return null;

  return (
    <nav aria-label="주요 메뉴" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-[22px]" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

