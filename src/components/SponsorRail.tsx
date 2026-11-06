/* eslint-disable @next/next/no-img-element */
import sponsors from "@/data/sponsors.json";
import { Icon } from "./icons";
type SponsorName = keyof typeof sponsors;

export default function SponsorRail({ side, marketplace = false }: { side: "left" | "right"; marketplace?: boolean }) {
  const names: (SponsorName | null)[] = marketplace
    ? side === "left"
      ? ["Higgsfield", "Higgsfield", "CREEM", "Fuse AI", "BlogSEO"]
      : ["Virlo", "Hugo AI", "AiSDR INC.", "Chargeback.io", null]
    : side === "left"
    ? ["Virlo", "Fuse AI", "Higgsfield", "Higgsfield", "GojiberryAI"]
    : ["Higgsfield", "Chargeback.io", "Blotato", "BlogSEO", null];
  return <aside className={`sponsor-rail ${side}`} aria-label={`${side} sponsors`}>
    {names.map((name, i) => {
      if (!name) return <div className="sponsor-card advertise" key={i}><Icon name="megaphone" size={18}/><span>Advertise</span><span className="spots">5/20 spots left</span></div>;
      const sponsor = sponsors[name];
      return <a className="sponsor-card" style={{ backgroundColor: sponsor.bgColor }} href={sponsor.link} target="_blank" rel="noopener noreferrer sponsored" key={`${name}-${i}`}>
        <img src={name === "AiSDR INC." ? "/assets/reference-6.webp" : sponsor.logo} alt="" width="24" height="24"/>
        <h3>{sponsor.name}</h3><p>{sponsor.headline}</p>
      </a>;
    })}
  </aside>;
}

