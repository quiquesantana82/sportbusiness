const SUPABASE_URL = 'https://epvgqigrcyooavgskmzc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-m_OmQzyG290M3pOaPCd8Q_e58eq4cT';
const EMPRESA = 'sportbusiness';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export default async (req) => {
  const url = new URL(req.url);

  // El ID viene en el PATH: /jugador/<ID>  (no en ?id=)
  // 1) intento sacarlo del path, 2) fallback a ?id=, 3) fallback al último segmento
  let raw = '';
  const m = url.pathname.match(/\/jugador\/([^/?#]+)/i);
  if (m) {
    raw = m[1];
  } else if (url.searchParams.get('id')) {
    raw = url.searchParams.get('id');
  } else {
    const parts = url.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    if (last && last.toLowerCase() !== 'jugador') raw = last;
  }
  const id = decodeURIComponent(raw).replace(/[^\w-]/g, '');

  let j = null;

  if (id) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/players?id=eq.${id}&empresa=eq.${EMPRESA}&select=nombre,foto,bio,posicion`,
        { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
      );
      const data = await r.json();
      j = Array.isArray(data) ? data[0] : null;
    } catch (e) { /* si falla, servimos la previa genérica */ }
  }

  const nombre = j?.nombre || 'Sport Business';
  const titulo = j ? `${j.nombre} — Sport Business` : 'Sport Business';
  let desc = j?.bio || (j?.posicion ? j.posicion : 'Representación de futbolistas y entrenadores: datos, estadísticas, trayectoria y videos.');
  if (desc.length > 155) desc = desc.slice(0, 152).trimEnd() + '…';

  // WhatsApp solo puede mostrar fotos que sean un link real (no archivos subidos en base64)
  const foto = j?.foto && /^https?:\/\//i.test(j.foto) ? j.foto : null;

  const origen = url.origin;
  const urlCanonica = `${origen}/jugador/${id}`;
  const destino = `/#jugador-${id}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${esc(titulo)}</title>
<meta property="og:type" content="profile">
<meta property="og:site_name" content="Sport Business">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(urlCanonica)}">
${foto ? `<meta property="og:image" content="${esc(foto)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(foto)}">` : ''}
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta http-equiv="refresh" content="0;url=${destino}">
</head>
<body>
<p>Abriendo el perfil de ${esc(nombre)}…</p>
<script>location.replace('${destino}');</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' }
  });
};
