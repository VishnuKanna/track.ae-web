import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { validateHRContact } from "@/lib/validation";
import type { ValidationErrors } from "@/lib/validation";
import type { HRContactInput } from "@/store/DataContext";

export interface HRContactFormProps {
  initial?: Partial<HRContactInput> | null;
  busy?: boolean;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (values: HRContactInput) => Promise<void>;
}

export function HRContactForm({
  initial,
  busy,
  submitLabel = "Save Contact",
  onCancel,
  onSubmit,
}: HRContactFormProps) {
  const [values, setValues] = useState<HRContactInput>({
    name: initial?.name ?? "",
    designation: initial?.designation ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    linkedin_url: initial?.linkedin_url ?? "",
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  const set = (key: keyof HRContactInput, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateHRContact(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await onSubmit(values);
    } catch {
      /* handled upstream via toast */
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-grid-2">
        <Field label="Name" required error={errors.name} htmlFor="hr-name">
          <Input
            id="hr-name"
            value={values.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
            invalid={!!errors.name}
            placeholder="Sarah Ahmed"
            autoComplete="name"
          />
        </Field>
        <Field label="Designation" error={errors.designation} htmlFor="hr-desig">
          <Input
            id="hr-desig"
            value={values.designation ?? ""}
            onChange={(e) => set("designation", e.target.value)}
            placeholder="Recruiter"
          />
        </Field>
      </div>
      <div className="form-grid-2">
        <Field label="Email" error={errors.email} htmlFor="hr-email">
          <Input
            id="hr-email"
            type="email"
            inputMode="email"
            value={values.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            invalid={!!errors.email}
            placeholder="sarah@company.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Phone" error={errors.phone} htmlFor="hr-phone">
          <Input
            id="hr-phone"
            type="tel"
            inputMode="tel"
            value={values.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+971 000 0000"
          />
        </Field>
      </div>
      <Field label="LinkedIn" error={errors.linkedin_url} htmlFor="hr-linkedin">
        <Input
          id="hr-linkedin"
          inputMode="url"
          value={values.linkedin_url ?? ""}
          onChange={(e) => set("linkedin_url", e.target.value)}
          invalid={!!errors.linkedin_url}
          placeholder="https://linkedin.com/in/..."
        />
      </Field>
      <Field label="Notes" htmlFor="hr-notes">
        <Textarea
          id="hr-notes"
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Best time to reach, preferred channel, context…"
        />
      </Field>
      <div className="form-actions">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={busy} loadingLabel="Saving…">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}