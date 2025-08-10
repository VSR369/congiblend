export function htmlToPlainText(html: string): string {
  if (!html) return "";
  const container = document.createElement("div");
  container.innerHTML = html;
  return (container.textContent || container.innerText || "").replace(/\s+/g, " ").trim();
}
