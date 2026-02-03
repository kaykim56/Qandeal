# Git-Based Task Backfill Workflow

Git commit history를 분석하여 누락된 Task를 자동으로 생성하고 완료 처리하는 워크플로우입니다.

---

## Overview

```
Git Commits → Parse → Match Epic → Create Task → Mark Done
```

**사용 시나리오:**
- 개발은 했지만 Task card를 만들지 않은 경우
- 급하게 hotfix를 배포한 후 기록이 필요한 경우
- 주간/스프린트 회고 시 누락된 작업 정리

---

## Step 1: Git History 분석

### 기본 커밋 조회
```bash
# 최근 1주일간 특정 author의 커밋
git log --author="이름" --since="1 week ago" --pretty=format:"%H|%ad|%s" --date=short

# 특정 기간 동안의 모든 커밋
git log --since="2026-01-27" --until="2026-02-02" --pretty=format:"%H|%an|%ad|%s" --date=short

# 머지 커밋 제외, 실제 작업 커밋만
git log --no-merges --since="1 week ago" --pretty=format:"%H|%an|%ad|%s" --date=short
```

### 상세 정보 포함 조회
```bash
# 변경된 파일 목록 포함
git log --no-merges --since="1 week ago" --pretty=format:"COMMIT:%H|%an|%ad|%s" --date=short --name-only

# 변경 통계 포함 (추가/삭제 라인 수)
git log --no-merges --since="1 week ago" --pretty=format:"%H|%an|%ad|%s" --date=short --stat
```

### PR/브랜치 기반 조회
```bash
# 특정 브랜치에서 main으로 머지된 커밋들
git log main --merges --since="1 week ago" --pretty=format:"%H|%an|%ad|%s" --date=short

# PR 번호 추출 (GitHub 컨벤션 기준)
git log --grep="Merge pull request" --since="1 week ago" --pretty=format:"%s"
```

---

## Step 2: Commit → Task 매핑 규칙

### 2.1 Parts 자동 추론

변경된 파일 경로를 기반으로 Parts를 추론합니다:

| 파일 경로 패턴 | Parts |
|---------------|-------|
| `*/api/*`, `*/server/*`, `*/backend/*` | Backend |
| `*/web/*`, `*/pages/*`, `*/components/*` | Frontend |
| `*/ios/*`, `*/android/*`, `*/app/*` | Client |
| `*/infra/*`, `*/deploy/*`, `*/k8s/*`, `Dockerfile` | DevOps |
| `*/ml/*`, `*/model/*`, `*/ai/*` | AI |
| `*/data/*`, `*/analytics/*` | Data |
| `*/test/*`, `*_test.*`, `*.spec.*` | QA |

### 2.2 Commit Message → Task Name 변환

```
# 일반적인 컨벤션
feat: 새로운 기능 추가        → [Part] 새로운 기능 추가
fix: 버그 수정               → [Part] 버그 수정
refactor: 코드 리팩토링      → [Part] 코드 리팩토링
docs: 문서 수정              → [Part] 문서 수정
chore: 기타 작업             → [Part] 기타 작업

# 예시
"feat: implement user authentication API"
  + 파일: src/api/auth.py
  → "[BE] implement user authentication API"
```

### 2.3 Size 추정

변경된 라인 수 기반 자동 추정:

| 변경 라인 수 | Estimated Size | Actual Size |
|-------------|----------------|-------------|
| 1-50 | 1H | 1H |
| 51-150 | 2H | 2H |
| 151-300 | 4H | 4H |
| 301-500 | 1D | 1D |
| 501-1000 | 2D | 2D |
| 1000+ | 3D+ | 3D+ |

---

## Step 3: Epic 매칭

### 3.1 브랜치명 기반 매칭

브랜치명에 Epic 관련 키워드가 있는 경우:
```bash
# 브랜치명 추출
git log --pretty=format:"%D" | grep -oP 'origin/\K[^,)]+' | head -1

# 예시 브랜치명 → Epic 매칭
feature/user-auth     → "user auth" 또는 "인증" 관련 Epic 검색
fix/payment-bug       → "payment" 또는 "결제" 관련 Epic 검색
epic/EPIC-123-name    → EPIC-123 직접 매칭
```

### 3.2 Notion에서 Epic 검색

```
notion-search:
  query: "[키워드]"
  data_source_url: "collection://57f4208a-b227-4427-9e12-5bc715581d7d"
```

### 3.3 매칭 우선순위

1. 브랜치명에 Epic ID가 명시된 경우 → 직접 매칭
2. PR 제목/본문에 Epic 링크가 있는 경우 → 링크에서 추출
3. 최근 In Progress 상태인 Epic 중 키워드 매칭
4. 매칭 실패 시 → Epic 없이 생성하고 사용자에게 알림

---

## Step 4: Task 자동 생성

### 4.1 단일 커밋 → 단일 Task

```json
{
  "parent": {"data_source_id": "175178ca-a2a8-80a3-80e4-c62e4124851e"},
  "pages": [{
    "properties": {
      "Name": "[BE] implement user authentication API",
      "Status": "Done",
      "Assignee": "[커밋 author의 Notion 사용자 ID]",
      "Epic": "[매칭된 Epic ID]",
      "date:Schedule:start": "2026-01-28",
      "date:Schedule:end": "2026-01-28",
      "Actual Size": "2H",
      "AI Tool Used": ""
    },
    "content": "## Git Commit 기반 자동 생성\n\n**Commit:** [`abc1234`](https://github.com/{org}/{repo}/commit/abc1234)\n**Author:** 홍길동\n**Date:** 2026-01-28\n\n### 변경 내용\n- src/api/auth.py (+120, -30)\n- src/models/user.py (+45, -10)\n\n### Commit Message\n> feat: implement user authentication API\n>\n> - Add JWT token generation\n> - Add login/logout endpoints"
    }
  ]}
}
```

### 4.2 관련 커밋 그룹핑 → 하나의 Task

같은 기능에 대한 여러 커밋을 하나의 Task로 묶기:

```json
{
  "parent": {"data_source_id": "175178ca-a2a8-80a3-80e4-c62e4124851e"},
  "pages": [{
    "properties": {
      "Name": "[BE] User Authentication 기능 구현",
      "Status": "Done",
      "Assignee": "[Notion 사용자 ID]",
      "Epic": "[Epic ID]",
      "date:Schedule:start": "2026-01-27",
      "date:Schedule:end": "2026-01-29",
      "Actual Size": "2D"
    },
    "content": "## Git Commit 기반 자동 생성 (그룹)\n\n### 관련 커밋 목록\n\n| Date | Commit | Message |\n|------|--------|--------|\n| 01-27 | [`abc1234`](https://github.com/{org}/{repo}/commit/abc1234) | feat: add user model |\n| 01-28 | [`def5678`](https://github.com/{org}/{repo}/commit/def5678) | feat: implement auth API |\n| 01-29 | [`ghi9012`](https://github.com/{org}/{repo}/commit/ghi9012) | fix: token expiry bug |\n\n### 총 변경 사항\n- 파일 수정: 8개\n- 추가: +350 lines\n- 삭제: -120 lines"
    }
  ]}
}
```

---

## Step 5: 사용자 매핑

### Git Author → Notion User 매핑 테이블

이 테이블을 skill에 정의하거나 별도 설정 파일로 관리:

```yaml
user_mapping:
  "Hong Gildong": "notion-user-id-1"
  "hong@company.com": "notion-user-id-1"
  "Kim Cheolsu": "notion-user-id-2"
  "kim@company.com": "notion-user-id-2"
```

### Notion 사용자 조회
```
notion-get-users:
  query: "홍길동"
```

---

## Complete Workflow Example

### 입력: "지난 주 내 커밋으로 Task 생성해줘"

**실행 순서:**

1. **Git history 조회**
   ```bash
   git log --author="사용자" --no-merges --since="1 week ago" \
     --pretty=format:"%H|%ad|%s" --date=short --stat
   ```

2. **커밋 파싱 및 그룹핑**
   - 같은 브랜치/기능의 커밋들 그룹화
   - Parts 추론
   - Size 추정

3. **Epic 매칭 시도**
   ```
   notion-search: query="[브랜치 키워드]"
     data_source_url="collection://57f4208a-b227-4427-9e12-5bc715581d7d"
   ```

4. **Task 생성**
   ```
   notion-create-pages: [Task 데이터]
   ```

5. **결과 리포트**
   ```
   생성된 Task:
   - [BE] User Authentication 구현 (Epic: 로그인 개선)
   - [FE] 로그인 페이지 UI 수정 (Epic: 로그인 개선)
   - [DevOps] CI 파이프라인 개선 (Epic: 없음 - 수동 연결 필요)
   ```

---

## Configuration Options

### 환경 변수 또는 설정 파일

```yaml
# .mathpresso-notion-config.yaml
git_task_sync:
  # 커밋 그룹핑 설정
  grouping:
    enabled: true
    by: "branch"  # branch | day | feature

  # 자동 Epic 매칭
  epic_matching:
    enabled: true
    fallback: "create_without_epic"  # create_without_epic | skip | ask

  # Parts 추론 규칙 커스터마이즈
  parts_inference:
    - pattern: "*/qanda-app/*"
      parts: "Client"
    - pattern: "*/qanda-web/*"
      parts: "Frontend"

  # 제외할 커밋 패턴
  exclude_patterns:
    - "^Merge "
    - "^Revert "
    - "^chore: bump version"

  # 최소 변경 라인 수 (너무 작은 커밋 제외)
  min_changes: 10
```

---

## Large Commit Splitting (의미 기반 Task 분할)

하나의 커밋이 여러 의미 단위의 작업을 포함하는 경우, 자동으로 분할하여 Task를 생성합니다.

### 분할 기준

**1. 변경된 파일의 Part가 다른 경우**
```
commit: "feat: implement user feature"
  - src/api/user.py          → [BE] User API 구현
  - src/web/UserPage.tsx     → [FE] User 페이지 구현
  - tests/test_user.py       → [QA] User 테스트 작성
```

**2. 커밋 메시지에 여러 항목이 나열된 경우**
```
commit message:
  "feat: user authentication
   - Add login API
   - Add logout API
   - Add password reset
   - Create auth middleware"

→ Task 분할:
  1. [BE] Add login API
  2. [BE] Add logout API
  3. [BE] Add password reset
  4. [BE] Create auth middleware
```

**3. 변경 파일 그룹이 명확히 분리되는 경우**
```
변경 파일:
  src/api/auth/*        (5 files, +200 lines)
  src/api/payment/*     (3 files, +150 lines)
  src/utils/*           (2 files, +50 lines)

→ Task 분할:
  1. [BE] Auth API 구현 (5 files)
  2. [BE] Payment API 구현 (3 files)
  3. [BE] Utils 개선 (2 files)
```

### 분할 로직 워크플로우

```
1. 커밋 분석
   ├─ 변경된 파일 목록 추출
   ├─ 각 파일의 Part 추론
   └─ 커밋 메시지 파싱

2. 분할 필요 여부 판단
   ├─ Parts가 2개 이상? → 분할
   ├─ 커밋 메시지에 bullet points? → 분할
   ├─ 변경 라인 500+ & 파일 그룹 분리 가능? → 분할
   └─ 그 외 → 단일 Task

3. Task 생성
   ├─ 분할된 각 단위별로 Task 생성
   ├─ 원본 커밋 정보는 모든 Task에 기록
   └─ 관련 Task들 간 연결 (Blocking 관계 선택적)
```

### 커밋 메시지 파싱 패턴

```yaml
# 분할 대상 패턴
split_patterns:
  # Bullet point 목록
  - regex: "^\\s*[-*]\\s+(.+)$"
    multiline: true

  # 번호 목록
  - regex: "^\\s*\\d+\\.\\s+(.+)$"
    multiline: true

  # [Type] prefix 반복
  - regex: "\\[(BE|FE|QA|AI|DevOps)\\]\\s+(.+)"
    multiline: true

  # "and" 연결
  - regex: "(.+?)\\s+and\\s+(.+)"
    split_by: "and"
```

### 분할 Task 생성 예시

**입력:**
```
commit: abc1234
author: Hong Gildong
date: 2026-01-28
message: "feat: implement authentication and authorization"
files:
  - src/api/auth/login.py (+80)
  - src/api/auth/logout.py (+40)
  - src/api/auth/middleware.py (+120)
  - src/web/LoginPage.tsx (+150)
  - src/web/components/AuthGuard.tsx (+60)
  - tests/test_auth.py (+200)
```

**출력 (3개 Task):**

```json
{
  "pages": [
    {
      "properties": {
        "Name": "[BE] Authentication API 구현",
        "Status": "Done",
        "Actual Size": "4H"
      },
      "content": "## Git 기반 자동 생성 (분할 1/3)\n\n**원본 커밋:** [`abc1234`](https://github.com/{org}/{repo}/commit/abc1234)\n\n### 변경 파일\n- src/api/auth/login.py (+80)\n- src/api/auth/logout.py (+40)\n- src/api/auth/middleware.py (+120)"
    },
    {
      "properties": {
        "Name": "[FE] Authentication UI 구현",
        "Status": "Done",
        "Actual Size": "4H"
      },
      "content": "## Git 기반 자동 생성 (분할 2/3)\n\n**원본 커밋:** [`abc1234`](https://github.com/{org}/{repo}/commit/abc1234)\n\n### 변경 파일\n- src/web/LoginPage.tsx (+150)\n- src/web/components/AuthGuard.tsx (+60)"
    },
    {
      "properties": {
        "Name": "[QA] Authentication 테스트 작성",
        "Status": "Done",
        "Actual Size": "2H"
      },
      "content": "## Git 기반 자동 생성 (분할 3/3)\n\n**원본 커밋:** [`abc1234`](https://github.com/{org}/{repo}/commit/abc1234)\n\n### 변경 파일\n- tests/test_auth.py (+200)"
    }
  ]
}
```

### 분할 vs 그룹핑 결정 매트릭스

| 상황 | 결정 | 이유 |
|------|------|------|
| 1 커밋, 1 Part, 작은 변경 | 단일 Task | 분할 불필요 |
| 1 커밋, 여러 Parts | **분할** | Part별로 담당자가 다를 수 있음 |
| 여러 커밋, 같은 기능 | **그룹핑** | 논리적으로 하나의 작업 |
| 1 커밋, 메시지에 여러 항목 | **분할** | 작성자가 명시적으로 구분 |
| 1 커밋, 500+ 라인, 여러 디렉토리 | **분할** | 추적 및 회고 용이 |

### 사용자 확인 프롬프트

분할이 필요해 보이는 경우:
```
⚠️ 커밋 abc1234가 여러 작업을 포함하고 있습니다:
   - Backend: 3개 파일 (+240 lines)
   - Frontend: 2개 파일 (+210 lines)
   - QA: 1개 파일 (+200 lines)

분할하여 3개의 Task를 생성할까요?
1. 예, Part별로 분할 (권장)
2. 아니요, 하나의 Task로 생성
3. 직접 분할 방식 지정
```

---

## Edge Cases & Handling

### 1. Epic을 찾지 못한 경우
```
⚠️ Epic 매칭 실패: "payment-refactor" 브랜치의 커밋
   → 옵션:
   1. Epic 없이 Task 생성 (나중에 수동 연결)
   2. 새 Epic 생성 후 연결
   3. 건너뛰기
```

### 2. 이미 Task가 존재하는 경우
커밋 해시를 Task content에 저장하여 중복 체크:
```
notion-search: query="abc1234"
  data_source_url="collection://175178ca-a2a8-80a3-80e4-c62e4124851e"
```

### 3. 여러 사람이 같은 브랜치에서 작업한 경우
- Author별로 별도 Task 생성
- 또는 Assignee를 multi-select처럼 여러 명 지정 (people 타입 지원)

### 4. Hotfix/긴급 배포
```bash
# production 브랜치로 직접 푸시된 커밋 탐지
git log origin/production --no-merges --since="1 week ago"
```
→ Priority: P0으로 설정하고 "[Hotfix]" prefix 추가

---

## Sample Prompts

사용자가 이 기능을 요청할 수 있는 다양한 표현:

```
"지난 주 내 커밋으로 태스크 카드 만들어줘"
"이번 스프린트에 한 작업들 notion에 기록해줘"
"git history 보고 누락된 task 채워줘"
"내가 한 일 task로 정리해줘"
"커밋 기반으로 done 처리된 task 생성해줘"
"[브랜치명] 작업 완료 처리해줘"
```
