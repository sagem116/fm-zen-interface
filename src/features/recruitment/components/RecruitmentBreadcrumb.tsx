import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { RecruitmentBreadcrumbItem } from "../utils/recruitment-breadcrumbs";

export function RecruitmentBreadcrumb({ items }: { items: RecruitmentBreadcrumbItem[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, idx) => {
          const last = idx === items.length - 1;
          return (
            <BreadcrumbItem key={`${item.label}-${idx}`}>
              {item.to && !last ? (
                <BreadcrumbLink asChild>
                  <Link to={item.to as never}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
              {!last ? <BreadcrumbSeparator /> : null}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
