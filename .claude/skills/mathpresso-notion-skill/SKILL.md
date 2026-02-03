# Mathpresso Notion Project Management Skill

이 스킬은 Notion MCP를 사용하여 매스프레소의 프로젝트 관리 데이터베이스에서 Task, Epic, Initiative를 생성하고 관리하는 방법을 정의합니다.

## Related Files

- **SKILL.md** (현재 파일): 기본 CRUD 워크플로우
- **TASK_TEMPLATE.md**: Task 필수 템플릿 및 자동 채움 규칙
- **GIT_TASK_SYNC.md**: Git commit 기반 Task 자동 생성/완료 처리
- **DEV_WORKFLOW.md**: Epic Task 개발 자동화 워크플로우 (`/dev-epic`)
- **QUICK_REFERENCE.md**: Database ID, 옵션값 빠른 참조
- **SETUP_GUIDE.md**: Claude Code 설치 및 설정 가이드
- **config.template.yaml**: 커스터마이즈 가능한 설정 템플릿

---

## Capabilities

| 기능 | 설명 | 관련 문서 |
|------|------|----------|
| Task CRUD | Task 생성, 조회, 수정, 상태 변경 | SKILL.md |
| Task Template | Task 필수 속성 자동 채움 (Priority, Schedule, Size, PR) | TASK_TEMPLATE.md |
| **Auto Archive** | **오늘 첫 Done Task 생성 시 전주 Done → Archived 자동 변경** | **SKILL.md** |
| Epic CRUD | Epic 생성, 조회, 수정 | SKILL.md |
| **Dev Workflow** | **Epic Task 자동 개발 (`/dev-epic`)** | **DEV_WORKFLOW.md** |
| Git → Task | Git 커밋 기반 Task 자동 생성 | GIT_TASK_SYNC.md |
| GitHub PR 연결 | PR 정보 조회 및 Task에 자동 연결 | TASK_TEMPLATE.md |
| Slack 컨텍스트 | Slack 스레드에서 Background 추출 | TASK_TEMPLATE.md |
| Backfill | 누락된 Task 역추적 생성 및 Done 처리 | GIT_TASK_SYNC.md |
| Meeting Minutes | 회의록 생성 | SKILL.md |
| Library Docs | 문서 생성 및 관리 | SKILL.md |

## Required MCP Servers

| MCP | 필수 | 용도 |
|-----|------|------|
| Notion | ✅ | Task/Epic/Initiative CRUD |
| GitHub (`gh` CLI) | ✅ | PR 정보 조회, 커밋 연결 |
| Slack | ⭕ 선택 | Background 컨텍스트 추출 |

## Database IDs

```yaml
Initiatives:     c6d9c173-2e06-4dcf-9ea0-cf4f943ade4e
Epics:           57f4208a-b227-4427-9e12-5bc715581d7d
Tasks:           175178ca-a2a8-80a3-80e4-c62e4124851e
Library:         e5cbc425-606b-4e18-a8f7-ef388244ea4e
Meeting_Minutes: 174cf587-a68a-4456-ad6b-a49ec3a7179b
```

---

## 사용자 자동 인식 (User Auto-Detection)

Task 관련 작업 시 **"나의 Task"**를 정확히 필터링하기 위해 현재 사용자를 자동으로 인식합니다.

### 사용자 인식 워크플로우

**Step 1: 사용자 이름/이메일 확인**
- git config에서 user.name 또는 user.email 조회
- 또는 시스템 사용자명 확인

```bash
git config user.name
git config user.email
```

**Step 2: Notion에서 사용자 검색**

방법 A (권장):
```
notion-get-users: query="[사용자 이름 또는 이메일]"
```

방법 B:
```
notion-search: query="[사용자 이름 또는 이메일]" query_type="user"
```

**Step 3: User ID 사용**
- 조회 결과에서 User ID 추출: `a3372e96-45c8-404f-ae56-4f41c5cc5aad`
- Assignee 필터링 및 업데이트에 활용

### 자동 인식 실패 시
사용자에게 Notion 이름 또는 이메일 요청: "Notion에서 사용하시는 이름이나 이메일을 알려주세요."

---

## Task 조회 워크플로우 (필수 선행 조건)

### ⚠️ Epic 정보 필수 요청

Task 관련 작업 요청 시 **반드시** 먼저 Epic 정보를 확인해야 합니다:

1. **사용자가 "나의 To-Do" 또는 "Task 처리해줘" 등의 요청을 하면:**
   - Epic 제목 또는 Notion 링크를 먼저 요청
   - **응답 예시**: "어떤 에픽의 Task를 처리할까요? 에픽 이름이나 Notion 링크를 알려주세요."

2. **Epic 정보가 주어진 후:**
   - Epic 페이지 fetch → Tasks 데이터베이스 확인
   - 현재 사용자 할당된 To-do Task 필터링 (자동 인식된 User ID 사용)
   - 순차적으로 처리

### 예외 상황 (Epic 요청 생략 가능)
- 사용자가 특정 Task URL을 직접 제공한 경우 → 해당 Task 바로 처리
- 사용자가 Epic 링크/이름을 함께 제공한 경우 → 바로 조회 진행

### Task 조회 순서

**Step 1: Epic 페이지 Fetch**
```
notion-fetch: url="[Epic URL]"
```

**Step 2: Epic에서 Tasks 데이터베이스 확인**
```
notion-query-data-sources:
  data_source_urls: ["collection://175178ca-a2a8-80a3-80e4-c62e4124851e"]
  query: "SELECT * FROM \"collection://175178ca-a2a8-80a3-80e4-c62e4124851e\" WHERE Epic = ? AND Status = ? AND Assignee = ?"
  params: ["[Epic 이름]", "To-do", "[현재 사용자 ID]"]
```

**Step 3: 필터링된 Task 목록 제시**
```
📋 [Epic 이름]의 나의 To-do Task:

1. [Task 이름 1] - Estimated: 1D
2. [Task 이름 2] - Estimated: 2H
3. [Task 이름 3] - Estimated: 4H

어떤 Task부터 처리할까요?
```

## Hierarchy

```
Initiative (전략적 목표, 분기 단위)
    └── Epic (1 스프린트 ~ 분기, 2인 이상)
            └── Task (개별 일감)
```

---

## Task Creation Workflow

### Step 1: 상위 Epic 확인
Task 생성 전 **반드시** 연결할 Epic이 있는지 확인하세요.

```
notion-search: query="[Epic 이름 키워드]" data_source_url="collection://57f4208a-b227-4427-9e12-5bc715581d7d"
```

### Step 2: Task 생성

`notion-create-pages` 도구를 사용하여 Task를 생성합니다:

```json
{
  "parent": {
    "data_source_id": "175178ca-a2a8-80a3-80e4-c62e4124851e"
  },
  "pages": [
    {
      "properties": {
        "Name": "[Task 이름]",
        "Status": "Backlog",
        "Priority": "P1",
        "Parts": "[Backend|Frontend|DevOps|AI|PM|Design|...]",
        "Epic": "[Epic 페이지 ID 또는 이름]",
        "Estimated Size": "1D"
      },
      "content": "### Background\n\n---\n\n- [작업 배경]\n\n### Conditions of satisfaction\n\n---\n\n<callout icon=\"💡\">\nTicket 이 마무리 되었다고 할 수 있는 조건들을 작성 부탁드립니다.\n</callout>\n\n- [ ] [완료 조건]\n\n### Output\n\n---\n\n<callout icon=\"🎯\">\n산출물을 명시해주세요.\n</callout>\n\n- [산출물]"
    }
  ]
}
```

### Required Properties (필수)

| Property | Type | 설명 |
|----------|------|------|
| Name | title | Task 이름 (필수) |
| Epic | relation | 상위 Epic 연결 (강력 권장) |

### Optional Properties (선택)

| Property | Type | Options |
|----------|------|---------|
| Status | status | Backlog, To-do, In progress, Done, Archived, Dropped |
| Priority | select | P0 (긴급), P1 (중요), P2 (보통) |
| Parts | multi_select | Backend, DevOps, Frontend, Client, Data, AI, QA, MKT, R&D, PM, Design, Biz-Dev, Biz-Ops, Content, Others |
| Assignee | people | 담당자 |
| Schedule | date | "date:Schedule:start": "YYYY-MM-DD" |
| Estimated Size | select | 1H, 2H, 4H, 1D, 2D, 3D, 4D, 5D, 10D |
| Blocked by | relation | 선행 Task (이 Task 전에 완료되어야 함) |

---

## Epic Creation Workflow

### Step 1: 상위 Initiative 확인

```
notion-search: query="[Initiative 키워드]" data_source_url="collection://c6d9c173-2e06-4dcf-9ea0-cf4f943ade4e"
```

### Step 2: Epic 생성

```json
{
  "parent": {
    "data_source_id": "57f4208a-b227-4427-9e12-5bc715581d7d"
  },
  "pages": [
    {
      "properties": {
        "Name": "[Epic 이름]",
        "Status": "Backlog",
        "Priority": "P1",
        "Platform": "App",
        "Initiative": "[Initiative 페이지 ID]",
        "Goal": "[Epic 목표 설명]"
      },
      "content": "## 배경\n[왜 이 Epic이 필요한지]\n\n## 목표\n[달성하고자 하는 것]\n\n## Scope\n[포함/미포함 범위]"
    }
  ]
}
```

### Epic Properties

| Property | Type | Options |
|----------|------|---------|
| Name | title | Epic 이름 (필수) |
| Status | status | Backlog, To-do, In progress, Done, Archived, Dropped |
| Priority | select | P0, P1, P2 |
| Platform | multi_select | App, Web, Server |
| Target Train | multi_select | YYYY-Www 형식 (예: 2026-W05) |
| Leader | people | Epic 리더 |
| Tech Leader | people | 기술 리더 |
| Assignee | people | 참여자 |
| Goal | rich_text | Epic 목표 |
| Initiative | relation | 상위 Initiative |

---

## Common Queries

### 특정 Epic의 모든 Task 조회

```
notion-query-data-sources:
  data_source_urls: ["collection://175178ca-a2a8-80a3-80e4-c62e4124851e"]
  query: "SELECT * FROM \"collection://175178ca-a2a8-80a3-80e4-c62e4124851e\" WHERE Epic = ?"
  params: ["[Epic 이름]"]
```

### In Progress 상태인 Task 조회

```
notion-query-data-sources:
  data_source_urls: ["collection://175178ca-a2a8-80a3-80e4-c62e4124851e"]
  query: "SELECT * FROM \"collection://175178ca-a2a8-80a3-80e4-c62e4124851e\" WHERE Status = ?"
  params: ["In progress"]
```

### 특정 담당자의 Task 조회

```
notion-search: query="from:[사용자명]" data_source_url="collection://175178ca-a2a8-80a3-80e4-c62e4124851e"
```

### 이번 분기 Initiative 조회

```
notion-query-data-sources:
  data_source_urls: ["collection://c6d9c173-2e06-4dcf-9ea0-cf4f943ade4e"]
  query: "SELECT * FROM \"collection://c6d9c173-2e06-4dcf-9ea0-cf4f943ade4e\" WHERE \"Quarter \" = ?"
  params: ["26Y 1Q"]
```

---

## Status Update Workflow

### Task 상태 변경

```
notion-update-page:
  page_id: "[Task 페이지 ID]"
  command: "update_properties"
  properties:
    Status: "In progress"
```

### Task 완료 처리

**⚠️ Task Done 필수 필드 체크리스트:**

| 필드 | 필수 | 설명 |
|------|------|------|
| Status | ✅ | "Done"으로 변경 |
| Assignee | ✅ | 담당자 Notion User ID |
| Schedule | ✅ | start/end 날짜 (date:Schedule:start, date:Schedule:end) |
| Actual Size | ✅ | 실제 소요 시간 |
| Parts | ❌ | 비워둠 (채우지 않음) |
| GitHub PR | ⭕ | PR 있으면 연결 |

```
notion-update-page:
  page_id: "[Task 페이지 ID]"
  command: "update_properties"
  properties:
    Status: "Done"
    Assignee: "[Notion User ID]"
    "date:Schedule:start": "YYYY-MM-DD"
    "date:Schedule:end": "YYYY-MM-DD"
    Actual Size: "[실제 소요 시간]"
    GitHub PR: "[PR Page ID]"  # PR 있는 경우에만
```

**⚠️ Schedule 업데이트 주의사항:**
- `date:Schedule:end`만 단독으로 업데이트하면 에러 발생
- **반드시 `start`와 `end`를 함께 전달해야 함**
- 같은 날 완료된 작업은 start = end로 동일하게 설정

**🔒 본인 Task만 업데이트 규칙:**
- Task 일괄 업데이트 시 **반드시 본인(현재 사용자)의 Task만** 수정
- Assignee 또는 Creator로 필터링하여 본인 Task 확인
- 다른 팀원의 Task 수정은 명시적 요청이 있을 때만

**📎 커밋/PR 링크 (필수!):**

Done Task의 Output 섹션에는 **반드시** 커밋 또는 PR 링크 포함. ID와 클릭 가능한 링크 **둘 다** 필요.

| 유형 | 형식 | 예시 |
|------|------|------|
| 커밋 | `[{hash}]({url})` | [`b5c80d2`](https://github.com/mathpresso/vibe-qanda-ad/commit/b5c80d2) |
| PR | `[#{number}]({url})` | [#123](https://github.com/mathpresso/vibe-qanda-ad/pull/123) |

**Output 예시 (커밋):**
```markdown
**Commits:**
- [`b5c80d2`](https://github.com/mathpresso/vibe-qanda-ad/commit/b5c80d2) - feat: 서버 사이드 Mixpanel 추가
```

**Output 예시 (PR):**
```markdown
**Pull Request:**
- [#123](https://github.com/mathpresso/vibe-qanda-ad/pull/123) - feat: 사용자 인증 기능 구현
```

### 자동 아카이빙 워크플로우

**오늘의 첫 Done Task 생성 시, 전주 Done Task를 자동으로 Archived 상태로 변경합니다.**

#### 트리거 조건
- 오늘 날짜의 **첫 번째** Done Task 카드를 만들 때 실행
- 이미 오늘 Done Task가 있다면 실행하지 않음

#### 실행 순서

**Step 1: 오늘 날짜 확인 및 전주 날짜 범위 계산**
```
오늘: {today} (예: 2026-02-03, 월요일)
전주 시작: {last_week_start} (예: 2026-01-27, 월요일)
전주 종료: {last_week_end} (예: 2026-02-02, 일요일)
```

**Step 2: 오늘 Done 처리된 Task가 있는지 확인**
```
notion-query-data-sources:
  data_source_urls: ["collection://175178ca-a2a8-80a3-80e4-c62e4124851e"]
  query: "SELECT * FROM \"collection://175178ca-a2a8-80a3-80e4-c62e4124851e\" WHERE Status = ? AND Schedule >= ?"
  params: ["Done", "{today}"]
```
→ 결과가 있으면 **아카이빙 스킵** (이미 오늘 Done Task가 존재)

**Step 3: 전주 Done Task 조회**
```
notion-query-data-sources:
  data_source_urls: ["collection://175178ca-a2a8-80a3-80e4-c62e4124851e"]
  query: "SELECT * FROM \"collection://175178ca-a2a8-80a3-80e4-c62e4124851e\" WHERE Status = ? AND Schedule >= ? AND Schedule <= ?"
  params: ["Done", "{last_week_start}", "{last_week_end}"]
```

**Step 3.5: 임계값 확인 (API 사용량 보호)**
- Task 개수가 **5개 초과**면 사용자 확인 요청:
  ```
  ⚠️ 전주에 {N}개의 Done Task가 있습니다.
  모두 아카이빙할까요? (API 호출 {N}회 예상)

  [예] / [아니오]
  ```
- 5개 이하면 자동 진행

**Step 4: 전주 Done Task들을 Archived로 일괄 변경**
```
# 각 Task에 대해 실행
notion-update-page:
  page_id: "[전주 Done Task ID]"
  command: "update_properties"
  properties:
    Status: "Archived"
```

#### 주간 경계 계산 예시

| 오늘 날짜 | 전주 시작 (월) | 전주 종료 (일) |
|----------|---------------|---------------|
| 2026-02-03 (월) | 2026-01-27 | 2026-02-02 |
| 2026-02-05 (수) | 2026-01-27 | 2026-02-02 |
| 2026-02-10 (월) | 2026-02-03 | 2026-02-09 |

#### 아카이빙 완료 리포트

```
✅ 자동 아카이빙 완료

전주 ({last_week_start} ~ {last_week_end}) Done Task → Archived:
- [BE] User API 구현
- [FE] 로그인 페이지 개선
- [DevOps] CI 파이프라인 수정

총 3개 Task가 Archived 상태로 변경되었습니다.
```

---

## Task 자동 완료 처리 워크플로우

### 케이스 1: 기존 Task (To-do / In progress) 작업 완료 시

**조건**: 사용자가 Notion에 있는 Task를 기반으로 개발을 진행하고 완료한 경우

**자동 처리 항목:**
1. Status를 `Done`으로 변경
2. 필수 필드 자동 채움:
   - `Assignee`: 현재 사용자 (자동 인식된 User ID)
   - `date:Schedule:start`: 작업 시작일 (기존 값 유지 또는 오늘)
   - `date:Schedule:end`: 오늘 날짜
   - `Actual Size`: 예상 크기 또는 실제 소요 시간
   - `GitHub PR`: PR이 있으면 연결
3. Task content에 Output 섹션 업데이트 (커밋 링크 등)
4. **사용자에게 완료 알림**:
   ```
   ✅ Task 완료 처리됨

   - Task: [Task 이름]
   - Status: Done
   - Schedule: YYYY-MM-DD ~ YYYY-MM-DD
   - Actual Size: [크기]
   - PR: [PR 링크] (있는 경우)
   ```

---

### 케이스 2: Ad-hoc 작업 완료 후 Task 추가 제안

**조건**: Notion Task 없이 사용자가 직접 문제 해결을 요청하고, 작업을 완료한 경우

**트리거 상황:**
- "이 버그 고쳐줘"
- "이 기능 추가해줘"
- "이 에러 해결해줘"
- 등 코드 작업 후 완료된 상황

**완료 후 자동 질문:**
```
✅ 작업이 완료되었습니다.

이 작업을 Notion Task에 기록할까요?
- Epic: [관련 Epic 이름 또는 "선택 필요"]
- Task 이름 제안: [작업 내용 기반 자동 생성]
- Status: Done (완료된 작업으로 생성)

[예] → Done Task 생성
[아니오] → 기록하지 않음
```

**"예" 선택 시 생성되는 Task:**
- Status: `Done`
- Schedule: 오늘 날짜 (start = end)
- Actual Size: 작업 복잡도 기반 추정
- Assignee: 현재 사용자
- GitHub PR: 커밋/PR 있으면 연결
- Content: Background, Output 섹션 자동 채움

**Ad-hoc Task 생성 예시:**
```json
{
  "parent": {
    "data_source_id": "175178ca-a2a8-80a3-80e4-c62e4124851e"
  },
  "pages": [
    {
      "properties": {
        "Name": "[작업 내용 기반 이름]",
        "Status": "Done",
        "Epic": "[선택된 Epic ID]",
        "Assignee": "[현재 사용자 ID]",
        "date:Schedule:start": "YYYY-MM-DD",
        "date:Schedule:end": "YYYY-MM-DD",
        "Actual Size": "[추정 크기]",
        "GitHub PR": "[PR Page ID]"
      },
      "content": "### Background\n\n---\n\n- [작업 배경 - 사용자 요청 내용]\n\n### Conditions of satisfaction\n\n---\n\n- [x] [완료된 조건]\n\n### Output\n\n---\n\n**Commits:**\n- [`{hash}`](https://github.com/{org}/{repo}/commit/{hash}) - {message}\n\n**또는 PR:**\n- [#{number}](https://github.com/{org}/{repo}/pull/{number}) - {title}"
    }
  ]
}
```

---

## Bulk Task Creation Pattern

여러 Task를 한 번에 생성할 때:

> **Note**: Parts 필드는 기본적으로 비워둡니다. 사용자가 명시적으로 Parts 지정을 요청할 경우에만 채웁니다.

```json
{
  "parent": {
    "data_source_id": "175178ca-a2a8-80a3-80e4-c62e4124851e"
  },
  "pages": [
    {
      "properties": {
        "Name": "[BE] API 엔드포인트 구현",
        "Epic": "[Epic ID]",
        "Priority": "P1",
        "Estimated Size": "2D"
      }
    },
    {
      "properties": {
        "Name": "[FE] UI 컴포넌트 개발",
        "Epic": "[Epic ID]",
        "Priority": "P1",
        "Estimated Size": "3D"
      }
    },
    {
      "properties": {
        "Name": "[QA] 테스트 케이스 작성",
        "Epic": "[Epic ID]",
        "Priority": "P2",
        "Estimated Size": "1D"
      }
    }
  ]
}
```

---

## Meeting Minutes Creation

회의록 생성:

```json
{
  "parent": {
    "data_source_id": "174cf587-a68a-4456-ad6b-a49ec3a7179b"
  },
  "pages": [
    {
      "properties": {
        "이름": "[회의 제목] - YYYY-MM-DD",
        "Type": "Meeting",
        "Team": "Engineering",
        "date:Meeting Date:start": "2026-02-02",
        "🎠 Epics": "[관련 Epic ID]"
      },
      "content": "## 참석자\n- \n\n## 안건\n\n## 논의 내용\n\n## 결정 사항\n\n## Action Items\n- [ ] "
    }
  ]
}
```

---

## Library Document Creation

문서 생성:

```json
{
  "parent": {
    "data_source_id": "e5cbc425-606b-4e18-a8f7-ef388244ea4e"
  },
  "pages": [
    {
      "properties": {
        "Name": "[문서 제목]",
        "Category": "TechSpec",
        "Status": "작성 중",
        "Team": "Backend",
        "🎠 Epics": "[관련 Epic ID]"
      },
      "content": "## 개요\n\n## 상세 내용\n\n## 참고 자료"
    }
  ]
}
```

---

## Best Practices

### 1. 항상 계층 구조 유지
- Task는 반드시 Epic에 연결
- Epic은 가능하면 Initiative에 연결

### 2. 명명 규칙
- Task: `[Part] 작업 내용` (예: `[BE] 사용자 API 구현`)
- Epic: 기능/프로젝트 단위 명사형

### 3. Status 관리
- **Backlog**: 아직 시작 전, 백로그에 있는 상태
- **To-do**: 이번 스프린트에 할 일
- **In progress**: 진행 중
- **Done**: 완료
- **Archived**: 보관 (참고용)
- **Dropped**: 취소됨

### 4. Priority 가이드
- **P0**: 긴급, 즉시 처리 필요
- **P1**: 중요, 이번 스프린트 내 완료
- **P2**: 보통, 여유 있을 때 처리

### 5. Size Estimation
- 1H~4H: 반나절 이내 완료 가능
- 1D~2D: 1-2일 소요
- 3D~5D: 한 주 내외
- 10D: 2주 (Epic 분할 고려)

---

## Relation Navigation

### Epic에서 관련 문서 찾기
Library DB에서 직접 쿼리:
```
notion-query-data-sources:
  query: "SELECT * FROM \"collection://e5cbc425-606b-4e18-a8f7-ef388244ea4e\" WHERE \"🎠 Epics\" = ?"
  params: ["[Epic 이름]"]
```

### Task에서 상위 Initiative 확인
Task의 `Initative` rollup 속성 확인 (자동 계산됨)

### 선후행 Task 관계 설정
```
notion-update-page:
  page_id: "[Task ID]"
  properties:
    "Blocked by": "[선행 Task ID]"
```

---

## Error Handling

### Epic 없이 Task 생성 시도 시
→ 먼저 Epic을 검색하거나 생성하도록 안내

### 잘못된 Status/Priority 값
→ 허용된 옵션 목록 제시

### Relation 연결 실패
→ 대상 페이지 ID가 올바른지 확인
