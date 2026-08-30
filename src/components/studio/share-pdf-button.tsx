import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canSharePdf, sharePdfFile } from "@/lib/pdf/share";

export function SharePdfButton({ file }: { file: File | null }) {
  if (!file) return null;

  async function onShare() {
    if (!file) return;
    try {
      const result = await sharePdfFile(file);
      if (result === "copied") toast.success("App link copied. Attach the PDF from Downloads.");
      else if (result === "shared") toast.success("Shared with a link back to Free PDF Safe.");
    } catch {
      toast.error("Could not open share.");
    }
  }

  return (
    <Button variant="secondary" className="flex-1" onClick={() => void onShare()}>
      <Share2 className="size-4" />
      {canSharePdf(file) ? "Share PDF" : "Copy app link"}
    </Button>
  );
}
