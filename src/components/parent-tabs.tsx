import Link from "next/link";
import { cn } from "@/lib/utils";

// 부모님을 한 분씩 고르는 탭. 선택은 주소의 ?member= 로 남겨 새로고침·공유해도 유지된다.
export function ParentTabs({ members, activeId, basePath }: { members: { id: string; name: string }[]; activeId: string; basePath: string }) {
  return (
    <nav aria-label="부모님 선택" className="flex flex-wrap gap-2">
      {members.map((m) => {
        const active = m.id === activeId;
        return (
          <Link
            key={m.id}
            href={`${basePath}?member=${m.id}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-base font-medium transition-colors",
              active ? "bg-foreground text-background" : "border border-border text-foreground hover:bg-muted",
            )}
          >
            {m.name}
          </Link>
        );
      })}
    </nav>
  );
}
