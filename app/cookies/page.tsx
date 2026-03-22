export const metadata = {
  title: "Cookies",
};

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-sm leading-relaxed text-foreground">
      <h1>Política de cookies</h1>
      <p>
        Utilizamos cookies e tecnologias similares para sessão (Supabase), preferências de tema, analytics
        (Google Analytics 4 / PostHog quando configurados) e métricas de produto.
      </p>
      <p>Pode gerir cookies no seu navegador e recusar analytics não essenciais através das definições do site.</p>
    </div>
  );
}
