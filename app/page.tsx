import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { LandingDemo } from "@/components/marketing/landing-demo";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Testimonials } from "@/components/marketing/testimonials";
import { FaqSection } from "@/components/marketing/faq-section";
import { Footer } from "@/components/marketing/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <LandingDemo />
        <PricingSection />
        <Testimonials />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
