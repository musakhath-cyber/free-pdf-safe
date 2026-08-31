export async function printPdfFile(file: File) {
  const url = URL.createObjectURL(file);
  const frame = document.createElement("iframe");
  frame.setAttribute("title", "Print PDF");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";
  frame.src = url;

  const cleanup = () => {
    frame.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Print preview timed out."));
    }, 12_000);

    frame.onload = () => {
      window.clearTimeout(timer);
      const win = frame.contentWindow;
      if (!win) {
        cleanup();
        reject(new Error("Could not open print preview."));
        return;
      }
      win.addEventListener("afterprint", cleanup, { once: true });
      try {
        win.focus();
        win.print();
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    frame.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new Error("Could not load the PDF to print."));
    };
    document.body.appendChild(frame);
  });
}
