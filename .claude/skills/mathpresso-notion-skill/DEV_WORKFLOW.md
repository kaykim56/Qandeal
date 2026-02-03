# Epic Task 개발 자동화 워크플로우

Epic의 Task를 Priority 순서대로 조회하고, 자동으로 개발을 진행하는 워크플로우입니다.

---

## ⚡ API 최적화 가이드

**목표**: Task당 API 호출 최소화 (4-5회 → 2-3회)

| 단계 | 기존 | 최적화 |
|------|------|--------|
| Task 조회 | 1회 | 1회 |
| In progress 변경 | 1회 | **생략** (4H 이하 작업) |
| Done + 속성 업데이트 | 1회 | 1회 (모든 속성 한 번에) |
| Content 업데이트 | 1회 | **조건부** (Output 있을 때만) |

**규칙:**
- 짧은 작업(Estimated 4H 이하): In progress 생략 → 바로 Done
- Content 업데이트: 커밋/PR 링크 있을 때만 실행

---

## 호출 방법

```
/dev-epic [Epic URL 또는 ID]
```

**예시:**
```
/dev-epic https://www.notion.so/mathpresso/득템-챌린지-2e0178caa2a880149506e86af2da6fae
/dev-epic 2e0178ca-a2a8-8014-9506-e86af2da6fae
```

---

## 워크플로우 다이어그램

```
Epic URL/ID 입력
       ↓
Task 조회 (Priority 순 정렬: P0 > P1 > P2)
       ↓
┌──────────────────────────────────────────┐
│  Task 선택 (가장 높은 Priority)            │
│          ↓                                │
│  Task 명확성 검증                          │
│          ↓                                │
│  모호함? ────Yes───→ 사용자에게 질문        │
│    │ No               ↓                   │
│    ↓            질문 해결 후 계속           │
│  UX/UI Task? ──Yes──→ UX/UI 질문 필수      │
│    │ No               ↓                   │
│    ↓            답변 후 계속               │
│  코드 탐색 및 작성  ←─────────────────────┤
│          ↓                                │
│  Git commit (Task ID 포함)                │
│          ↓                                │
│  PR 생성 (선택적)                          │
│          ↓                                │
│  ┌─────────────────────────────────┐      │
│  │ 완료 처리 (필수!)                │      │
│  │ • Status → "Done"              │      │
│  │ • Actual Size 업데이트          │      │
│  │ • Conditions of satisfaction ✓ │      │
│  │ • Output에 커밋/파일 기록       │      │
│  │ • AI Tool Used 기록            │      │
│  └─────────────────────────────────┘      │
│          ↓                                │
│  다음 Task 있음? ─────────────────────────┼──→ 종료
│          ↓ Yes                            │
│  사용자에게 계속 진행할지 확인              │
│          ↓                                │
└──────────────────────────────────────────┘
```

---

## Step 1: Epic Task 조회

### 1.1 Epic URL에서 ID 추출

Epic URL 형식:
- `https://www.notion.so/mathpresso/Epic-Name-{page_id}`
- `https://www.notion.so/{workspace}/{page_id}`

URL에서 마지막 32자리(하이픈 포함 36자리) 추출하여 page_id로 사용

### 1.2 Epic 페이지 정보 조회

```
notion-fetch:
  url: "notion://page/{Epic ID}"
```

### 1.3 Epic의 모든 Task 조회

```
notion-query-data-sources:
  data_source_urls: ["collection://175178ca-a2a8-80a3-80e4-c62e4124851e"]
  query: "SELECT * FROM \"collection://175178ca-a2a8-80a3-80e4-c62e4124851e\" WHERE Epic = ?"
  params: ["[Epic 이름]"]
```

### 1.4 필터링 및 정렬

**필터링 조건:**
- Status가 `To-do` 또는 `In progress`인 Task만 선택
- `Backlog`, `Done`, `Archived`, `Dropped` 제외

**Priority 순서 정렬:**
1. P0 (긴급) - 최우선
2. P1 (중요) - 두 번째
3. P2 (보통) - 세 번째

동일 Priority 내에서는:
- `Blocked by` 관계가 없는 Task 우선
- Schedule 날짜가 빠른 순

---

## Step 2: 개발 시작

### 2.1 Task 선택

가장 높은 Priority의 Task를 선택하고 사용자에게 확인:

```
📋 다음 Task를 시작합니다:

Task: [Task 이름]
Priority: P0
Epic: [Epic 이름]
Estimated Size: 2D

진행하시겠습니까? (y/n)
```

### 2.2 상태 변경 → "In progress" (조건부)

**⚡ API 최적화**: 짧은 작업(4H 이하)은 In progress 변경 생략. 완료 시 바로 Done 처리.

긴 작업(1D 이상)만 In progress로 변경:
```
notion-update-page:
  page_id: "[Task 페이지 ID]"
  command: "update_properties"
  properties:
    Status: "In progress"
```

### 2.3 Task 내용 읽기

Task 페이지에서 다음 내용 추출:
- **Background**: 작업 배경 및 컨텍스트
- **Conditions of satisfaction**: 완료 조건 체크리스트
- **Output**: 예상 산출물

```
notion-fetch:
  url: "notion://page/{Task ID}"
```

---

## Step 2.5: Task 명확성 검증 (중요!)

**Task 설명이 불완전하거나 모호한 경우 반드시 사용자에게 질문합니다.**

### 검증 체크리스트

| 항목 | 검증 내용 |
|------|----------|
| Background | 작업 배경이 충분히 상세한가? |
| Conditions of satisfaction | 완료 조건이 명확하게 정의되어 있는가? |
| Output | 산출물이 구체적으로 명시되어 있는가? |
| 기술적 방향 | 구현 방식이 명확한가? |

### 모호한 경우 질문 예시

```
⚠️ Task 명확성 검증 필요

Task "[Task 이름]"에서 다음 사항이 불명확합니다:

1. Background에서 "[X] 부분"이 명확하지 않습니다.
   - [A] 방식으로 진행할까요?
   - [B] 방식으로 진행할까요?

2. Conditions of satisfaction 중 "[Y]"의 완료 기준은 무엇인가요?
   - 예시: API 응답 시간 < 200ms
   - 예시: 에러율 < 1%

3. Output에 명시된 "[Z]"가 구체적으로 무엇을 의미하나요?

명확히 해주시면 개발을 시작하겠습니다.
```

---

## Step 2.6: UX/UI Task 필수 질문 (중요!)

### UX/UI Task 감지 키워드

다음 키워드가 Task 이름이나 내용에 포함된 경우 UX/UI Task로 분류:

| 카테고리 | 키워드 |
|----------|--------|
| 일반 | `UX`, `UI`, `디자인`, `개선`, `사용성`, `인터페이스` |
| 컴포넌트 | `모달`, `버튼`, `레이아웃`, `스타일`, `폼` |
| 효과 | `애니메이션`, `트랜지션`, `반응형` |
| 기타 | `색상`, `폰트`, `간격`, `정렬` |

### 필수 질문 항목

UX/UI Task가 감지되면 **반드시** 다음 질문을 먼저 합니다:

```
🎨 UX/UI Task 감지됨

Task "[Task 이름]"은 UX/UI 개선 작업입니다.
진행 전 다음 사항을 확인해주세요:

1. 어떤 방향으로 UX/UI를 개선하길 원하시나요?
   - 예: 더 간단하게 / 더 정보를 많이 보여주게 / 더 모던하게

2. 참고할 디자인이나 예시가 있나요?
   - Figma 링크
   - 참고 사이트 URL
   - 스크린샷

3. 현재 UX의 어떤 점이 불편하신가요?
   - 구체적인 문제점

4. 개선 후 사용자 경험이 어떻게 달라지길 원하시나요?
   - 기대하는 결과

⚠️ UX/UI Task는 사용자 피드백 없이 진행하지 않습니다.
```

**질문이 해결된 후에만 코드 작성을 진행합니다.**

---

## Step 3: 코드 작성

### 3.1 관련 코드 파일 탐색

Task 내용을 바탕으로 관련 파일 탐색:

```bash
# 관련 컴포넌트/함수 검색
grep -r "관련키워드" --include="*.ts" --include="*.tsx"

# 파일 구조 파악
ls -la app/ components/ lib/
```

### 3.2 코드 작성

Task 요구사항에 따라 코드 작성:
- 기존 코드 스타일 준수
- TypeScript 타입 안전성 유지
- 에러 핸들링 포함

### 3.3 Git Commit 생성

**Commit 메시지 형식:**
```
<type>: <description>

Task: notion://page/{Task ID}
```

**타입 예시:**
- `feat`: 새 기능
- `fix`: 버그 수정
- `refactor`: 리팩토링
- `style`: 스타일 변경
- `docs`: 문서 수정

```bash
git add .
git commit -m "feat: [Task 이름]

Task: notion://page/{Task ID}"
```

### 3.4 PR 생성 (선택적)

사용자가 요청한 경우 PR 생성:

```bash
gh pr create --title "[Task 이름]" --body "## Summary
- Task 내용 요약

## Task Link
notion://page/{Task ID}

## Checklist
- [ ] 코드 리뷰 완료
- [ ] 테스트 완료"
```

---

## Step 4: 완료 처리

### 4.1 Task 상태 → "Done" (모든 속성 한 번에)

**⚡ API 최적화**: 모든 속성을 한 번의 API 호출로 업데이트

```
notion-update-page:
  page_id: "[Task 페이지 ID]"
  command: "update_properties"
  properties:
    Status: "Done"
    Assignee: "[현재 사용자 ID]"
    "date:Schedule:start": "[작업 시작일]"
    "date:Schedule:end": "[오늘]"
    Actual Size: "[실제 소요 시간]"
    AI Tool Used: "Claude Code (Opus 4.5)"
    GitHub PR: "[PR URL]"  # 있는 경우만
```

### 4.2 Content 업데이트 (조건부 - 1회 API 호출)

**⚡ API 최적화**: 커밋/PR이 있을 때만 실행. Conditions 체크 + Output을 한 번에 처리.

**포함 항목:**
- Conditions of satisfaction: `[ ]` → `[x]` 체크
- Output 섹션에 산출물 기록

Task 페이지의 Output 섹션에 실제 산출물을 기록합니다:

```markdown
### Output
---
**수정된 파일:**
- `lib/date-utils.ts` - KST 시간 유틸리티 함수 생성
- `lib/db/participations.ts` - reviewed_at KST 저장
- `lib/sheets-sync.ts` - timestamp KST 저장

**마이그레이션:**
- `scripts/migrate-utc-to-kst.ts` - 기존 83개 레코드 UTC→KST 변환 완료

**Commits:** (hash + 링크 필수!)
- [`abc1234`](https://github.com/mathpresso/vibe-qanda-ad/commit/abc1234) - feat: KST 시간 유틸리티 추가
- [`def5678`](https://github.com/mathpresso/vibe-qanda-ad/commit/def5678) - feat: UTC -> KST 마이그레이션

**또는 PR인 경우:**
- [#123](https://github.com/mathpresso/vibe-qanda-ad/pull/123) - feat: DB 시간 KST 변환
```

### ⚠️ Task 완료 체크리스트

Task를 Done으로 변경하기 전 반드시 확인:

| 항목 | 필수 | 설명 |
|------|------|------|
| Status → Done | ✅ | 상태 변경 |
| Actual Size | ✅ | 실제 소요 시간 기록 |
| Conditions of satisfaction | ✅ | 모든 완료 항목 체크 [x] |
| **Output (커밋/PR 링크)** | ✅ | **hash/번호 + 클릭 가능한 링크 둘 다 필수** |
| AI Tool Used | ✅ | 사용한 AI 도구 기록 |
| **Assignee** | ✅ | Epic의 Assignee 중 작업자 지정 |
| **Schedule** | ✅ | 작업 완료 날짜 (오늘) |
| Parts | ❌ | **비워둠** (자동 집계용이므로 수동 입력 불필요) |
| GitHub PR 속성 | ⬜ | PR 생성 시에만 (DB 속성) |

### Task 속성 규칙

**반드시 채워야 하는 속성:**
- `Name`: Task 이름 (예: `[BE] 서버 사이드 Mixpanel 추가`)
- `Status`: Done
- `Priority`: P0/P1/P2
- `Estimated Size`: 예상 소요 시간
- `Actual Size`: 실제 소요 시간
- `AI Tool Used`: Claude Code (Opus 4.5)
- `Assignee`: Epic의 Assignee 중 작업자
- `Schedule`: 작업 완료 날짜
- `Epic`: 연결된 Epic

**비워두는 속성:**
- `Parts`: 비워둠 (자동 집계용)

---

## Step 4.5: 파생 작업 Task 생성 (중요!)

Task를 진행하다가 발생한 파생 작업이나, 사용자가 직접 요청한 추가 작업도 **반드시 Task로 기록**합니다.

### 파생 작업이란?

| 유형 | 예시 |
|------|------|
| 원래 Task에서 발견된 추가 문제 | UTC 마이그레이션 중 formatDateTime() 함수 문제 발견 |
| 사용자가 중간에 요청한 작업 | "이것도 같이 수정해줘" |
| 리뷰/테스트 중 발견된 버그 | 로컬에서 테스트하니 시간이 9시간 밀림 |

### 파생 Task 생성 규칙

1. **작업 완료 후 즉시 Task 생성** (Done 상태로)
2. **원래 Task와 연관 관계 명시** (Background에 "~의 파생 Task" 기록)
3. **동일한 Epic에 연결**
4. **Conditions of satisfaction 모두 체크 상태로**
5. **Output에 실제 산출물 기록**

### 파생 Task 템플릿

```markdown
### Background
---
- [원래 Task 이름]의 파생 Task
- [발생 원인/배경 설명]

### Conditions of satisfaction
---
<callout icon="💡">
Ticket 이 마무리 되었다고 할 수 있는 조건들을 작성 부탁드립니다.
</callout>
- [x] [완료 조건 1]
- [x] [완료 조건 2]

### Output
---
<callout icon="🎯">
산출물을 명시해주세요.
</callout>
**수정된 파일:**
- `파일경로` - 변경 내용

**Commits:**
- `커밋 메시지`
```

---

## Step 5: 다음 Task로 자동 진행

### 5.1 다음 Task 확인

완료 후 남은 Task 목록 재조회:

```
📋 Task 완료!

완료된 Task: [Task 이름]
남은 Task: 3개

다음 Task:
- [P0] [FE] 에러 처리 개선
- [P1] [BE] API 최적화
- [P2] [QA] 테스트 케이스 추가

다음 Task를 시작하시겠습니까? (y/n)
```

### 5.2 계속 진행

사용자가 `y`를 입력하면 Step 2로 돌아가 다음 Task 진행.

---

## 전체 실행 예시

```
> /dev-epic https://www.notion.so/mathpresso/득템-챌린지-2e0178caa2a880149506e86af2da6fae

🔍 Epic 조회 중...
Epic: 득템 챌린지
총 Task: 12개
진행 가능 Task: 5개 (To-do: 4, In progress: 1)

📋 Priority 순 Task 목록:
1. [P0] [BE] SMS 발송 버그 수정 - To-do
2. [P1] [FE] 챌린지 상세 페이지 개선 - To-do
3. [P1] [BE] API 성능 최적화 - In progress
4. [P2] [QA] E2E 테스트 추가 - To-do
5. [P2] [FE] 다크모드 지원 - To-do

▶️ 가장 높은 Priority Task:
Task: [BE] SMS 발송 버그 수정
Priority: P0
Status: To-do → In progress
Estimated Size: 4H

진행하시겠습니까? (y/n): y

✅ Task 상태가 "In progress"로 변경되었습니다.

📖 Task 내용 확인 중...

### Background
- SMS 발송 시 특정 조건에서 중복 발송되는 버그 발생
- rate limiting 로직 점검 필요

### Conditions of satisfaction
- [ ] SMS 중복 발송 버그 수정
- [ ] rate limiting 1분으로 조정
- [ ] 테스트 코드 추가

### Output
- 수정된 SMS 발송 코드
- 관련 테스트 코드

✅ Task 명확성 검증 완료

🔍 관련 파일 탐색 중...
- app/api/sms/route.ts
- lib/sms.ts

💻 코드 작성 중...
[코드 수정 진행]

📝 Git commit 생성...
git commit -m "fix: SMS 발송 rate limiting 1분으로 조정

Task: notion://page/abc123..."

✅ Task 완료 처리 중...
Status: In progress → Done
Actual Size: 2H

🎉 Task 완료!

남은 Task: 4개
다음 Task: [FE] 챌린지 상세 페이지 개선 (P1)

다음 Task를 시작하시겠습니까? (y/n):
```

---

---

## Notion Markdown 규칙

### Callout 형식 (중요!)

Notion에서 callout을 작성할 때 `<aside>` 태그가 아닌 `<callout>` 태그를 사용해야 합니다.

**❌ 잘못된 형식:**
```markdown
<aside>
💡 내용
</aside>
```

**✅ 올바른 형식:**
```markdown
<callout icon="💡">
내용
</callout>
```

### 자주 사용하는 Callout 아이콘

| 용도 | 아이콘 | 예시 |
|------|--------|------|
| 팁/안내 | 💡 | `<callout icon="💡">` |
| 목표/산출물 | 🎯 | `<callout icon="🎯">` |
| 중요 | 📌 | `<callout icon="📌">` |
| 경고 | ⚠️ | `<callout icon="⚠️">` |
| 정보 | ℹ️ | `<callout icon="ℹ️">` |

---

## 관련 문서

- **SKILL.md**: 기본 CRUD 워크플로우
- **TASK_TEMPLATE.md**: Task 필수 템플릿 및 자동 채움 규칙
- **GIT_TASK_SYNC.md**: Git commit 기반 Task 자동 생성/완료 처리
- **QUICK_REFERENCE.md**: Database ID, 옵션값 빠른 참조
