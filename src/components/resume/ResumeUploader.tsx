import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { motion } from "motion/react";
import {
  Download,
  FileText,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import type { Resume } from "@/types/database";
import { useData } from "@/store/DataContext";
import { getSupabase } from "@/lib/supabase";
import { useToast } from "@/store/ToastContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { validateResumeFile, safeErrorMessage } from "@/lib/validation";
import { formatBytes } from "@/lib/formatBytes";

interface ResumeUploaderProps {
  jobId: string;
}

export function ResumeUploader({ jobId }: ResumeUploaderProps) {
  const { resumesForJob, addResume, deleteResume, updateResume } = useData();
  const toast = useToast();
  const resumes = resumesForJob(jobId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState<Resume | null>(null);
  const [busy, setBusy] = useState(false);
  const [versionEdit, setVersionEdit] = useState<Resume | null>(null);
  const [versionValue, setVersionValue] = useState("");

  useEffect(() => {
    if (progress >= 92 || !uploading) return;
    const t = window.setTimeout(() => setProgress((p) => Math.min(92, p + 8)), 140);
    return () => window.clearTimeout(t);
  }, [progress, uploading]);

  const pick = () => fileRef.current?.click();

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = validateResumeFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    setUploading(true);
    setProgress(6);
    try {
      const resume = await addResume(jobId, file, file.name);
      setProgress(100);
      toast.success("Resume uploaded.");
      window.setTimeout(() => setProgress(0), 400);
      void editVersion(resume);
    } catch (uploadErr) {
      toast.error(safeErrorMessage(uploadErr, "Upload failed."));
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const getUrl = async (r: Resume) => {
    try {
      const sb = getSupabase();
      const { data } = await sb.storage
        .from("resumes")
        .createSignedUrl(r.storage_path, 120);
      return data?.signedUrl ?? null;
    } catch {
      return null;
    }
  };

  const openResume = async (r: Resume) => {
    const url = await getUrl(r);
    if (!url) {
      toast.error("Could not open this resume right now.");
      return;
    }
    window.open(url, "_blank", "noopener");
  };

  const editVersion = (r: Resume) => {
    setVersionEdit(r);
    setVersionValue(r.version_name ?? r.file_name);
  };

  const saveVersion = async () => {
    if (!versionEdit) return;
    setBusy(true);
    try {
      await updateResume(versionEdit.id, { version_name: versionValue });
      toast.success("Resume version updated.");
      setVersionEdit(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update version.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteResume(deleting.id);
      toast.success("Resume deleted.");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete resume.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="resume-list">
      <div className="resume-list-head">
        <span className="muted" style={{ fontSize: 13 }}>
          {resumes.length > 0
            ? `${resumes.length} resume${resumes.length === 1 ? "" : "s"} attached`
            : "No resume attached yet"}
        </span>
        <Button variant="secondary" size="sm" onClick={pick} disabled={uploading}>
          <Plus size={15} /> Upload
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        hidden
        onChange={onFile}
        aria-label="Upload resume file"
      />

      {uploading && (
        <div className="upload-preview">
          <div className="row gap-3" style={{ width: "100%" }}>
            <UploadCloud size={18} className="muted" />
            <div style={{ flex: 1 }}>
              <div className="muted" style={{ fontSize: 13 }}>Uploading…</div>
              <div className="progress" style={{ marginTop: 6 }}>
                <motion.div
                  className="progress-bar"
                  animate={{ scaleX: progress / 100 }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {resumes.map((r) => (
        <div className="resume-row" key={r.id}>
          <span className="resume-file-icon">
            <FileText size={17} />
          </span>
          <div className="resume-main">
            <button
              className="resume-name"
              onClick={() => openResume(r)}
              title="Open resume"
            >
              {r.file_name}
            </button>
            <div className="faint" style={{ fontSize: 12 }}>
              {r.version_name ? `Version: ${r.version_name} · ` : ""}
              {r.file_size ? formatBytes(r.file_size) : ""} ·{" "}
              {(r.mime_type ?? "file").split("/")[1]?.toUpperCase()}
            </div>
          </div>
          <div className="resume-actions">
            <IconButton label="Open resume" onClick={() => openResume(r)}>
              <Download size={16} />
            </IconButton>
            <IconButton label="Set version name" onClick={() => editVersion(r)}>
              <Pencil size={16} />
            </IconButton>
            <IconButton label="Delete resume" onClick={() => setDeleting(r)}>
              <Trash2 size={16} />
            </IconButton>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this resume?"
        description={`This permanently removes "${deleting?.file_name ?? ""}" from storage.`}
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={!!versionEdit}
        title="Resume version"
        description="Give this resume a clear version label so you remember exactly what you sent."
        confirmLabel="Save Version"
        tone="primary"
        busy={busy}
        onConfirm={saveVersion}
        onCancel={() => setVersionEdit(null)}
      >
        <Field label="Version name">
          <Input
            value={versionValue}
            onChange={(e) => setVersionValue(e.target.value)}
            placeholder="v2 — For backend roles (Sep 2026)"
            autoFocus
          />
        </Field>
      </ConfirmDialog>
    </div>
  );
}