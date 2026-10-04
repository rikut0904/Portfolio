import AdminHeader from "../../app/admin/header";
import Link from "next/link";

interface AdminPageShellProps {
  children: React.ReactNode;
}

interface AdminPageContentProps {
  children: React.ReactNode;
  className?: string;
}

export const ADMIN_PAGE_META = {
  products: {
    title: "作品管理",
    backLabel: "ダッシュボード",
    backHref: "/admin",
  },
  sections: {
    title: "セクション管理",
    backLabel: "ダッシュボード",
    backHref: "/admin",
  },
  activities: {
    title: "課外活動カテゴリ管理",
    backLabel: "ダッシュボード",
    backHref: "/admin",
  },
  images: {
    title: "画像管理",
    backLabel: "ダッシュボード",
    backHref: "/admin",
  },
  technologies: {
    title: "技術管理",
    backLabel: "ダッシュボード",
    backHref: "/admin",
  },
  logs: {
    title: "ログ一覧",
    backLabel: "ダッシュボード",
    backHref: "/admin",
  },
  contact: {
    title: "お問い合わせ一覧",
    backLabel: "ダッシュボード",
    backHref: "/admin",
  },
  contactDetail: {
    title: "お問い合わせ詳細",
    backLabel: "お問い合わせ一覧",
    backHref: "/admin/contact",
  },
  calendarSettings: {
    title: "カレンダー設定",
    backLabel: "予定管理",
    backHref: "/admin/calendar",
  },
} as const;

type AdminPageKey = keyof typeof ADMIN_PAGE_META;

interface AdminPageHeaderProps {
  page: AdminPageKey;
  actions?: React.ReactNode;
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function AdminPageHeader({
  page,
  actions,
  title,
  description,
  backHref,
  backLabel,
}: AdminPageHeaderProps) {
  const meta = ADMIN_PAGE_META[page];

  return (
    <header className="admin-page-header">
      <div className="admin-page-header__copy">
        <Link
          href={backHref ?? meta.backHref}
          className="admin-page-header__back"
        >
          <span aria-hidden="true">←</span> {backLabel ?? meta.backLabel}
        </Link>
        <h1>{title ?? meta.title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="admin-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function AdminPageContent({
  children,
  className = "",
}: AdminPageContentProps) {
  return (
    <main className={`admin-page-content ${className}`.trim()}>{children}</main>
  );
}

/**
 * Shared visual shell for every admin route.
 * Page-specific components remain responsible for data and content only.
 */
export default function AdminPageShell({ children }: AdminPageShellProps) {
  return (
    <div className="admin admin-page-shell min-h-screen bg-gray-50 pt-20">
      <AdminHeader />
      {children}
    </div>
  );
}
