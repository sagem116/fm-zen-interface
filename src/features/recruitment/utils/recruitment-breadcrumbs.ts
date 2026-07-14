export interface RecruitmentBreadcrumbItem {
  label: string;
  to?: string;
}

export function buildRecruitmentBreadcrumbs(
  pageLabel: string,
  parent?: RecruitmentBreadcrumbItem,
): RecruitmentBreadcrumbItem[] {
  const items: RecruitmentBreadcrumbItem[] = [
    { label: "Recruitment Center", to: "/recruitment-center" },
  ];
  if (parent) items.push(parent);
  items.push({ label: pageLabel });
  return items;
}
