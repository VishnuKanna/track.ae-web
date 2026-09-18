import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { HRContactForm } from "@/components/hr/HRContactForm";
import { ResumeUploader } from "@/components/resume/ResumeUploader";
import { useData } from "@/store/DataContext";
import type { HRContactInput } from "@/store/DataContext";
import { useToast } from "@/store/ToastContext";
import { STATUS_ORDER, STATUS_CONFIG, EMPLOYMENT_TYPES } from "@/config/status";
import { PRIORITIES } from "@/config/priority";
import { validateJobForm, safeErrorMessage } from "@/lib/validation";
import type { JobFormValues } from "@/lib/validation";
import { todayISO } from "@/lib/format";
import type { Job } from "@/types/database";

const CURRENCIES = [
  "AED", "USD", "EUR", "GBP", "SAR", "KWD", "QAR", "INR", "SGD", "AUD",
  "CAD", "CHF", "PKR", "EGP", "TRY",
];

interface HRDraft {
  localId: string;
  existingId?: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  linkedin_url: string;
  notes: string;
  removed: boolean;
}

interface CompanyDetailsState {
  website: string;
  industry: string;
  location: string;
  notes: string;
}

interface ApplicationFormProps {
  open: boolean;
  onClose: () => void;
  job?: Job | null;
  defaultStatus?: string;
  onDeleted?: () => void;
}

let draftId = 0;
const nextDraftId = () => `d${++draftId}`;

function emptyValues(defaultStatus = "applied"): JobFormValues {
  return {
    company_name: "",
    job_title: "",
    job_url: "",
    job_id: "",
    location: "",
    address: "",
    salary_min: "",
    salary_max: "",
    salary_currency: "AED",
    employment_type: "full_time",
    source: "",
    application_date: todayISO(),
    status: defaultStatus,
    priority: "medium",
    next_follow_up_date: "",
    last_contact_date: "",
    referral_name: "",
    referral_contact: "",
    resume_version: "",
    cover_letter_version: "",
    job_description: "",
    recruiter_notes: "",
  };
}

export function ApplicationForm({
  open,
  onClose,
  job,
  defaultStatus,
  onDeleted,
}: ApplicationFormProps) {
  const {
    createJob,
    updateJob,
    deleteJob,
    companies,
    companyById,
    contactsForJob,
    resumesForJob,
    addHRContact,
    updateHRContact,
    deleteHRContact,
    addResume,
  } = useData();
  const toast = useToast();

  const isEdit = !!job;

  const initialValues = useMemo<JobFormValues>(() => {
    if (!job) return emptyValues(defaultStatus);
    return {
      company_name: job.company_name ?? "",
      job_title: job.job_title ?? "",
      job_url: job.job_url ?? "",
      job_id: job.job_id ?? "",
      location: job.location ?? "",
      address: job.address ?? "",
      salary_min: job.salary_min?.toString() ?? "",
      salary_max: job.salary_max?.toString() ?? "",
      salary_currency: job.salary_currency ?? "AED",
      employment_type: job.employment_type ?? "full_time",
      source: job.source ?? "",
      application_date: job.application_date ?? todayISO(),
      status: job.status ?? "applied",
      priority: job.priority ?? "medium",
      next_follow_up_date: job.next_follow_up_date ?? "",
      last_contact_date: job.last_contact_date ?? "",
      referral_name: job.referral_name ?? "",
      referral_contact: job.referral_contact ?? "",
      resume_version: job.resume_version ?? "",
      cover_letter_version: job.cover_letter_version ?? "",
      job_description: job.job_description ?? "",
      recruiter_notes: job.recruiter_notes ?? "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, defaultStatus]);

  const initialCompanyFields = useMemo<CompanyDetailsState>(() => {
    const c = job ? companyById(job.company_id) : undefined;
    return {
      website: c?.website ?? "",
      industry: c?.industry ?? "",
      location: c?.location ?? "",
      notes: c?.notes ?? "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  const initialDrafts = useMemo<HRDraft[]>(() => {
    if (!job) return [];
    return contactsForJob(job.id).map((c) => ({
      localId: c.id,
      existingId: c.id,
      name: c.name ?? "",
      designation: c.designation ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      linkedin_url: c.linkedin_url ?? "",
      notes: c.notes ?? "",
      removed: false,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  const [values, setValues] = useState<JobFormValues>(() => initialValues);
  const [companyFields, setCompanyFields] = useState<CompanyDetailsState>(
    () => initialCompanyFields
  );
  const [drafts, setDrafts] = useState<HRDraft[]>(() => initialDrafts);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingDraft, setEditingDraft] = useState<HRDraft | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Reset the form on every fresh open (or when switching target job) so state
  // from a previous submission can never leak into the next one. This is the
  // reliable replacement for the old render-phase reset that could leave the
  // submit button stuck on "Adding…".
  const key = job?.id ?? "new";
  const wasOpenRef = useRef(false);
  const lastKeyRef = useRef(key);
  useEffect(() => {
    const opened = open && !wasOpenRef.current;
    const switched = open && lastKeyRef.current !== key;
    wasOpenRef.current = open;
    lastKeyRef.current = key;
    if (opened || switched) {
      setValues(initialValues);
      setCompanyFields(initialCompanyFields);
      setDrafts(initialDrafts);
      setErrors({});
      setBusy(false);
      setDeleting(false);
      setPendingFile(null);
      setEditingDraft(null);
    } else if (!open) {
      setBusy(false);
    }
    // Only react to open/key transitions; field values are derived from job id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const set = <K extends keyof JobFormValues>(k: K, v: JobFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));
  const setCompany = <K extends keyof CompanyDetailsState>(k: K, v: string) =>
    setCompanyFields((prev) => ({ ...prev, [k]: v }));

  const companyNames = companies.map((c) => c.name);
  const statusConfig =
    STATUS_CONFIG[values.status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.applied;
  const activeDraftCount = drafts.filter((d) => !d.removed).length;

  const applyDraft = (
    draft: HRDraft,
    v: HRContactInput
  ): Promise<void> => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.localId === draft.localId
          ? {
              ...d,
              name: v.name ?? d.name,
              designation: v.designation ?? d.designation,
              email: v.email ?? d.email,
              phone: v.phone ?? d.phone,
              linkedin_url: v.linkedin_url ?? d.linkedin_url,
              notes: v.notes ?? d.notes,
            }
          : d
      )
    );
    setEditingDraft(null);
    return Promise.resolve();
  };

  const addDraft = () => {
    const draft: HRDraft = {
      localId: nextDraftId(),
      name: "",
      designation: "",
      email: "",
      phone: "",
      linkedin_url: "",
      notes: "",
      removed: false,
    };
    setDrafts((prev) => [...prev, draft]);
    setEditingDraft(draft);
  };

  const saveContactDrafts = async (createdJobId?: string) => {
    const live = drafts.filter((d) => !d.removed && d.name.trim());
    if (live.length === 0) return;
    let skipped = 0;
    for (const d of live) {
      try {
        if (d.existingId) {
          await updateHRContact(d.existingId, {
            name: d.name,
            designation: d.designation,
            email: d.email,
            phone: d.phone,
            linkedin_url: d.linkedin_url,
            notes: d.notes,
          });
        } else if (createdJobId) {
          await addHRContact(createdJobId, {
            name: d.name,
            designation: d.designation,
            email: d.email,
            phone: d.phone,
            linkedin_url: d.linkedin_url,
            notes: d.notes,
          });
        }
      } catch {
        skipped += 1;
      }
    }
    if (skipped > 0) {
      toast.info(
        `${skipped} HR contact${skipped === 1 ? "" : "s"} skipped (check details or 25-contact limit).`
      );
    }
  };

  const deleteRemovedDrafts = async () => {
    for (const d of drafts) {
      if (d.removed && d.existingId) {
        try {
          await deleteHRContact(d.existingId);
        } catch {
          /* best effort */
        }
      }
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs = validateJobForm(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      const input = {
        company_name: values.company_name,
        company: {
          website: companyFields.website,
          industry: companyFields.industry,
          location: companyFields.location,
          notes: companyFields.notes,
        },
        job_title: values.job_title,
        job_url: values.job_url || null,
        job_id: values.job_id || null,
        location: values.location || null,
        address: values.address || null,
        salary_min: values.salary_min ? Number(values.salary_min) : null,
        salary_max: values.salary_max ? Number(values.salary_max) : null,
        salary_currency: values.salary_currency || null,
        employment_type: values.employment_type || null,
        status: values.status,
        application_date: values.application_date || null,
        next_follow_up_date: values.next_follow_up_date || null,
        last_contact_date: values.last_contact_date || null,
        source: values.source || null,
        referral_name: values.referral_name || null,
        referral_contact: values.referral_contact || null,
        recruiter_notes: values.recruiter_notes || null,
        resume_version: values.resume_version || null,
        cover_letter_version: values.cover_letter_version || null,
        job_description: values.job_description || null,
        priority: values.priority,
      };

      if (isEdit && job) {
        await updateJob(job.id, input, { skipEvents: true });
        await deleteRemovedDrafts();
        await saveContactDrafts(job.id);
        toast.success("Application updated.");
      } else {
        const created = await createJob(input);
        await saveContactDrafts(created.id);
        if (pendingFile) {
          try {
            await addResume(
              created.id,
              pendingFile,
              values.resume_version || pendingFile.name
            );
          } catch {
            toast.info("Application added — the resume upload failed, add it from the application.");
          }
        }
        toast.success("Application added.");
      }
      onClose();
    } catch (err) {
      toast.error(
        safeErrorMessage(
          err,
          isEdit
            ? "Unable to update application. Please try again."
            : "Unable to add application. Please try again."
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!isEdit || !job) return;
    setBusy(true);
    try {
      await deleteJob(job.id);
      toast.success("Application deleted.");
      setDeleting(false);
      onClose();
      onDeleted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete application.");
      setBusy(false);
    }
  };

  const existingResumesCount = isEdit && job ? resumesForJob(job.id).length : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Application" : "Add Application"}
      size="lg"
    >
      <form onSubmit={submit} noValidate>
        {/* JOB — always open */}
        <section className="form-section">
          <div className="form-section-head">
            <span className="form-section-title">
              <span className="form-section-dot" />JOB
            </span>
          </div>
          <div className="form-section-body">
            <div className="quick-fields">
              <Field label="Company" required error={errors.company_name} htmlFor="f-company">
                <Input
                  id="f-company"
                  value={values.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  invalid={!!errors.company_name}
                  placeholder="Google"
                  list="company-datalist"
                  autoFocus
                />
                <datalist id="company-datalist">
                  {companyNames.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </Field>
              <Field label="Job title" required error={errors.job_title} htmlFor="f-title">
                <Input
                  id="f-title"
                  value={values.job_title}
                  onChange={(e) => set("job_title", e.target.value)}
                  invalid={!!errors.job_title}
                  placeholder="Lead Backend Engineer"
                />
              </Field>
            </div>

            <details className="mini-details">
              <summary>
                <span>Company details</span>
                <ChevronDown size={14} className="faint" />
              </summary>
              <div className="form-grid-2" style={{ marginTop: 14 }}>
                <Field label="Website">
                  <Input value={companyFields.website} onChange={(e) => setCompany("website", e.target.value)} placeholder="https://careers.google.com" inputMode="url" />
                </Field>
                <Field label="Industry">
                  <Input value={companyFields.industry} onChange={(e) => setCompany("industry", e.target.value)} placeholder="Technology" />
                </Field>
              </div>
              <Field label="Company location">
                <Input value={companyFields.location} onChange={(e) => setCompany("location", e.target.value)} placeholder="Dubai, UAE" />
              </Field>
              <Field label="Company notes">
                <Textarea value={companyFields.notes} onChange={(e) => setCompany("notes", e.target.value)} placeholder="Anything useful to remember about this company…" />
              </Field>
            </details>

            <div className="quick-fields" style={{ marginTop: 4 }}>
              <Field label="Job URL" error={errors.job_url}>
                <Input value={values.job_url} onChange={(e) => set("job_url", e.target.value)} invalid={!!errors.job_url} placeholder="https://…" inputMode="url" />
              </Field>
              <Field label="Job ID (optional)">
                <Input value={values.job_id} onChange={(e) => set("job_id", e.target.value)} placeholder="REQ-123456" />
              </Field>
            </div>
            <div className="quick-fields">
              <Field label="Location">
                <Input value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="Dubai" />
              </Field>
              <Field label="Address">
                <Input value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="DIFC, Dubai" />
              </Field>
            </div>
            <div className="form-grid-3">
              <Field label="Salary min" error={errors.salary_min}>
                <Input value={values.salary_min} onChange={(e) => set("salary_min", e.target.value)} invalid={!!errors.salary_min} inputMode="decimal" placeholder="15000" />
              </Field>
              <Field label="Salary max" error={errors.salary_max}>
                <Input value={values.salary_max} onChange={(e) => set("salary_max", e.target.value)} invalid={!!errors.salary_max} inputMode="decimal" placeholder="25000" />
              </Field>
              <Field label="Currency">
                <Select value={values.salary_currency} onChange={(e) => set("salary_currency", e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="form-grid-3">
              <Field label="Employment type">
                <Select value={values.employment_type} onChange={(e) => set("employment_type", e.target.value)}>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Source">
                <Select value={values.source} onChange={(e) => set("source", e.target.value)}>
                  <option value="">Select…</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Company website">Company website</option>
                  <option value="Referral">Referral</option>
                  <option value="Recruiter">Recruiter</option>
                  <option value="Job board">Job board</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>
              <Field label="Application date">
                <Input type="date" value={values.application_date} onChange={(e) => set("application_date", e.target.value)} />
              </Field>
            </div>
            <div className="form-grid-2">
              <Field label="Status" hint={statusConfig.semantic}>
                <Select value={values.status} onChange={(e) => set("status", e.target.value)}>
                  {STATUS_ORDER.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Priority">
                <Select value={values.priority} onChange={(e) => set("priority", e.target.value)}>
                  {PRIORITIES.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </section>

        <Accordion summary="Follow-up" rule="Optional">
          <div className="form-grid-2">
            <Field label="Next follow-up date" hint="Track.AE will remind you here">
              <Input type="date" value={values.next_follow_up_date} onChange={(e) => set("next_follow_up_date", e.target.value)} />
            </Field>
            <Field label="Last contact date">
              <Input type="date" value={values.last_contact_date} onChange={(e) => set("last_contact_date", e.target.value)} />
            </Field>
          </div>
        </Accordion>

        <Accordion summary="Referral" rule="Optional">
          <div className="form-grid-2">
            <Field label="Referral name">
              <Input value={values.referral_name} onChange={(e) => set("referral_name", e.target.value)} placeholder="Name of the person who referred you" />
            </Field>
            <Field label="Referral contact">
              <Input value={values.referral_contact} onChange={(e) => set("referral_contact", e.target.value)} placeholder="email or phone" />
            </Field>
          </div>
        </Accordion>

        <Accordion summary="Resume & documents" rule="Optional">
          {isEdit && job ? (
            <>
              <Field label="Resume version label">
                <Input value={values.resume_version} onChange={(e) => set("resume_version", e.target.value)} placeholder="v2 — Backend (Sep 2026)" />
              </Field>
              {existingResumesCount > 0 && (
                <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
                  Attachments for this application:
                </div>
              )}
              {existingResumesCount > 0 && <ResumeUploader jobId={job.id} />}
              <Field label="Cover letter version">
                <Input value={values.cover_letter_version} onChange={(e) => set("cover_letter_version", e.target.value)} placeholder="v1" />
              </Field>
            </>
          ) : (
            <>
              <Field label="Resume version label">
                <Input value={values.resume_version} onChange={(e) => set("resume_version", e.target.value)} placeholder="v2 — Backend (Sep 2026)" />
              </Field>
              <label className="file-drop">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
                />
                {pendingFile ? (
                  <span className="file-drop-name">
                    {pendingFile.name} <span className="file-drop-hint">· change (PDF, DOC, DOCX · max 10 MB)</span>
                  </span>
                ) : (
                  <span>
                    Attach a resume to this application{" "}
                    <span className="file-drop-hint">(PDF, DOC, DOCX · max 10 MB)</span>
                  </span>
                )}
              </label>
              <Field label="Cover letter version">
                <Input value={values.cover_letter_version} onChange={(e) => set("cover_letter_version", e.target.value)} placeholder="v1" />
              </Field>
            </>
          )}
        </Accordion>

        <Accordion summary="HR contacts" rule={`${activeDraftCount}/25`}>
          {activeDraftCount === 0 && (
            <p className="faint" style={{ margin: "4px 0 12px", fontSize: 13 }}>
              Add the recruiters handling this role. Up to 25 contacts.
            </p>
          )}
          <div className="hr-draft-list">
            {drafts
              .filter((d) => !d.removed)
              .map((d, idx) => (
                <div className="hr-draft-row" key={d.localId}>
                  <div className="hr-draft-main">
                    <div className="hr-draft-name">
                      <span className="faint" style={{ marginRight: 6 }}>{idx + 1}.</span>
                      {d.name || <span className="faint">New contact</span>}
                    </div>
                    <div className="hr-draft-meta muted">
                      {[d.designation, d.email, d.phone].filter(Boolean).join(" · ") || "No details yet"}
                    </div>
                  </div>
                  <div className="contact-actions">
                    <IconButton label="Edit contact" onClick={() => setEditingDraft(d)}>
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton label="Remove contact" onClick={() => setDrafts((prev) => prev.map((x) => (x.localId === d.localId ? { ...x, removed: true } : x)))}>
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </div>
              ))}
          </div>
          {activeDraftCount < 25 ? (
            <Button variant="ghost" size="sm" type="button" onClick={addDraft}>
              <Plus size={15} /> Add HR Contact
            </Button>
          ) : (
            <p className="faint" style={{ fontSize: 13 }}>Maximum of 25 HR contacts reached.</p>
          )}
          {editingDraft && (
            <div className="draft-editor">
              <div className="draft-editor-head">
                <strong>{editingDraft.existingId ? "Edit" : "Add"} contact</strong>
                <IconButton label="Close contact editor" onClick={() => setEditingDraft(null)}>
                  <X size={15} />
                </IconButton>
              </div>
              <HRContactForm
                initial={editingDraft}
                submitLabel="Done"
                onCancel={() => setEditingDraft(null)}
                onSubmit={(v) => applyDraft(editingDraft, v)}
              />
            </div>
          )}
        </Accordion>

        <Accordion summary="Notes" rule="Optional">
          <Field label="Job description" htmlFor="f-jd">
            <Textarea id="f-jd" value={values.job_description} onChange={(e) => set("job_description", e.target.value)} placeholder="Paste the job description for reference…" />
          </Field>
          <Field label="Recruiter notes" htmlFor="f-rn">
            <Textarea id="f-rn" value={values.recruiter_notes} onChange={(e) => set("recruiter_notes", e.target.value)} placeholder="Interviews, expectations, next steps…" />
          </Field>
        </Accordion>

        <div className="save-bar">
          {isEdit && (
            <Button variant="ghost" type="button" onClick={() => setDeleting(true)}>
              <Trash2 size={15} /> Delete Application
            </Button>
          )}
          <span />
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} loadingLabel={isEdit ? "Saving…" : "Adding…"}>
            {isEdit ? "Save Application" : "Save Application"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={deleting}
        title="Delete this application?"
        description="This will permanently remove the application and its HR contacts, events, and attachments."
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(false)}
      />
    </Modal>
  );
}

function Accordion({
  summary,
  rule,
  children,
}: {
  summary: string;
  rule?: string;
  children: ReactNode;
}) {
  return (
    <details className="form-section form-accordion">
      <summary>
        {summary}
        {rule && <span className="section-rule">{rule}</span>}
        <span className="chev">
          <ChevronDown size={16} />
        </span>
      </summary>
      <div className="form-section-body">{children}</div>
    </details>
  );
}