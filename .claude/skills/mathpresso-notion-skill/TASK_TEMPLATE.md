# Task Template & Auto-Fill Rules

Task 생성 시 반드시 따라야 하는 템플릿과 각 필드의 자동 채움 규칙을 정의합니다.

---

## Required Task Structure

모든 Task는 아래 구조를 따라야 합니다:

```json
{
  "parent": {"data_source_id": "175178ca-a2a8-80a3-80e4-c62e4124851e"},
  "pages": [{
    "properties": {
      "Name": "[Part] Task 제목",
      "Status": "Done",
      "Priority": "P1",
      "Assignee": "[Notion User ID]",
      "Epic": "[Epic Page ID]",
      "date:Schedule:start": "2026-01-27",
      "date:Schedule:end": "2026-01-29",
      "Estimated Size": "2D",
      "Actual Size": "2D",
      "GitHub PR": "[PR Page ID]",
      "AI Tool Used": ""
    },
    "content": "[Task Content Template - see below]"
  }]
}
```

> ⚠️ **Parts 필드는 비워둠** - Done 처리 시 Parts를 채우지 않습니다.

---

## Task Content Template (Notion 공식)

**새 Task 생성 시 반드시 이 템플릿을 사용하세요:**

```markdown
### Background

---

- [작업의 배경과 맥락]

### Conditions of satisfaction

---

<callout icon="💡">
Ticket 이 마무리 되었다고 할 수 있는 조건들을 작성 부탁드립니다.
</callout>

- [ ] [완료 조건 1]
- [ ] [완료 조건 2]

### Output

---

<callout icon="🎯">
산출물을 명시해주세요.
</callout>

- [산출물 1]
- [산출물 2]
```

---

## Task Content Template (Git Backfill용)

**Git 커밋 기반 자동 생성 시에만 사용:**

```markdown
### Background

---

- [Git 커밋/PR에서 추출한 배경]

### Conditions of satisfaction

---

<callout icon="💡">
Ticket 이 마무리 되었다고 할 수 있는 조건들을 작성 부탁드립니다.
</callout>

- [x] 코드 구현 완료
- [x] 배포 완료

### Output

---

<callout icon="🎯">
산출물을 명시해주세요.
</callout>

**Commits:** (hash + 링크 필수!)
- [`{commit_hash}`](https://github.com/{org}/{repo}/commit/{commit_hash}) - {commit_message}

**또는 PR:**
- [#{pr_number}](https://github.com/{org}/{repo}/pull/{pr_number}) - {pr_title}

**Files:** [변경된 파일 목록]
**Lines:** +{additions}, -{deletions}

---
*Auto-generated from Git commit on {date}*
```

---

## Property Auto-Fill Rules

### 1. Priority

**GitHub PR Labels 기반:**
| PR Label | Priority |
|----------|----------|
| `priority:critical`, `hotfix`, `urgent` | P0 |
| `priority:high`, `important` | P1 |
| `priority:low`, default | P2 |

**커밋 메시지 키워드 기반:**
| Keyword | Priority |
|---------|----------|
| `hotfix`, `critical`, `urgent`, `ASAP` | P0 |
| `important`, `priority` | P1 |
| default | P2 |

**브랜치명 기반:**
| Branch Pattern | Priority |
|----------------|----------|
| `hotfix/*`, `urgent/*` | P0 |
| `feature/*`, `fix/*` | P1 |
| `chore/*`, `docs/*` | P2 |

### 2. Schedule

**Git 커밋 날짜 기반:**
```yaml
# 단일 커밋
Schedule:
  start: commit_date
  end: commit_date

# 여러 커밋 그룹핑
Schedule:
  start: first_commit_date
  end: last_commit_date
```

**PR 기반:**
```yaml
Schedule:
  start: PR created_at
  end: PR merged_at (또는 closed_at)
```

### 3. Estimated Size vs Actual Size

**Git 기반 생성 시 (이미 완료된 작업):**
- `Estimated Size` = `Actual Size` (동일하게 설정)
- 변경 라인 수로 계산

**PR 기반 생성 시:**
- `Estimated Size`: PR 생성 시점의 예상
- `Actual Size`: PR 머지 시점의 실제 소요

**Size 계산 규칙:**
| 변경 라인 | Size |
|----------|------|
| 1-50 | 1H |
| 51-150 | 2H |
| 151-300 | 4H |
| 301-500 | 1D |
| 501-800 | 2D |
| 801-1200 | 3D |
| 1201-2000 | 4D |
| 2000+ | 5D+ |

### 4. GitHub PR

**자동 연결 워크플로우:**

```
1. 커밋 해시로 PR 검색
   gh pr list --search "{commit_hash}" --json number,title,url

2. 브랜치명으로 PR 검색
   gh pr list --head "{branch_name}" --json number,title,url

3. Notion GitHub PRs DB에서 해당 PR 페이지 찾기
   notion-search: query="PR #{number}"
     data_source_url="collection://819f462e-b70a-4fde-8431-3bcb3b1de845"

4. PR 페이지 ID로 Task에 연결
```

**PR이 없는 경우:**
- `GitHub PR` 필드 비워둠
- Task content에 "PR 없음 (direct commit)" 명시

### 5. AI Tool Used

**자동 감지:**
- 커밋 메시지에 AI 관련 키워드 있으면 기록
- PR description에 AI 도구 언급 시 추출

| 키워드 | AI Tool Used 값 |
|--------|-----------------|
| `copilot`, `github copilot` | GitHub Copilot |
| `claude`, `anthropic` | Claude |
| `chatgpt`, `gpt-4` | ChatGPT |
| `cursor` | Cursor |
| `codeium` | Codeium |

---

## GitHub MCP Integration

### PR 정보 조회

```bash
# 특정 커밋이 포함된 PR 찾기
gh pr list --search "{commit_hash}" --state merged --json number,title,url,labels,createdAt,mergedAt,additions,deletions

# 브랜치의 PR 찾기
gh pr view --json number,title,url,labels,body,createdAt,mergedAt,additions,deletions

# PR 상세 정보
gh pr view {pr_number} --json title,body,labels,milestone,assignees,reviewers,additions,deletions,changedFiles,createdAt,mergedAt,mergeCommit
```

### PR → Task Property 매핑

| PR Field | Task Property |
|----------|---------------|
| `title` | Name (prefix 추가) |
| `labels` | Priority 추론 |
| `assignees` | Assignee |
| `createdAt` | Schedule start |
| `mergedAt` | Schedule end |
| `additions + deletions` | Estimated/Actual Size |
| `body` | Background에 요약 포함 |

### Notion GitHub PRs DB 연결

```
# PR이 이미 Notion에 동기화되어 있는지 확인
notion-search:
  query: "#{pr_number}"
  data_source_url: "collection://819f462e-b70a-4fde-8431-3bcb3b1de845"

# 검색 결과에서 page_id 추출하여 Task의 GitHub PR 필드에 연결
```

---

## Slack MCP Integration

### 토큰 절약 워크플로우

**Step 1: 사용자에게 채널 확인**

```
Task 생성을 위해 관련 Slack 스레드를 찾으려 합니다.

이 작업과 관련된 논의가 있었던 채널이 있나요?
1. #dev-backend
2. #dev-frontend
3. #project-{epic_name}
4. 직접 입력
5. Slack 컨텍스트 없이 생성
```

**Step 2: 채널에서 관련 스레드 검색**

```
slack_search_public:
  query: "{keyword} in:#{channel_name}"
  after: "{schedule_start - 7 days}"
  before: "{schedule_end + 1 day}"
```

**Step 3: 스레드 내용 추출**

```
slack_read_thread:
  channel_id: "{channel_id}"
  message_ts: "{thread_ts}"
```

### Background 추출 규칙

**Slack 스레드에서 추출할 내용:**

1. **문제/요청 정의**: 첫 메시지 또는 "문제:", "요청:", "필요:" 키워드
2. **결정 사항**: "결정:", "합의:", "→" 이후 내용
3. **참고 링크**: URL 패턴 추출
4. **멘션된 사람**: Assignee 후보로 활용

**Background 템플릿:**
```markdown
## Background

### 배경
{Slack 첫 메시지 요약}

### 논의 내용
{주요 논의 포인트 요약}

### 결정 사항
- {결정 1}
- {결정 2}

### Reference
- Slack: [{channel_name} thread]({thread_permalink})
```

### Slack 검색 키워드 생성

**Git 정보 기반:**
```yaml
keywords:
  - from_branch: "feature/user-auth" → "user auth", "인증"
  - from_commit_msg: "implement login" → "login", "로그인"
  - from_pr_title: "[BE] Add payment API" → "payment", "결제"
```

**Epic 기반:**
```yaml
keywords:
  - epic_name: "사용자 인증 개선" → "인증", "로그인", "auth"
  - epic_goal: "..." → 핵심 키워드 추출
```

---

## Complete Auto-Fill Workflow

```
1. Git Commit 분석
   ├─ commit hash, author, date, message
   ├─ changed files, lines added/deleted
   └─ branch name

2. GitHub PR 조회 (GitHub MCP)
   ├─ PR number, title, labels
   ├─ created_at, merged_at
   ├─ body (description)
   └─ assignees, reviewers

3. 사용자에게 Slack 채널 확인
   └─ "관련 논의가 있던 채널이 있나요?"

4. Slack 스레드 검색 (Slack MCP)
   ├─ 키워드 기반 검색
   └─ 관련 스레드 내용 추출

5. Epic 매칭
   ├─ 브랜치명/PR 키워드로 검색
   └─ Notion에서 Epic 찾기

6. Property 자동 채움
   ├─ Priority: PR labels > commit keywords > default
   ├─ Schedule: commit dates or PR dates
   ├─ Size: lines changed 기반 계산
   ├─ GitHub PR: Notion PR page 연결
   └─ AI Tool Used: 커밋/PR에서 감지

7. Content 생성
   ├─ Background: Slack 스레드 요약
   ├─ Objective: PR title/description
   ├─ Details: commit messages
   └─ References: 링크 모음

8. Task 생성 (Notion MCP)
   └─ notion-create-pages with full template
```

---

## Example: Full Auto-Generated Task

**Input:**
- Commit: `abc1234` on branch `feature/user-auth`
- PR: #456 "Implement user authentication"
- Slack: #dev-backend 스레드에서 인증 방식 논의

**Output:**
```json
{
  "properties": {
    "Name": "[BE] Implement user authentication",
    "Status": "Done",
    "Priority": "P1",
    "Assignee": "notion-user-id-123",
    "Epic": "epic-page-id-456",
    "date:Schedule:start": "2026-01-27",
    "date:Schedule:end": "2026-01-29",
    "Estimated Size": "2D",
    "Actual Size": "2D",
    "GitHub PR": "notion-pr-page-id-789"
  },
  "content": "## Background\n\n### 배경\n기존 세션 기반 인증의 확장성 문제로 JWT 기반 인증 도입 결정\n\n### 논의 내용\n- JWT vs Session 비교 검토\n- Token refresh 전략 논의\n- Redis 캐시 활용 방안\n\n### 결정 사항\n- JWT + Refresh Token 방식 채택\n- Access Token 만료: 15분\n- Refresh Token 만료: 7일\n\n### Reference\n- Slack: [#dev-backend thread](https://slack.com/...)\n\n## Objective\nJWT 기반 사용자 인증 시스템 구현\n\n## Details\n- Login/Logout API 구현\n- JWT 토큰 생성 및 검증\n- Refresh token rotation\n- Auth middleware 적용\n\n## References\n- GitHub PR: [#456](https://github.com/{org}/{repo}/pull/456)\n- Commits: [`abc1234`](https://github.com/{org}/{repo}/commit/abc1234), [`def5678`](https://github.com/{org}/{repo}/commit/def5678)\n\n---\n*Auto-generated from Git commit [`abc1234`](https://github.com/{org}/{repo}/commit/abc1234) on 2026-01-29*"
}
```
