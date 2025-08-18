// supabase.js  (saf JS dosyası, <script> etiketi YOK)
(function () {
  // 1) Supabase JS kütüphanesini CDN'den yükle
  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";

  // 2) 🔧 BURAYI KENDİ PROJENLE DOLDUR
  const PROJECT_URL = "https://qwniycuixjqncyvtmucr.supabase.co"; // Settings → API → Project URL
  const PUBLIC_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bml5Y3VpeGpxbmN5dnRtdWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjgxOTAsImV4cCI6MjA3MTEwNDE5MH0.dqxlPVCl2ZsppxLDCBlJwI7xZtwLpmDu_N1Rvpb-GGQ";

  // ---- İç helper: supabase-js yüklü mü kontrol et
  function ensureSupabaseLib() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve();
      const s = document.createElement("script");
      s.src = CDN;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Supabase JS yüklenemedi"));
      document.head.appendChild(s);
    });
  }

  // 3) Başlat
  ensureSupabaseLib()
    .then(async () => {
      // İstemciyi oluştur
      window.sb = window.supabase.createClient(PROJECT_URL, PUBLIC_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
        realtime: { params: { eventsPerSecond: 5 } },
      });

      // Küçük auth yardımcıları (console'a detaylı log yazar)
      window.sbAuth = {
        async getUser() {
          const res = await window.sb.auth.getUser();
          if (res.error) console.error("[Auth][getUser] error:", res.error.message);
          return res;
        },
        async signIn(email, password) {
          const res = await window.sb.auth.signInWithPassword({ email, password });
          if (res.error) console.error("[Auth][signIn] error:", res.error.message);
          else console.log("[Auth][signIn] OK user:", res.data.user?.id);
          return res;
        },
        async signUp(email, password) {
          const res = await window.sb.auth.signUp({ email, password });
          if (res.error) console.error("[Auth][signUp] error:", res.error.message);
          else console.log("[Auth][signUp] OK user:", res.data.user?.id);
          return res;
        },
        async signOut() {
          const res = await window.sb.auth.signOut();
          if (res.error) console.error("[Auth][signOut] error:", res.error.message);
          else console.log("[Auth][signOut] OK");
          return res;
        },
      };

      // Basit debug yardımcıları (isteğe bağlı)
      window.supabaseDebug = {
        info() {
          console.log("[Supabase] URL:", PROJECT_URL);
        },
        async session() {
          const { data, error } = await window.sb.auth.getSession();
          if (error) console.error("[Supabase] session error:", error.message);
          else console.log("[Supabase] session:", data.session ? "var" : "yok");
        },
      };

      // Hazır sinyali (script.js bunu dinliyor)
      document.dispatchEvent(new CustomEvent("supabase-ready"));
      console.log("[Supabase] Bağlandı");
    })
    .catch((e) => {
      console.error("[Supabase] Başlangıç hatası:", e);
      alert("Supabase başlatılamadı. PROJECT_URL ve ANON KEY’i kontrol et.");
    });
})();
