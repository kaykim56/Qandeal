# CLAUDE.md - AI 작업 가이드라인

## 프로젝트 개요
- **서비스명**: QANDA 득템 챌린지
- **상태**: 🔴 **실운영 중 (PRODUCTION)**
- **DB**: Supabase (PostgreSQL)

---

## ⚠️ 실운영 데이터 보호 정책 (에렌 예거 수호 프로토콜)

이 서비스는 **실제 운영 중인 프로덕션 서비스**입니다.
Supabase DB에는 실제 사용자 데이터가 저장되어 있습니다.

### 🚫 금지 행위 (반드시 사용자 동의 필요)

다음 작업은 **절대로 자동 실행하지 마세요**. 반드시 사용자에게 먼저 확인을 받고 진행하세요:

1. **DELETE 쿼리 실행**
   - `DELETE FROM` 쿼리
   - `TRUNCATE TABLE` 쿼리
   - 테이블 삭제 (`DROP TABLE`)

2. **UPDATE 쿼리 실행**
   - 기존 데이터 수정
   - 상태값 일괄 변경
   - 사용자 정보 수정

3. **데이터 마이그레이션**
   - 스키마 변경
   - 컬럼 삭제/수정
   - 제약조건 변경

4. **관리자 계정 조작**
   - admin_users 테이블 수정
   - Supabase Auth 사용자 삭제
   - 비밀번호 강제 변경

### ✅ 허용 행위 (사용자 동의 없이 가능)

- `SELECT` 쿼리 (데이터 조회)
- `INSERT` 쿼리 (새 데이터 추가 - 단, 테스트 데이터가 아닌 경우)
- 코드 수정 및 배포
- 로그 확인

### 📋 동의 요청 템플릿

데이터 조작이 필요한 경우, 다음 형식으로 사용자에게 확인을 요청하세요:

```
⚠️ 실운영 데이터 조작 요청

작업 내용: [구체적인 작업 설명]
영향 범위: [영향받는 테이블/레코드 수]
되돌릴 수 있는가: [예/아니오]
백업 필요 여부: [예/아니오]

이 작업을 진행하시겠습니까? (예/아니오)
```

---

## 프로젝트 구조

```
/app
  /admin          # 어드민 페이지 (Supabase Auth)
  /challenge      # 챌린지 상세 페이지
  /api            # API 라우트
/components       # React 컴포넌트
/lib
  /db             # Supabase DB 함수
  supabase.ts     # Supabase 클라이언트
/supabase
  /migrations     # DB 마이그레이션 파일
```

## 주요 테이블

- `challenges` - 챌린지 정보
- `mission_steps` - 미션 스텝
- `participations` - 참여 기록
- `participation_images` - 인증 이미지
- `admin_users` - 관리자 목록

## 환경 변수

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 익명 키
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 서비스 롤 키 (서버 전용)

### ⚠️ 환경 변수 주의사항

**.env 파일에서 값에 리터럴 `\n` 문자가 포함된 경우가 있음!**

```
# 잘못된 예시 (.env.production에서 실제 발생)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co\n"

# 스크립트에서 환경변수 파싱 시 반드시 \n 제거 필요
value = value.replace(/\\n/g, "");
```

**특히 Vercel에서 자동 생성된 환경변수 파일에서 자주 발생함.**

## 배포

### 🚨 배포 규칙 (필수)

**배포할 때는 반드시 커밋/푸시를 먼저 해야 합니다!**

1. 코드 변경
2. `git add` + `git commit`
3. `git push origin main`
4. 그 다음 `vercel --prod`

**절대로 `vercel --prod`만 단독 실행하지 마세요!** Git에 기록되지 않은 코드가 배포되면 나중에 복구가 불가능합니다.

### 배포 명령어

```bash
# 올바른 배포 순서
git add .
git commit -m "feat: 변경 내용"
git push origin main
vercel --prod
```
