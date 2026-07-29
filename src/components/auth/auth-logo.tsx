import Image from "next/image";
import Link from "next/link";

export function AuthLogo() {
  return (
    <Link href="/" className="mb-8 flex items-center gap-2">
      <Image src="/logo-mark.png" alt="" width={28} height={28} />
      <span className="text-sm font-semibold tracking-[0.3em] text-foreground">ATLION</span>
    </Link>
  );
}
