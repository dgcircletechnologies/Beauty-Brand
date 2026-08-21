import Link from "next/link";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText?: string;
  footerHref?: string;
  footerAction?: string;
};

export function AuthCard({
  title,
  subtitle,
  children,
  footerText,
  footerHref,
  footerAction,
}: AuthCardProps) {
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-label={title}>
        <div className="auth-heading">
          <p className="eyebrow">BlueWave Skincare</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children}
        {footerText && footerHref && footerAction ? (
          <p className="auth-footer">
            {footerText} <Link href={footerHref}>{footerAction}</Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
