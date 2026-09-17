import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Building2, ExternalLink, Globe, MapPin, Pencil, Trash2, Briefcase } from "lucide-react";
import { useData } from "@/store/DataContext";
import { useToast } from "@/store/ToastContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApplicationCard } from "@/components/applications/ApplicationCard";
import { s3Https } from "@/lib/format";
import type { CompanyFields } from "@/store/DataContext";

export function Company() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { companies, jobs, updateCompany, deleteCompany } = useData();

  const company = companies.find((c) => c.id === id) ?? null;
  const companyJobs = useMemo(
    () => jobs.filter((j) => j.company_id === id),
    [jobs, id]
  );
  const companyJobsByName = useMemo(
    () => (company ? jobs.filter((j) => j.company_name === company.name) : []),
    [jobs, company]
  );
  const allJobs = companyJobs.length > 0 ? companyJobs : companyJobsByName;

  const [edit, setEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!company) {
    return (
      <EmptyState
        title="COMPANY NOT FOUND."
        description="It may have been deleted."
        action={
          <Link to="/companies" className="btn btn-primary">
            Back to companies
          </Link>
        }
      />
    );
  }

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteCompany(company.id);
      toast.success("Company deleted.");
      navigate("/companies");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete company.");
      setDeleting(false);
    }
  };

  return (
    <div>
      <Link to="/companies" className="back-link">
        <ArrowLeft size={16} /> Companies
      </Link>

      <div className="detail-head">
        <div className="detail-company">
          <div className="company-box-lg">{company.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <h1 className="detail-title">{company.name}</h1>
            <div className="row gap-2" style={{ marginTop: 6, flexWrap: "wrap" }}>
              {company.industry && (
                <span className="meta-item"><Building2 size={13} /> {company.industry}</span>
              )}
              {company.location && (
                <span className="meta-item"><MapPin size={13} /> {company.location}</span>
              )}
              {company.website && (
                <a href={s3Https(company.website) ?? undefined} target="_blank" rel="noopener noreferrer" className="meta-item link">
                  <Globe size={13} /> Website <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="detail-actions">
          <Button variant="secondary" onClick={() => setEdit(true)}>
            <Pencil size={15} /> <span className="hidden-mobile">Edit</span>
          </Button>
          <Button variant="ghost" aria-label="Delete company" onClick={() => setShowDelete(true)}>
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      {company.notes && (
        <p className="notes-text" style={{ whiteSpace: "pre-wrap", marginBottom: 24 }}>
          {company.notes}
        </p>
      )}

      <section className="section">
        <h2 className="section-label" style={{ marginBottom: 14 }}>
          Applications · {allJobs.length}
        </h2>
        {allJobs.length === 0 ? (
          <EmptyState
            compact
            icon={<Briefcase size={20} />}
            title="No applications here yet."
            description="Add an application under this company to see it here."
          />
        ) : (
          <div className="grid">
            {allJobs.map((job, i) => (
              <ApplicationCard job={job} index={i} key={job.id} />
            ))}
          </div>
        )}
      </section>

      {edit && (
        <CompanyEditor
          companyName={company.name}
          fields={{
            website: company.website,
            industry: company.industry,
            location: company.location,
            notes: company.notes,
          }}
          onClose={() => setEdit(false)}
          onSave={async (name, fields) => {
            try {
              await updateCompany(company.id, { name, ...fields });
              toast.success("Company updated.");
              setEdit(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not update company.");
            }
          }}
        />
      )}

      {showDelete && (
        <ConfirmDialog
          title={`Delete ${company.name}?`}
          description={
            allJobs.length > 0
              ? `This company still has ${allJobs.length} application${allJobs.length === 1 ? "" : "s"}. Delete those first before removing the company.`
              : "This permanently removes the company. This cannot be undone."
          }
          confirmLabel="Delete company"
          tone="danger"
          busy={deleting}
          onCancel={() => setShowDelete(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

interface CompanyEditorProps {
  companyName: string;
  fields: CompanyFields;
  onClose: () => void;
  onSave: (name: string, fields: CompanyFields) => Promise<void>;
}

export function CompanyEditor({ companyName, fields, onClose, onSave }: CompanyEditorProps) {
  const [name, setName] = useState(companyName);
  const [website, setWebsite] = useState(fields.website ?? "");
  const [industry, setIndustry] = useState(fields.industry ?? "");
  const [location, setLocation] = useState(fields.location ?? "");
  const [notes, setNotes] = useState(fields.notes ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await onSave(
        name.trim() || companyName,
        {
          website: website.trim() || null,
          industry: industry.trim() || null,
          location: location.trim() || null,
          notes: notes.trim() || null,
        }
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit company">
      <div className="form-stack">
        <Field label="Company name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Website">
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
        </Field>
        <Field label="Industry">
          <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </Field>
        <Field label="Location">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="row gap-2" style={{ justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}