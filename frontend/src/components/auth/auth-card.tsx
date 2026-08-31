import Link from "next/link";
import Image from "next/image";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText?: string;
  footerHref?: string;
  footerAction?: string;
  imageSrc?: string;
  imageAlt?: string;
  imageLabel?: string;
  imageTitle?: string;
  imageText?: string;
};

export function AuthCard({
  title,
  subtitle,
  children,
  footerText,
  footerHref,
  footerAction,
  imageSrc = "/images/skincare/feature-2.png",
  imageAlt = "BlueWave skincare products",
  imageLabel = "BlueWave Rituals",
  imageTitle = "Skin care made calm, clear, and personal.",
  imageText = "Build your routine, save favorites, and follow every order from one polished account.",
}: AuthCardProps) {
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-label={title}>
        <div className="auth-visual" aria-hidden="true">
          <Image
            alt={imageAlt}
            src={imageSrc}
            fill
            sizes="(min-width: 1024px) 48vw, 100vw"
            priority
          />
          <div className="auth-visual-copy">
            <p>{imageLabel}</p>
            <h2>{imageTitle}</h2>
            <span>{imageText}</span>
          </div>
        </div>
        <div className="auth-content">
          <div className="auth-heading">
            <Link className="auth-brand" href="/">
              BlueWave
            </Link>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {children}
          {footerText && footerHref && footerAction ? (
            <p className="auth-footer">
              {footerText} <Link href={footerHref}>{footerAction}</Link>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
