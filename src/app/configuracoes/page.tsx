import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { salvarConfiguracoes } from "./actions";
import { TrocarSenhaForm } from "./trocar-senha-form";

const ATIVACAO_MODOS = [
  { value: "questoes", label: "Questões" },
  { value: "anki", label: "Anki" },
  { value: "questoes_anki", label: "Questões + Anki" },
];

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("concurso, tem_edital, horas_liquidas_dia, trabalha, curso_preparatorio, ativacao_modo")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <Link href="/painel" className="text-sm text-foreground/50 hover:text-foreground">
        ← Voltar
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-foreground">Configurações</h1>
      <p className="mt-1 text-sm text-foreground/60">{user.email}</p>

      <form action={salvarConfiguracoes} className="mt-8 space-y-5">
        <div>
          <label className="block text-xs text-foreground/50">Concurso</label>
          <input
            name="concurso"
            type="text"
            defaultValue={profile?.concurso ?? ""}
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="block text-xs text-foreground/50">Horas líquidas por dia</label>
          <input
            name="horasLiquidasDia"
            type="number"
            min={0}
            step={0.5}
            defaultValue={profile?.horas_liquidas_dia ?? ""}
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="block text-xs text-foreground/50">Curso preparatório</label>
          <input
            name="cursoPreparatorio"
            type="text"
            defaultValue={profile?.curso_preparatorio ?? ""}
            placeholder="Opcional"
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground/70">
          <input
            name="temEdital"
            type="checkbox"
            defaultChecked={profile?.tem_edital ?? false}
            className="h-4 w-4 rounded border-foreground/30"
          />
          Já existe edital publicado
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground/70">
          <input
            name="trabalha"
            type="checkbox"
            defaultChecked={profile?.trabalha ?? false}
            className="h-4 w-4 rounded border-foreground/30"
          />
          Trabalho atualmente
        </label>

        <div>
          <label className="block text-xs text-foreground/50">Ativação Cognitiva</label>
          <select
            name="ativacaoModo"
            defaultValue={profile?.ativacao_modo ?? "questoes"}
            className="mt-1 w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          >
            {ATIVACAO_MODOS.map((modo) => (
              <option key={modo.value} value={modo.value} className="bg-background text-foreground">
                {modo.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
        >
          Salvar
        </button>
      </form>

      <div className="mt-12 border-t border-foreground/10 pt-8">
        <h2 className="text-sm font-medium text-foreground/70">Trocar senha</h2>
        <div className="mt-4">
          <TrocarSenhaForm />
        </div>
      </div>
    </main>
  );
}
