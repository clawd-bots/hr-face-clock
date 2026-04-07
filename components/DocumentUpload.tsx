"use client";

import { useState, useRef } from "react";

type DocumentUploadProps = {
  employeeId: string;
  onUploadComplete: () => void;
};

const DOCUMENT_TYPES = [
  "contract",
  "government_id",
  "certificate",
  "memo",
  "clearance",
  "medical",
  "other",
];

export default function DocumentUpload({
  employeeId,
  onUploadComplete,
}: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("other");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", docType);

      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      setFile(null);
      setDocType("other");
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-[#f4f1e6] border border-[rgba(138,58,52,0.2)] rounded-2xl text-sm font-medium text-[#8a3a34]">
          {error}
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors duration-150 ${
          dragOver
            ? "border-[#cf9358] bg-[rgba(255,198,113,0.1)]"
            : "border-[rgba(0,0,0,0.15)] hover:border-[rgba(0,0,0,0.3)] bg-[#fafaf2]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <div>
            <p className="text-sm font-medium text-[rgba(0,0,0,0.88)]">
              {file.name}
            </p>
            <p className="text-xs text-[rgba(0,0,0,0.4)] mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-[rgba(0,0,0,0.65)]">
              Drop a file here or click to browse
            </p>
            <p className="text-xs text-[rgba(0,0,0,0.4)] mt-1">
              PDF, DOC, DOCX, JPG, PNG — max 10MB
            </p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex gap-3">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="flex-1 h-10 px-3 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.88)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)]"
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="h-10 px-6 rounded-xl text-sm font-medium text-[#61474c] disabled:opacity-50"
            style={{
              background: "linear-gradient(to right, #ffc671, #cf9358)",
            }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}
    </div>
  );
}
