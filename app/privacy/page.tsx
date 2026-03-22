export const metadata = {
  title: "Privacidade",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-sm leading-relaxed text-foreground">
      <h1>Política de privacidade (RGPD)</h1>
      <p>
        O responsável pelo tratamento é a TradeAI Signals. Os dados pessoais (email, identificador de conta,
        dados de faturação processados pela Stripe) são tratados para execução do serviço, faturação e
        cumprimento legal.
      </p>
      <p>
        Tem direito de acesso, retificação, apagamento, limitação, portabilidade e oposição nos termos do
        RGPD. Contacto: <a href="mailto:dpo@tradeai-signals.app">dpo@tradeai-signals.app</a>.
      </p>
      <p>
        Utilizamos fornecedores (Supabase, Vercel, Stripe, Resend, PostHog) com salvaguardas adequadas e,
        quando aplicável, cláusulas tipo da UE.
      </p>
    </div>
  );
}
