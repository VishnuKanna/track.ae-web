import { useState } from "react";
import type { HRContact } from "@/types/database";
import { HRContactForm } from "@/components/hr/HRContactForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useData } from "@/store/DataContext";
import type { HRContactInput } from "@/store/DataContext";
import { useToast } from "@/store/ToastContext";
import { MAX_HR_CONTACTS } from "@/lib/validation";

interface HRContactListProps {
  jobId: string;
}

export function HRContactList({ jobId }: HRContactListProps) {
  const { contactsForJob, addHRContact, updateHRContact, deleteHRContact } =
    useData();
  const toast = useToast();
  const contacts = contactsForJob(jobId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<HRContact | null>(null);
  const [deleting, setDeleting] = useState<HRContact | null>(null);
  const [busy, setBusy] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (c: HRContact) => {
    setEditing(c);
    setEditorOpen(true);
  };

  const canAdd = contacts.length < MAX_HR_CONTACTS;

  const save = async (values: HRContactInput) => {
    setBusy(true);
    try {
      if (editing) {
        await updateHRContact(editing.id, values);
        toast.success("HR contact updated.");
      } else {
        await addHRContact(jobId, values);
        toast.success("HR contact added.");
      }
      setEditorOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save contact.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteHRContact(deleting.id);
      toast.success("HR contact deleted.");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete contact.");
    } finally {
      setBusy(false);
    }
  };

  const mailtoHref = (c: HRContact) =>
    c.email ? `mailto:${c.email}` : undefined;

  return (
    <div className="hr-list">
      {contacts.length === 0 ? (
        <EmptyState
          compact
          icon={<Users size={22} />}
          title="No HR contacts yet"
          description="Add the recruiters and hiring managers for this role."
          action={
            <Button size="sm" variant="secondary" type="button" onClick={openAdd} disabled={!canAdd}>
              <Plus size={15} /> Add HR Contact
            </Button>
          }
        />
      ) : (
        <>
          <div className="hr-count-badge">
            {contacts.length} / {MAX_HR_CONTACTS} contacts
          </div>
          {contacts.map((c, idx) => (
            <div className="contact-row" key={c.id}>
              <div className="contact-main">
                <div className="contact-name">
                  <span className="contact-index faint">{idx + 1}.</span>
                  {c.name || "Unnamed contact"}
                </div>
                {c.designation && (
                  <div className="contact-meta">{c.designation}</div>
                )}
                {(c.email || c.phone) && (
                  <div className="contact-meta">
                    {c.email && (
                      <a href={mailtoHref(c)} onClick={(e) => e.stopPropagation()}>
                        {c.email}
                      </a>
                    )}
                    {c.phone && <> · {c.phone}</>}
                  </div>
                )}
                {c.linkedin_url && (
                  <div className="contact-meta">
                    <a
                      href={c.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      LinkedIn ↗
                    </a>
                  </div>
                )}
                {c.notes && <div className="contact-notes faint">{c.notes}</div>}
              </div>
              <div className="contact-actions">
                <IconButton label="Edit contact" size={17} onClick={() => openEdit(c)}>
                  <Pencil size={16} />
                </IconButton>
                <IconButton label="Delete contact" size={17} onClick={() => setDeleting(c)}>
                  <Trash2 size={16} />
                </IconButton>
              </div>
            </div>
          ))}
          {canAdd && (
            <div style={{ marginTop: 12 }}>
              <Button variant="secondary" size="sm" type="button" onClick={openAdd}>
                <Plus size={15} /> Add HR Contact
              </Button>
            </div>
          )}
          {!canAdd && (
            <p className="faint" style={{ marginTop: 12, fontSize: 13 }}>
              Maximum of {MAX_HR_CONTACTS} contacts reached for this application.
            </p>
          )}
        </>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? "Edit HR Contact" : "Add HR Contact"}
        size="sm"
      >
        <HRContactForm
          key={editing?.id ?? "new"}
          initial={
            editing
              ? {
                  name: editing.name ?? undefined,
                  designation: editing.designation ?? undefined,
                  email: editing.email ?? undefined,
                  phone: editing.phone ?? undefined,
                  linkedin_url: editing.linkedin_url ?? undefined,
                  notes: editing.notes ?? undefined,
                }
              : null
          }
          busy={busy}
          submitLabel={editing ? "Save Changes" : "Add Contact"}
          onCancel={() => setEditorOpen(false)}
          onSubmit={save}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this HR contact?"
        description={`This will permanently remove ${deleting?.name ?? "this contact"} from the application.`}
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}