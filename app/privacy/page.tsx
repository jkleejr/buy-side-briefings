export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-5xl space-y-1 px-4 pb-14 pt-[39px] sm:px-6">
      <header className="space-y-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Privacy
        </h1>
      </header>
      <p className="leading-7">
        This site uses Vercel Web Analytics, which is cookieless and does not collect personal data
        or build user profiles. We do not run any third-party advertising or tracking pixels.
      </p>
      <p className="leading-7">
        If you submit your email address via the subscribe form, we collect only the email address
        you provide. We do not currently store or sell this data; the form is a placeholder until a
        newsletter delivery service is wired up. You can request deletion of any stored data at any
        time by contacting us.
      </p>
      <p className="leading-7">
        Outbound links to source materials (Yahoo Finance, AAII, CNN, FactSet, etc.) may set their
        own cookies and are governed by their privacy policies, not ours.
      </p>
    </article>
  );
}
