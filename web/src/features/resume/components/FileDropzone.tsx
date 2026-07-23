import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export function FileDropzone({ onFileSelect, selectedFile, onClear }: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSelectFile = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are supported currently.');
      return;
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size exceeds the maximum 10MB limit.');
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full text-left">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,application/pdf"
        onChange={handleChange}
      />

      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`w-full p-8 md:p-12 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 select-none ${
            dragActive
              ? 'border-zinc-400 scale-[0.99] neo-sunken'
              : 'border-zinc-850 hover:border-zinc-750 hover:scale-[1.01] neo-raised'
          }`}
        >
          <div className="size-12 rounded-xl squircle-icon-bg text-text-muted shrink-0 flex items-center justify-center shadow-md">
            <UploadCloud className={`size-6 transition-transform duration-300 ${dragActive ? 'scale-110 animate-bounce' : 'group-hover:scale-105'}`} />
          </div>
          <h3 className="text-sm font-bold text-text-prim mt-4">Upload your Resume</h3>
          <p className="text-text-sec text-xs mt-1 max-w-xs leading-relaxed">
            Drag and drop your PDF resume here, or <span className="text-text-prim underline font-semibold">browse files</span>.
          </p>
          <div className="flex items-center gap-1.5 mt-6 text-[10px] font-mono text-text-muted border border-border-subtle bg-bg-base/30 px-2.5 py-1 rounded-full">
            <AlertTriangle className="size-3" />
            PDF format only, maximum 10MB
          </div>
        </div>
      ) : (
        <div className="w-full p-6 rounded-2xl flex items-center justify-between gap-4 neo-raised">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-3 rounded-2xl squircle-icon-bg text-text-prim shrink-0">
              <FileText className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-prim truncate">{selectedFile.name}</p>
              <p className="text-xs text-text-muted font-mono mt-0.5">{formatBytes(selectedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-xs font-semibold text-text-muted hover:text-text-prim hover:underline cursor-pointer py-1.5 px-3 rounded-lg hover:bg-zinc-900 transition-colors shrink-0"
          >
            Change file
          </button>
        </div>
      )}
    </div>
  );
}
