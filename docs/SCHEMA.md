# 데이터베이스 스키마
## 테이블: 0_daily_price
| 컬럼명       | 타입     | 설명 |
|--------------|---------|------|
| symbol       | text    | 종목코드 |
| date         | date    | 날짜 |
| open         | numeric | 시가 |
| high         | numeric | 고가 |
| low          | numeric | 저가 |
| close        | numeric | 종가 |
| volume       | numeric | 거래량 |
| created_at   | timestamptz | 생성 시각 |
- `symbol` + `date` 조합에 대해 고유 인덱스 설정

