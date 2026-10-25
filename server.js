const http = require("http");

const SYS = "Você é a Futuristy, uma IA amigável, esperta e divertida, que conversa em português do Brasil. Ajude com tarefas de casa (explicando passo a passo), responda perguntas, escreva textos e crie jogos. Quando pedirem um jogo ou página, entregue UM arquivo HTML completo e funcional (CSS e JS dentro dele) em um único bloco ```html, com controles de toque para celular. Responda no idioma da pessoa e seja claro e curto.";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function send(res, status, obj) {
  res.writeHead(status, { ...cors, "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  if (req.method !== "POST") { res.writeHead(200, cors); return res.end("Futuristy online"); }

  let raw = "";
  req.on("data", c => { raw += c; if (raw.length > 200000) req.destroy(); });
  req.on("end", async () => {
    try {
      const body = JSON.parse(raw);
      if (!Array.isArray(body.messages)) return send(res, 400, { error: "Mensagem inválida" });
      const msgs = body.messages.slice(-20).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content).slice(0, 8000)
      }));
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.OPENAI_API_KEY },
        body: JSON.stringify({ model: process.env.MODEL || "gpt-4o-mini", messages: [{ role: "system", content: SYS }, ...msgs] })
      });
      const data = await r.json();
      if (!r.ok) return send(res, 502, { error: (data.error && data.error.message) || "Erro na IA" });
      send(res, 200, { text: data.choices[0].message.content });
    } catch (e) {
      send(res, 500, { error: "Erro no servidor" });
    }
  });
}).listen(process.env.PORT || 3000);
