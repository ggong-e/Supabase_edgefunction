# 테스트 방법
1. 로컬에서 Edge Function 실행 테스트
```bash
supabase functions serve kis-0_dailyprice-updater
```
2. API 호출 예시
```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/kis-0_dailyprice-updater"   -H "Content-Type: application/json"   --data '{"from":"20250703","to":"20250814"}'
```
3. from 값을 지정하지 않으면 자동으로 최근 10영업일 전부터 오늘까지 조회됩니다.

