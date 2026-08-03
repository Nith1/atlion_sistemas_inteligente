import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "ATLION — Sistema de planejamento para concursos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// mesma paleta da landing (src/components/landing/*) — é o que a pessoa vê
// no link compartilhado, então precisa bater com o que ela vê ao clicar
const NAVY_BG = "#08111D";
const GOLD = "#C8A15A";
const CREAM = "#F5F3EF";
const MUTED = "#AAB4C3";

export default function Image() {
  const logoBase64 = readFileSync(join(process.cwd(), "public/logo-mark.png")).toString("base64");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: NAVY_BG,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${logoBase64}`} width={120} height={120} alt="" />
        <div
          style={{
            marginTop: 32,
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: 12,
            color: CREAM,
          }}
        >
          ATLION
        </div>
        <div
          style={{
            marginTop: 20,
            display: "flex",
            fontSize: 30,
            color: MUTED,
          }}
        >
          Você nunca decide. A ATLION decide.
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD, display: "flex" }} />
          <div style={{ fontSize: 22, color: GOLD, letterSpacing: 2, display: "flex" }}>
            SISTEMA DE PLANEJAMENTO PARA CONCURSOS
          </div>
          <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD, display: "flex" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
