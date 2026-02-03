# Quick Reference Card

## Database IDs (Copy-Paste Ready)

| Database | ID |
|----------|-----|
| Initiatives | `c6d9c173-2e06-4dcf-9ea0-cf4f943ade4e` |
| Epics | `57f4208a-b227-4427-9e12-5bc715581d7d` |
| Tasks | `175178ca-a2a8-80a3-80e4-c62e4124851e` |
| GitHub PRs | `819f462e-b70a-4fde-8431-3bcb3b1de845` |
| Library | `e5cbc425-606b-4e18-a8f7-ef388244ea4e` |
| Meeting Minutes | `174cf587-a68a-4456-ad6b-a49ec3a7179b` |

## Status Options

### Tasks & Epics
`Backlog` | `To-do` | `In progress` | `Done` | `Archived` | `Dropped`

### Initiatives
`Not started` | `In progress` | `Done` | `Archived`

### Library
`작성 중` | `작성 완료` | `Deprecated`

## Priority
`P0` (긴급) | `P1` (중요) | `P2` (보통)

## Parts (Tasks)
`Backend` | `DevOps` | `Frontend` | `Client` | `Data` | `AI` | `QA` | `MKT` | `R&D` | `PM` | `Design` | `Biz-Dev` | `Biz-Ops` | `Content` | `Others`

## Platform (Epics)
`App` | `Web` | `Server`

## Team
`Frontend` | `Backend` | `Devops` | `AI` | `Content` | `Product Manager` | `Product Designer` | `Marketing` | `Engineering Division` | `Management Group`

## Size Estimation
`1H` | `2H` | `4H` | `1D` | `2D` | `3D` | `4D` | `5D` | `10D`

## Part (Initiatives)
`MKT` | `Business` | `Product` | `Engineering` | `Content` | `Design`

## Quarter (Initiatives)
`26Y 1Q` | `25Y 4Q` | `25Y 3Q` | `25Y 2Q` | `25Y 1Q` | `24Y 4Q 이전`

## Meeting Types
`Meeting` | `Weekly` | `Project Review` | `결과 분석 및 회고` | `User Interview` | `External Meeting`

## Library Categories
`Guide` | `PRD` | `Research` | `TechSpec` | `Metric Review` | `필수문서` | `Etc.`

---

## Task Content Template (필수)

```markdown
### Background

---

- [작업 배경]

### Conditions of satisfaction

---

<callout icon="💡">
Ticket 이 마무리 되었다고 할 수 있는 조건들을 작성 부탁드립니다.
</callout>

- [ ] [완료 조건]

### Output

---

<callout icon="🎯">
산출물을 명시해주세요.
</callout>

- [산출물]
```

---

## Quick Create Templates

### Task (Minimal)
```json
{
  "parent": {"data_source_id": "175178ca-a2a8-80a3-80e4-c62e4124851e"},
  "pages": [{"properties": {"Name": "Task 이름", "Epic": "Epic ID"}}]
}
```

### Epic (Minimal)
```json
{
  "parent": {"data_source_id": "57f4208a-b227-4427-9e12-5bc715581d7d"},
  "pages": [{"properties": {"Name": "Epic 이름", "Initiative": "Initiative ID"}}]
}
```

### Status Update
```json
{
  "page_id": "페이지 ID",
  "command": "update_properties",
  "properties": {"Status": "In progress"}
}
```

---

## Workflow Commands

### `/dev-epic` - Epic Task 개발 자동화

Epic의 Task를 Priority 순서대로 조회하고 자동으로 개발을 진행합니다.

**사용법:**
```
/dev-epic [Epic URL 또는 ID]
```

**예시:**
```
/dev-epic https://www.notion.so/mathpresso/득템-챌린지-2e0178caa2a880149506e86af2da6fae
/dev-epic 2e0178ca-a2a8-8014-9506-e86af2da6fae
```

**워크플로우:**
1. Epic의 모든 Task 조회
2. Priority 순 정렬 (P0 > P1 > P2)
3. To-do/In progress Task만 필터링
4. 가장 높은 Priority Task 선택
5. Task 명확성 검증 (모호하면 질문)
6. UX/UI Task인 경우 필수 질문
7. 코드 작성 및 Git commit
8. Task 완료 처리 (Done + Actual Size)
9. 다음 Task로 자동 진행 (사용자 확인)

**자세한 내용:** `DEV_WORKFLOW.md` 참조
