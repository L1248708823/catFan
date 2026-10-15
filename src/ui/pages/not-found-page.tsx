import { Button } from "@/ui/components/ui/button";
import { PageHeader } from "@/ui/components/page-header";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="页面不存在" />
      <div>
        <Button variant="outline" onClick={() => navigate("/calculate")}>
          回到计算页
        </Button>
      </div>
    </div>
  );
}
