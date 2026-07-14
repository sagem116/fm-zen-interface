import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecruitmentLayout } from "./RecruitmentLayout";
import { RecruitmentPlaceholder } from "./RecruitmentPlaceholder";
import { buildRecruitmentBreadcrumbs } from "../utils/recruitment-breadcrumbs";

interface RecruitmentPlaceholderPageProps {
  title: string;
  description: string;
}

export function RecruitmentPlaceholderPage({
  title,
  description,
}: RecruitmentPlaceholderPageProps) {
  return (
    <RecruitmentLayout
      title={title}
      subtitle="Recruitment Center"
      breadcrumbs={buildRecruitmentBreadcrumbs(title)}
    >
      <RecruitmentPlaceholder
        description={description}
        action={
          <Button asChild>
            <Link to="/recruitment-center" search={{ tab: undefined }}>
              Abrir Dashboard <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />
    </RecruitmentLayout>
  );
}
