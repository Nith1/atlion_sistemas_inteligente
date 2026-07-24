import { LandingHeader } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Dor } from "@/components/landing/dor";
import { ProblemaInvisivel } from "@/components/landing/problema-invisivel";
import { MotorAprendizagem } from "@/components/landing/motor-aprendizagem";
import { ComoAtlionPensa } from "@/components/landing/como-atlion-pensa";
import { AtivacaoCognitiva } from "@/components/landing/ativacao-cognitiva";
import { SecaoSimulador } from "@/components/landing/secao-simulador";
import { ComoFunciona } from "@/components/landing/como-funciona";
import { Experiencia } from "@/components/landing/experiencia";
import { Metodologia } from "@/components/landing/metodologia";
import { Frases } from "@/components/landing/frases";
import { Planos } from "@/components/landing/planos";
import { Faq } from "@/components/landing/faq";
import { CtaFinal } from "@/components/landing/cta-final";
import { LandingFooter } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <LandingHeader />
      <main className="flex min-h-screen flex-1 flex-col bg-[#08111D]">
        <Hero />
        <Dor />
        <ProblemaInvisivel />
        <MotorAprendizagem />
        <ComoAtlionPensa />
        <AtivacaoCognitiva />
        <SecaoSimulador />
        <ComoFunciona />
        <Experiencia />
        <Metodologia />
        <Frases />
        <Planos />
        <Faq />
        <CtaFinal />
      </main>
      <LandingFooter />
    </>
  );
}
