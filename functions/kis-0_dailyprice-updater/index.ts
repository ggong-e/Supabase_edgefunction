import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const VERSION = "2025-08-14T3"; // ← 배포 확인용 표식 (업데이트)
const TABLE_NAME = "0_daily_price";
const DEFAULT_SYMBOLS = [
  "005930",
  "000660",
  "373220",
  "207940",
  "005935",
  "012450",
  "005380",
  "105560",
  "034020",
  "329180",
  "000270",
  "068270",
  "035420",
  "042660",
  "055550",
  "035720",
  "028260",
  "012330",
  "009540",
  "015760"
];
const sleep = (ms)=>new Promise((r)=>setTimeout(r, ms));
const pad6 = (s)=>String(s).padStart(6, "0");
const ymd = (d)=>{
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
};
const iso = (yyyymmdd)=>`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
const isYmd = (s)=>!!s && /^\d{8}$/.test(s);
/** 주말(토/일) 제외하고 '오늘 기준 영업일 -n일'을 계산 */ function getBusinessDayMinus(base, n) {
  let d = new Date(base);
  let cnt = 0;
  while(cnt < n){
    d.setDate(d.getDate() - 1);
    const dow = d.getDay(); // 0:일, 6:토
    if (dow !== 0 && dow !== 6) cnt++;
  }
  return d;
}
async function getKisAccessToken(appKey, appSecret) {
  const res = await fetch("https://openapi.koreainvestment.com:9443/oauth2/tokenP", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: appKey,
      appsecret: appSecret
    })
  });
  if (!res.ok) throw new Error(`token http ${res.status}`);
  const j = await res.json();
  if (!j?.access_token) throw new Error("no access_token");
  return j.access_token;
}
async function fetchStockChunk(symbol6, fromYmd, toYmd, accessToken, appKey, appSecret) {
  const url = new URL("https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice");
  url.search = new URLSearchParams({
    FID_COND_MRKT_DIV_CODE: "J",
    FID_INPUT_ISCD: symbol6,
    FID_INPUT_DATE_1: fromYmd,
    FID_INPUT_DATE_2: toYmd,
    FID_PERIOD_DIV_CODE: "D",
    FID_ORG_ADJ_PRC: "0"
  }).toString();
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      appKey: appKey,
      appSecret: appSecret,
      tr_id: "FHKST03010100",
      custtype: "P"
    }
  });
  const text = await res.text();
  let j;
  try {
    j = JSON.parse(text);
  } catch  {
    throw new Error(`invalid json: ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`price http ${res.status} ${text.slice(0, 200)}`);
  if (j?.rt_cd && j.rt_cd !== "0") throw new Error(`price rt_cd!=0 ${j?.msg1 ?? ""}`);
  const rows = j?.output2 ?? [];
  return rows.map((r)=>({
      symbol: symbol6,
      date: iso(String(r.stck_bsop_date)),
      open: Number(r.stck_oprc ?? 0),
      high: Number(r.stck_hgpr ?? 0),
      low: Number(r.stck_lwpr ?? 0),
      close: Number(r.stck_clpr ?? 0),
      volume: Number(r.acml_vol ?? 0),
      trade_amount: Number(r.acml_tr_pbmn ?? 0)
    }));
}
// JSON 파싱 실패 대비: 텍스트 재시도
async function safeParseBody(req) {
  try {
    const ct = req.headers.get("content-type") || "";
    const text = await req.text();
    let parsed = {};
    if (ct.includes("application/json")) {
      try {
        parsed = JSON.parse(text);
      } catch  {
        parsed = {};
      }
    } else {
      try {
        parsed = JSON.parse(text);
      } catch  {
        parsed = {};
      }
    }
    return {
      parsed,
      raw: text
    };
  } catch  {
    return {
      parsed: {},
      raw: null
    };
  }
}
Deno.serve(async (req)=>{
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const KIS_APP_KEY = Deno.env.get("KIS_APP_KEY");
    const KIS_APP_SECRET = Deno.env.get("KIS_APP_SECRET");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Missing SUPABASE_URL or SERVICE_ROLE_KEY",
        version: VERSION
      }), {
        status: 500
      });
    }
    if (!KIS_APP_KEY || !KIS_APP_SECRET) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Missing KIS_APP_KEY/SECRET",
        version: VERSION
      }), {
        status: 500
      });
    }
    // 바디 파싱(디버그용 raw 포함)
    const { parsed: body, raw: raw_body } = await safeParseBody(req);
    const symbols = (Array.isArray(body?.symbols) && body.symbols.length ? body.symbols : DEFAULT_SYMBOLS).map(pad6);
    const rawFrom = typeof body?.from === "string" ? body.from.trim() : undefined;
    const rawTo = typeof body?.to === "string" ? body.to.trim() : undefined;
    const today = new Date();
    const todayYmd = ymd(today);
    // ── 여기부터 변경 핵심 ─────────────────────────────────────────────
    // from: 미지정 or 형식 아님 → 오늘 기준 '영업일 -10일'(주말 제외)
    let from = isYmd(rawFrom) ? rawFrom : ymd(getBusinessDayMinus(today, 10));
    // to: 미지정 or 형식 아님 → 오늘
    let to = isYmd(rawTo) ? rawTo : todayYmd;
    // ───────────────────────────────────────────────────────────────────
    // 날짜 객체 및 from>to 스왑 처리
    let start = new Date(+from.slice(0, 4), +from.slice(4, 6) - 1, +from.slice(6, 8));
    let end = new Date(+to.slice(0, 4), +to.slice(4, 6) - 1, +to.slice(6, 8));
    if (start > end) {
      const t = start;
      start = end;
      end = t;
      from = ymd(start);
      to = ymd(end);
    }
    const maxDaysPerChunk = Number(body?.maxDaysPerChunk ?? 50);
    const maxRowsPerUpsert = Number(body?.maxRowsPerUpsert ?? 800);
    const sleepMs = Number(body?.sleepMsBetweenCalls ?? 100);
    const token = await getKisAccessToken(KIS_APP_KEY, KIS_APP_SECRET);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let totalFetched = 0;
    let totalUpserts = 0;
    const errors = [];
    for (const sym of symbols){
      let cursor = new Date(start);
      while(cursor <= end){
        const chunkEnd = new Date(cursor);
        chunkEnd.setDate(chunkEnd.getDate() + (maxDaysPerChunk - 1));
        if (chunkEnd > end) chunkEnd.setTime(end.getTime());
        const fromChunk = ymd(cursor);
        const toChunk = ymd(chunkEnd);
        let rows = [];
        try {
          rows = await fetchStockChunk(sym, fromChunk, toChunk, token, KIS_APP_KEY, KIS_APP_SECRET);
        } catch (e) {
          errors.push({
            symbol: sym,
            step: "fetch",
            fromChunk,
            toChunk,
            error: String(e)
          });
        }
        totalFetched += rows.length;
        for(let i = 0; i < rows.length; i += maxRowsPerUpsert){
          const batch = rows.slice(i, i + maxRowsPerUpsert);
          if (!batch.length) continue;
          const { error } = await supabase.from(TABLE_NAME).upsert(batch, {
            onConflict: "symbol,date"
          });
          if (error) errors.push({
            symbol: sym,
            step: "upsert",
            range: [
              i,
              i + batch.length
            ],
            error: String(error)
          });
          else totalUpserts += batch.length;
        }
        cursor.setDate(cursor.getDate() + maxDaysPerChunk);
        await sleep(sleepMs);
      }
    }
    return new Response(JSON.stringify({
      ok: errors.length === 0,
      version: VERSION,
      raw_body,
      rawFrom,
      rawTo,
      from,
      to,
      symbols,
      maxDaysPerChunk,
      fetched: totalFetched,
      upserts: totalUpserts,
      errors
    }), {
      headers: {
        "content-type": "application/json"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      version: VERSION,
      error: String(e)
    }), {
      status: 500
    });
  }
});
