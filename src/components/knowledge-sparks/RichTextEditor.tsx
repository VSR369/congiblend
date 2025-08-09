import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface RichTextEditorProps {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
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
      />
    </div>
  );
};

export default RichTextEditor;
