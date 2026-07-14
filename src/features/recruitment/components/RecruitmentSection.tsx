import type { ReactNode } from "react";

interface RecruitmentSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function RecruitmentSection({
  title,
  description,
  action,
  children,
  className,
}: RecruitmentSectionProps) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
