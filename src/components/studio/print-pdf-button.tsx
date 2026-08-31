import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { printPdfFile } from "@/lib/pdf/print";

export function PrintPdfButton({
  file,
  disabled,
  onNeedFile,
}: {
  file: File | null;
  disabled?: boolean;
  onNeedFile?: () => Promise<File | null>;
}) {
  async function onPrint() {
    try {
      const next = file ?? (onNeedFile ? await onNeedFile() : null);
      if (!next) {
        toast.error("Build the PDF first.");
        return;
      }
      await printPdfFile(next);
    } catch {
      toast.error("Could not open print. Download the PDF and print it from Files.");
    }
  }

  return (
    <Button variant="secondary" className="w-full" disabled={disabled} onClick={() => void onPrint()}>
      <Printer className="size-4" />
      Print PDF
    </Button>
  );
}
