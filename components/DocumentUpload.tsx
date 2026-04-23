"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

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
        <div className="px-4 py-3 bg-sw-danger-100 border border-sw-danger-500/20 rounded-[12px] text-sw-caption font-medium text-[#a11b35]">
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
        className={`border-2 border-dashed rounded-sw-lg p-8 text-center cursor-pointer transition-colors duration-sw-fast ${
          dragOver
            ? "border-sw-gold-500 bg-sw-gold-50"
            : "border-sw-ink-200 hover:border-sw-ink-300 bg-sw-cream-25"
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
            <p className="text-sw-caption font-medium text-sw-ink-900">{file.name}</p>
            <p className="text-sw-micro text-sw-ink-500 mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sw-caption font-medium text-sw-ink-700">
              Drop a file here or click to browse
            </p>
            <p className="text-sw-micro text-sw-ink-500 mt-1">
              PDF, DOC, DOCX, JPG, PNG — max 10MB
            </p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex gap-3">
          <Select
            className="flex-1"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </Select>
          <Button variant="primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      )}
    </div>
  );
}
