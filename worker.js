export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env);
    }
    if (url.pathname === "/api/inquiries" && request.method === "GET") {
      return handleList(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleContact(request, env) {
  let data;
  try { data = await request.json(); } catch (e) { return json({ ok: false, error: "잘못된 요청" }, 400); }

  const type = String(data.type || "기타").slice(0, 30);
  const name = String(data.name || "").trim().slice(0, 100);
  const phone = String(data.phone || "").trim().slice(0, 40);
  const email = String(data.email || "").trim().slice(0, 120);
  const title = String(data.title || "").trim().slice(0, 200);
  const body = String(data.body || "").trim().slice(0, 5000);

  if (!name || !email || !title || !body) {
    return json({ ok: false, error: "필수 항목을 입력해주세요" }, 400);
  }

  const id = crypto.randomUUID();
  const entry = { id, type, name, phone, email, title, body, ts: Date.now(), read: false };
  await env.INQUIRIES.put(id, JSON.stringify(entry));

  const idxRaw = await env.INQUIRIES.get("__index__");
  const idx = idxRaw ? JSON.parse(idxRaw) : [];
  idx.unshift(id);
  await env.INQUIRIES.put("__index__", JSON.stringify(idx.slice(0, 2000)));

  return json({ ok: true });
}

async function handleList(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  if (!env.ADMIN_CODE || code !== env.ADMIN_CODE) {
    return json({ ok: false, error: "권한 없음" }, 403);
  }
  const idxRaw = await env.INQUIRIES.get("__index__");
  const idx = idxRaw ? JSON.parse(idxRaw) : [];
  const items = [];
  for (const id of idx.slice(0, 300)) {
    const raw = await env.INQUIRIES.get(id);
    if (raw) items.push(JSON.parse(raw));
  }
  return json({ ok: true, items });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
