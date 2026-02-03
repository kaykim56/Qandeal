# Claude Code Setup Guide

이 가이드는 `mathpresso-notion` skill을 Claude Code에서 사용하는 방법을 설명합니다.

---

## 사전 요구사항

### 1. MCP 서버 설정

Claude Code에서 이 skill을 사용하려면 다음 MCP 서버들이 연결되어 있어야 합니다:

| MCP | 필수 여부 | 용도 |
|-----|---------|------|
| Notion | 필수 | Task/Epic/Initiative CRUD |
| GitHub | 필수 | PR 정보 조회, 커밋 연결 |
| Slack | 선택 | Background 컨텍스트 추출 |

### 2. 인증 설정

**Notion MCP:**
- Notion Integration Token 필요
- 해당 워크스페이스의 데이터베이스 접근 권한 필요

**GitHub:**
- `gh` CLI 로그인 (`gh auth login`)
- 또는 GitHub MCP 서버 연결

**Slack MCP:**
- Slack 워크스페이스 연결 필요

---

## 설치 방법

### 방법 1: 프로젝트별 CLAUDE.md에 포함 (권장)

프로젝트 루트에 `CLAUDE.md` 파일을 만들고 skill 내용을 포함시킵니다.

```bash
# 프로젝트 루트로 이동
cd /your/project/root

# CLAUDE.md 생성 또는 편집
```

**CLAUDE.md 예시:**
```markdown
# Project Instructions

이 프로젝트에서 Claude는 다음 skill을 따릅니다.

## Notion Project Management

[SKILL.md 내용 전체 붙여넣기]

## Task Template

[TASK_TEMPLATE.md 내용 전체 붙여넣기]

## Git Task Sync

[GIT_TASK_SYNC.md 내용 전체 붙여넣기]
```

### 방법 2: 글로벌 설정 (모든 프로젝트에서 사용)

```bash
# Claude Code 설정 디렉토리
mkdir -p ~/.claude/skills/mathpresso-notion

# Skill 파일들 복사
cp -r /path/to/mathpresso-notion-skill/* ~/.claude/skills/mathpresso-notion/
```

그 후 `~/.claude/settings.json`에 skill 경로 추가:
```json
{
  "skills": [
    "~/.claude/skills/mathpresso-notion"
  ]
}
```

### 방법 3: 대화 중 컨텍스트로 제공

Claude Code 대화에서 직접 파일을 제공:
```
@SKILL.md @TASK_TEMPLATE.md @GIT_TASK_SYNC.md

지난 주 내 커밋으로 Task 카드 생성해줘
```

---

## MCP 서버 설정 (settings.json)

Claude Code의 MCP 설정 파일 위치:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**예시 설정:**
```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@anthropic/notion-mcp"],
      "env": {
        "NOTION_TOKEN": "your-notion-integration-token"
      }
    },
    "slack": {
      "command": "npx",
      "args": ["-y", "@anthropic/slack-mcp"],
      "env": {
        "SLACK_TOKEN": "your-slack-token"
      }
    }
  }
}
```

---

## 사용 예시

### 기본 사용법

Claude Code에서 자연어로 요청:

```
# Git 기반 Task 생성
"지난 주 내 커밋으로 Task 카드 생성하고 Done 처리해줘"

# 특정 브랜치의 작업 기록
"feature/user-auth 브랜치 작업 Task로 만들어줘"

# PR 기반 Task 생성
"PR #123 완료됐으니 Task 카드 만들어줘"

# Slack 컨텍스트 포함
"지난 주 작업 Task로 만들어줘. #dev-backend 채널에서 논의 내용도 찾아서 Background에 넣어줘"
```

### Slash Command 스타일 (설정된 경우)

```
/task create --from-git --author="홍길동" --since="1 week ago"
/task backfill --branch="feature/payment"
/epic status --name="사용자 인증 개선"
```

---

## 워크플로우 예시

### 1. 주간 Task 백필

**입력:**
```
이번 주에 한 작업들 Notion Task로 정리해줘
```

**Claude 동작:**
1. Git history 조회 (`git log --since="1 week ago"`)
2. 커밋별 Parts/Size 추론
3. GitHub PR 정보 조회 및 연결
4. (선택) Slack 채널 확인 → 관련 스레드 검색
5. Epic 매칭
6. Task 생성 (Status: Done)

### 2. PR 완료 후 Task 기록

**입력:**
```
PR #456 머지했어. Task 카드 만들어줘
```

**Claude 동작:**
1. `gh pr view 456` 으로 PR 정보 조회
2. PR의 commits, labels, description 분석
3. Notion에서 관련 Epic 검색
4. Task 생성 with GitHub PR 연결

### 3. Hotfix 기록

**입력:**
```
방금 hotfix 배포했어. 커밋 abc1234로 Task 만들어줘
```

**Claude 동작:**
1. `git show abc1234` 으로 커밋 정보 조회
2. Priority: P0 자동 설정 (hotfix)
3. Task 생성 with Status: Done

---

## Troubleshooting

### "Notion MCP not connected"

```bash
# Notion Integration Token 확인
echo $NOTION_TOKEN

# MCP 서버 재시작
# Claude Code 재시작
```

### "Epic not found"

```
⚠️ Epic 매칭 실패: "feature-xyz" 키워드로 Epic을 찾지 못했습니다.

옵션:
1. Epic 이름을 직접 입력해주세요
2. Epic 없이 Task 생성 (나중에 수동 연결)
3. 새 Epic을 먼저 생성
```

### "GitHub PR not found"

```bash
# gh CLI 로그인 확인
gh auth status

# PR 조회 테스트
gh pr list --repo owner/repo
```

### Slack 검색 결과 없음

```
💡 Slack에서 관련 스레드를 찾지 못했습니다.
   다른 채널이나 키워드로 검색할까요?

   또는 Background 없이 Task를 생성할 수 있습니다.
```

---

## 설정 커스터마이즈

`config.template.yaml`을 `config.yaml`로 복사하여 수정:

```bash
cp config.template.yaml config.yaml
```

주요 설정 항목:
- `user_mapping`: Git author → Notion user ID 매핑
- `parts_inference.rules`: 파일 경로 → Parts 추론 규칙
- `git_task_sync.exclude_patterns`: 제외할 커밋 패턴
- `commit_splitting`: 커밋 분할 설정

---

## 팁

### 1. Git Author 매핑 설정

처음 사용 시 Claude가 Git author와 Notion 사용자를 매칭하지 못할 수 있습니다.
`config.yaml`에 매핑을 추가하거나, Claude에게 알려주세요:

```
"홍길동"은 Notion에서 "Gildong Hong"이야
```

### 2. 토큰 절약

Slack 검색은 토큰을 많이 사용합니다. 필요하지 않으면:
```
"Slack 컨텍스트 없이 Task 만들어줘"
```

### 3. 대량 백필 시

많은 커밋을 처리할 때는 기간을 나눠서 요청:
```
"1월 첫째 주 작업 먼저 Task로 만들어줘"
"1월 둘째 주 작업도 해줘"
```

---

## Quick Start

**가장 간단한 시작 방법:**

1. 프로젝트 루트에 `CLAUDE.md` 파일 생성
2. `SKILL.md` + `TASK_TEMPLATE.md` + `GIT_TASK_SYNC.md` 내용 붙여넣기
3. Claude Code 실행
4. "지난 주 내 커밋으로 Task 만들어줘" 입력

끝!
