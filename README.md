# KIS API Edge Function 테스트

이 저장소는 Supabase Edge Function으로 증권사(KIS) API를 호출하는 **최소 예제**를 정리합니다.

## 호출 방법 (JWT 검증 OFF 가정)
`ash
curl -X POST "https://avlvrnxunawsuhekjojt.supabase.co/functions/v1/kis-test" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"005930","from":"20250101"}'

파일구조
functions/kis-test/index.ts    # Edge Function 최소 호출 코드(보관용)
curl_test.ps1                  # PowerShell에서 호출 테스트 스크립트
README.md
.gitignore

주의
KIS AppKey/Secret은 코드에 넣지 말고 Supabase Secrets에만 저장하세요.

JWT 검증이 켜져 있으면 Authorization 헤더에 유저 토큰이 필요합니다.
