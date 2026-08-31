import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canSharePdf, sharePdfFile } from "@/lib/pdf/share";

export function SharePdfButton({
  file,
  disabled,
  onNeedFile,
}: {
  file: File | null;
  disabled?: boolean;
  onNeedFile?: () => Promise<File | null>;
}) {
  async function onShare() {
    try {
      const next = file ?? (onNeedFile ? await onNeedFile() : null);
      if (!next) {
        toast.error("Build the PDF first.");
        return;
      }
      const result = await sharePdfFile(next);
      if (result === "copied") toast.success("App link copied. Attach the PDF from Downloads.");
      else if (result === "shared") toast.success("Shared with a link back to Free PDF Safe.");
    } catch {
      toast.error("Could not open share.");
    }
  }

  return (
    <Button variant="secondary" className="w-full" disabled={disabled} onClick={() => void onShare()}>
      <Share2 className="size-4" />
      {file && !canSharePdf(file) ? "Copy app link" : "Share PDF"}
    </Button>
  );
}
