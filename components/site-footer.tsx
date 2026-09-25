import { HeaderNavLink } from "./header-nav";

// Same link component as the header, so About reads identically top and
// bottom — the footer used to set these at 10.5px, a size smaller than the
// header's 12px About, and the same word looked like two different faces.
const FOOTER_LINKS = [
  { href: "/about", code: "ABT", label: "About" },
  { href: "/privacy", code: "PRV", label: "Privacy" },
];

export default function SiteFooter() {
  return (
    <footer className="bg-[var(--background)]">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-6">
        <span className="ml-auto flex gap-5">
          {FOOTER_LINKS.map((item) => (
            <HeaderNavLink key={item.href} item={item} />
          ))}
        </span>
      </div>
    </footer>
  );
}
