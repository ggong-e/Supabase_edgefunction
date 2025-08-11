Deno.serve(async (req) => {
  try {
    const APP_KEY = Deno.env.get("KIS_APP_KEY");
    const APP_SECRET = Deno.env.get("KIS_APP_SECRET");
    if (!APP_KEY || !APP_SECRET) {
      return new Response(JSON.stringify({ ok:false, error:"Missing secrets" }), { status: 500 });
    }

    const { symbol = "005930", from = "20250101" } =
      (await req.json().catch(() => ({}))) as { symbol?: string; from?: string };

    // 1) 토큰 발급 (증권사 문서 기준으로 확인 필요)
    const tokenRes = await fetch("https://openapi.koreainvestment.com:9443/oauth2/tokenP", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: APP_KEY,
        appsecret: APP_SECRET,
      }),
    });
    const tokenJson = await tokenRes.json();
    const access_token = tokenJson?.access_token;
    if (!access_token) {
      return new Response(JSON.stringify({ ok:false, step:"token", tokenJson }), { status: 502 });
    }

    // 2) 일봉 조회(예시 엔드포인트/헤더 — 실제 TR-ID/파라미터는 문서 확인)
    const to = new Date().toISOString().slice(0,10).replace(/-/g, "");
    const q = new URL("https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice");
    q.search = new URLSearchParams({
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: symbol,
      FID_INPUT_DATE_1: from,
      FID_INPUT_DATE_2: to,
      FID_PERIOD_DIV_CODE: "D",
      FID_ORG_ADJ_PRC: "0",
    }).toString();

    const priceRes = await fetch(q, {
      headers: {
        authorization: \Bearer \\,
        appKey: APP_KEY,
        appSecret: APP_SECRET,
        tr_id: "FHKST03010100", // ★ 문서 확인 후 필요 시 수정
        custtype: "P",
      },
    });

    const bodyText = await priceRes.text();
    return new Response(
      JSON.stringify({ ok: priceRes.ok, status: priceRes.status, symbol, body: bodyText }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 500 });
  }
});
