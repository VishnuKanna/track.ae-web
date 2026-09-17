import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Plus } from "lucide-react";
import { useData } from "@/store/DataContext";
import { useToast } from "@/store/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBooleanState } from "@/store/UIStateContext";
import type { CompanyFields } from "@/store/DataContext";

export function Companies() {
  const { companies, jobs, loading, hydrated, createCompany } = useData();
  const toast = useToast();
  const [open, on, off] = useBooleanState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of jobs) {
      const key = job.company_id ?? job.company_name;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...companies]
      .map((c) => ({ company: c, count: counts.get(c.id) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [companies, jobs]);

  const add = async () => {
    const clean = name.trim();
    if (!clean) return toast.error("Company name is required.");
    setBusy(true);
    try {
      await createCompany(clean, toFields());
      toast.success("Company added.");
      off();
      setName(""); setWebsite(""); setIndustry(""); setLocation(""); setNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add company.");
    } finally {
      setBusy(false);
    }
  };

  const toFields = (): CompanyFields => ({
    website: website.trim() || null,
    industry: industry.trim() || null,
    location: location.trim() || null,
    notes: notes.trim() || null,
  });

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Companies</h1>
          <div className="company-count">
            {companies.length} {companies.length === 1 ? "company" : "companies"} tracked
          </div>
        </div>
        <Button onClick={on}>
          <Plus size={16} /> <span className="hidden-mobile">Add company</span>
          <span className="hidden-desktop">Add</span>
        </Button>
      </div>

      {loading && !hydrated ? (
        <div className="grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="panel" key={i}>
              <Skeleton style={{ height: 14, width: "50%" }} />
              <Skeleton style={{ height: 12, width: "60%" }} />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Building2 size={26} />}
          title="NO COMPANIES YET."
          description="Companies are created automatically when you add applications."
        />
      ) : (
        <div className="grid">
          {rows.map(({ company, count }, i) => (
            <Link to={`/companies/${company.id}`} className="panel company-row" key={company.id}>
              <div className="company-box-sm">
                {company.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="company-row-main">
                <div className="company-row-name">{company.name}</div>
                <div className="company-row-meta">
                  {[company.industry, company.location].filter(Boolean).join(" · ") ||
                    "No details yet"}
                </div>
              </div>
              <div className="company-row-count">
                <strong>{count}</strong>
                <span className="faint" style={{ fontSize: 11 }}>{count === 1 ? "app" : "apps"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {open && (
        <Modal open onClose={off} title="Add company">
          <div className="form-stack">
            <Field label="Company name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Corp" autoFocus />
            </Field>
            <Field label="Website">
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Industry">
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Fintech" />
            </Field>
            <Field label="Location">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
            </Field>
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering…" />
            </Field>
            <div className="row gap-2" style={{ justifyContent: "flex-end" }}>
              <Button variant="ghost" onClick={off}>Cancel</Button>
              <Button onClick={add} disabled={busy || !name.trim()}>
                {busy ? "Adding…" : "Add company"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}