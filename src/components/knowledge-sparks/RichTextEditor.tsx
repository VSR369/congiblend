import React from "react";
import Quill from "quill";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Image as ImageIcon, Video as VideoIcon, AudioLines } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

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

// Register custom media blots (video/audio) once to allow HTML5 embeds to persist
// Avoid duplicate registration during HMR
const g: any = globalThis as any;
if (!g.__SPARKS_MEDIA_BLOTS_REGISTERED__) {
  const BlockEmbed: any = Quill.import("blots/block/embed");

  class Html5VideoBlot extends BlockEmbed {
    static blotName = "html5video";
    static tagName = "VIDEO";
    static className = "spark-video";
    static create(value: string) {
      const node = super.create() as HTMLVideoElement;
      node.setAttribute("controls", "");
      node.setAttribute("playsinline", "");
      node.setAttribute("src", value);
      node.style.maxWidth = "100%";
      node.style.height = "auto";
      node.style.display = "block";
      node.style.margin = "0.5rem 0";
      return node;
    }
    static value(node: HTMLElement) {
      return node.getAttribute("src");
    }
  }

  class AudioBlot extends BlockEmbed {
    static blotName = "audio";
    static tagName = "AUDIO";
    static className = "spark-audio";
    static create(value: string) {
      const node = super.create() as HTMLAudioElement;
      node.setAttribute("controls", "");
      node.setAttribute("src", value);
      node.style.display = "block";
      node.style.margin = "0.5rem 0";
      return node;
    }
    static value(node: HTMLElement) {
      return node.getAttribute("src");
    }
  }

  Quill.register({
    "formats/html5video": Html5VideoBlot,
    "formats/audio": AudioBlot,
  });

  g.__SPARKS_MEDIA_BLOTS_REGISTERED__ = true;
}

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
    // Media formats
    "image",
    "html5video",
    "audio",
  ];
  const wordCount = React.useMemo(() => {
    const text = htmlToPlainText(valueHtml);
    return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [valueHtml]);
  const charCount = React.useMemo(() => htmlToPlainText(valueHtml).length, [valueHtml]);

  const { toast } = useToast();
  const quillRef = React.useRef<ReactQuill | null>(null);
  const [uploading, setUploading] = React.useState<null | "image" | "video" | "audio">(null);

  const MAX_IMAGE = 10 * 1024 * 1024;
  const MAX_VIDEO = 100 * 1024 * 1024;
  const MAX_AUDIO = 50 * 1024 * 1024;

  const insertHtml = (html: string) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = editor.getSelection(true);
    const index = range ? range.index : editor.getLength();
    editor.clipboard.dangerouslyPasteHTML(index, html);
    editor.setSelection(index + 1, 0);
  };

  const insertEmbed = (type: "image" | "video" | "audio", url: string) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = editor.getSelection(true);
    const index = range ? range.index : editor.getLength();

    if (type === "image") {
      editor.insertEmbed(index, "image", url, "user");
      editor.setSelection(index + 1, 0);
    } else if (type === "video") {
      editor.insertEmbed(index, "html5video", url, "user");
      editor.setSelection(index + 1, 0);
    } else {
      editor.insertEmbed(index, "audio", url, "user");
      editor.setSelection(index + 1, 0);
    }
  };

  const mediaFunctionUrl = "https://cmtehutbazgfjoksmkly.functions.supabase.co/media";
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdGVodXRiYXpnZmpva3Nta2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDc3MzcsImV4cCI6MjA2NzIyMzczN30.N_pjYJGlpV8cIENLeRcVyYiHGxiR_WCv669MKOxXJRA";

  const uploadFile = async (file: File, kind: "image" | "video" | "audio") => {
    if (kind === "image" && file.size > MAX_IMAGE) {
      toast({ title: "Image too large", description: "Max 10 MB.", variant: "destructive" as any });
      return;
    }
    if (kind === "video" && file.size > MAX_VIDEO) {
      toast({ title: "Video too large", description: "Max 100 MB.", variant: "destructive" as any });
      return;
    }
    if (kind === "audio" && file.size > MAX_AUDIO) {
      toast({ title: "Audio too large", description: "Max 50 MB.", variant: "destructive" as any });
      return;
    }

    try {
      setUploading(kind);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const form = new FormData();
      form.append("file", file);

      const res = await fetch(mediaFunctionUrl, {
        method: "POST",
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
          apikey: anonKey,
        },
        body: form,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Upload failed");
      }
      const json = await res.json();
      const url = json.publicUrl || json.public_url || json.url;

      if (!url) throw new Error("No URL returned from upload");

      insertEmbed(kind, url);
      toast({ title: "Uploaded", description: `${file.name} inserted.` });
    } catch (e: any) {
      console.error("Upload error", e);
      toast({ title: "Upload failed", description: e.message || "Please try again.", variant: "destructive" as any });
    } finally {
      setUploading(null);
    }
  };

  // Handle paste image from clipboard
  React.useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const file = new File([blob], `pasted-${Date.now()}.png`, { type: blob.type || "image/png" });
            await uploadFile(file, "image");
          }
          break;
        }
      }
    };

    const root = editor.root;
    root.addEventListener("paste", handlePaste as any);
    return () => root.removeEventListener("paste", handlePaste as any);
  }, []);

  const fileInputsRef = {
    image: React.useRef<HTMLInputElement | null>(null),
    video: React.useRef<HTMLInputElement | null>(null),
    audio: React.useRef<HTMLInputElement | null>(null),
  };

  const triggerPick = (kind: "image" | "video" | "audio") => {
    fileInputsRef[kind].current?.click();
  };

  const onFilePicked = (kind: "image" | "video" | "audio") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadFile(f, kind);
    e.target.value = "";
  };

  return (
    <div className={className}>
      <TooltipProvider>
        <div className="mb-2 flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-accent/50 disabled:opacity-50"
                onClick={() => triggerPick("image")}
                disabled={!!uploading}
                aria-label="Insert image (paste supported)"
                title="Insert image (paste supported)"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Image</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Insert image (paste supported)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-accent/50 disabled:opacity-50"
                onClick={() => triggerPick("video")}
                disabled={!!uploading}
                aria-label="Upload video"
                title="Upload video"
              >
                <VideoIcon className="h-4 w-4" />
                <span>Video</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Upload video (mp4, webm)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-accent/50 disabled:opacity-50"
                onClick={() => triggerPick("audio")}
                disabled={!!uploading}
                aria-label="Upload audio"
                title="Upload audio"
              >
                <AudioLines className="h-4 w-4" />
                <span>Audio</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Upload audio (mp3, wav, m4a)</TooltipContent>
          </Tooltip>

          {uploading && (
            <span className="ml-2 text-xs text-muted-foreground">Uploading {uploading}...</span>
          )}
        </div>

        <input
          ref={fileInputsRef.image}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFilePicked("image")}
        />
        <input
          ref={fileInputsRef.video}
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          className="hidden"
          onChange={onFilePicked("video")}
        />
        <input
          ref={fileInputsRef.audio}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/x-m4a,audio/aac"
          className="hidden"
          onChange={onFilePicked("audio")}
        />

        <ReactQuill
          ref={quillRef}
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
      </TooltipProvider>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{wordCount} words • {charCount} chars</span>
        <span>Press Ctrl/⌘ + Enter to submit</span>
      </div>
    </div>
  );
};

export default RichTextEditor;
