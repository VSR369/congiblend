import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface RichTextEditorProps {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  onCtrlEnter?: () => void;
}

export const htmlToPlainText = (html: string) => {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  valueHtml,
  onChangeHtml,
  placeholder,
  className,
  minHeight = 180,
  onCtrlEnter,
}) => {
  const modules = React.useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote", "code-block"],
        ["link"],
        ["clean"],
      ],
    }),
    []
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "list",
    "bullet",
    "blockquote",
    "code-block",
    "link",
  ];
  const wordCount = React.useMemo(() => {
    const text = htmlToPlainText(valueHtml);
    return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [valueHtml]);
  const charCount = React.useMemo(() => htmlToPlainText(valueHtml).length, [valueHtml]);

  return (
    <div className={className}>
      <ReactQuill
        theme="snow"
        value={valueHtml}
        onChange={onChangeHtml}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || (e as any).metaKey) && e.key === "Enter") {
            onCtrlEnter?.();
          }
        }}
      />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{wordCount} words • {charCount} chars</span>
        <span>Press Ctrl/⌘ + Enter to submit</span>
      </div>
    </div>
  );
};

export default RichTextEditor;
