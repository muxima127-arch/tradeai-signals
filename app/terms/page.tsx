export const metadata = {
  title: "Termos",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-sm leading-relaxed text-foreground">
      <h1>Termos de utilização</h1>
      <p>
        O serviço TradeAI Signals fornece ferramentas e sinais gerados por modelos; não constitui
        aconselhamento de investimento. CFDs envolvem risco elevado de perdas rápidas.
      </p>
      <p>
        A subscrição é gerida via Stripe. O trial e renovações seguem as condições indicadas no checkout e na
        fatura.
      </p>
    </div>
  );
}
