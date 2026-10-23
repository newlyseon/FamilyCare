# 디자인 시스템

화면은 shadcn/ui 컴포넌트(`src/components/ui/`)와 디자인 토큰(`src/app/globals.css`)으로만 그린다. 화면 파일에 `blue-600` 같은 색을 직접 쓰지 않는다.

Figma: [FamilyCare Design System](https://www.figma.com/design/LThAPsWk7FSd9ur2WDbnoz)

| Figma 페이지 | 내용 |
| --- | --- |
| Foundations | 색(Light/Dark), 모서리, 글자 스타일 견본 |
| Components | Button, Input, Select, Badge, Alert, Tab bar, Segment, Metric, 아이콘 |
| Screens | 홈(첫 방문, 다시 방문), 올해 검진, 기록, AI 초안 검토, 저장 완료 (휴대폰 390px). 아래 탭 4개 구조는 요구사항 정의서 2-1 참고 |

## 토큰 이름 맞추기

Figma 변수와 CSS 변수는 같은 이름을 쓴다. Figma 변수의 Code syntax에 CSS 이름이 들어 있다.

| Figma 변수 | 코드 |
| --- | --- |
| `color/primary` (Light, Dark) | `:root`와 `.dark`의 `--primary` |
| `radius/lg` | `--radius` (sm·md·xl은 `--radius`에서 계산) |
| `spacing/4` | Tailwind `p-4` 등 (`--spacing` × 4) |
| `font/sans` | `layout.tsx`의 `next/font`와 `--font-sans` |

FamilyCare 전용 토큰은 `warning`(AI가 확신 못한 칸, 테스트 안내)과 `info`(AI 초안 안내)다.

## 브랜딩 교체 순서

1. Figma에서 변수 값(색, 글꼴, 모서리)을 바꾸고 화면을 확인한다.
2. 같은 값을 `globals.css`의 `:root`, `.dark`에 옮긴다. 글꼴은 `layout.tsx`의 `next/font` 가져오기와 `--font-sans`, `--font-heading`을 함께 바꾼다.
3. 컴포넌트 모양(버튼 높이 등)을 바꿨다면 `src/components/ui/`의 해당 파일을 고친다.

Figma에서 레이아웃을 크게 바꾼 경우는 화면 코드(`src/app/`)도 다시 짜야 한다.
