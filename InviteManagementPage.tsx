import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';

import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { QRCodeCard } from '../../components/common/QRCodeCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { eventService } from '../../services/eventService';
import { inviteService } from '../../services/inviteService';
import { type EventItem, type Invitee } from '../../types';
import {
  Users,
  UserPlus,
  UploadCloud,
  Download,
  Copy,
  Check,
  QrCode,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const InviteManagementPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { success, error } = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [invites, setInvites] = useState<Invitee[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Status Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeQRInvite, setActiveQRInvite] = useState<Invitee | null>(null);

  // Add form fields
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addRole, setAddRole] = useState('');
  const [addCompany, setAddCompany] = useState('');
  const [addPlusOnes, setAddPlusOnes] = useState('0');
  const [adding, setAdding] = useState(false);

  // CSV upload state
  const [csvText, setCsvText] = useState('');
  const [uploading, setUploading] = useState(false);

  // Copy state
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    eventService.getEvent(eventId).then((ev) => setEvent(ev));

    const unsub = inviteService.subscribeEventInvites(eventId, (data) => {
      setInvites(data);
      setLoading(false);
    });

    return () => unsub();
  }, [eventId]);

  const handleAddSingleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !addName.trim() || !addEmail.trim()) {
      error('Name and Email are required.');
      return;
    }

    setAdding(true);
    try {
      await inviteService.createInvite(eventId, {
        name: addName.trim(),
        email: addEmail.trim(),
        phone: addPhone.trim() || undefined,
        role: addRole.trim() || undefined,
        company: addCompany.trim() || undefined,
        plusOnesAllowed: parseInt(addPlusOnes, 10) || 0,
      });

      success(`Invitation created for ${addName}!`);
      setShowAddModal(false);
      setAddName('');
      setAddEmail('');
      setAddPhone('');
      setAddRole('');
      setAddCompany('');
      setAddPlusOnes('0');
    } catch (err: any) {
      error(err.message || 'Failed to create invite.');
    } finally {
      setAdding(false);
    }
  };

  const handleCSVUpload = async () => {
    if (!eventId || !csvText.trim()) {
      error('Please paste CSV contents or choose a file.');
      return;
    }

    setUploading(true);
    try {
      const parsed = inviteService.parseCSV(csvText);
      if (parsed.length === 0) {
        error('No valid rows found in CSV. Ensure "name" and "email" headers exist.');
        setUploading(false);
        return;
      }

      await inviteService.createBatchInvites(eventId, parsed);
      success(`Successfully imported ${parsed.length} invitees!`);
      setShowUploadModal(false);
      setCsvText('');
    } catch (err: any) {
      error(err.message || 'Error processing CSV file.');
    } finally {
      setUploading(false);
    }
  };

  const handleCopyRSVPLink = (invite: Invitee) => {
    const link = `${window.location.origin}/rsvp?e=${eventId}&t=${invite.token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(invite.token);
    success(`RSVP link copied for ${invite.name}!`);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleExportCSV = () => {
    if (invites.length === 0) {
      error('No invitees to export.');
      return;
    }
    inviteService.exportInvitesToCSV(invites, event?.title || 'event');
    success('CSV downloaded successfully!');
  };

  const filteredInvites = invites.filter((inv) => {
    const matchesSearch = inv.name.toLowerCase().includes(search.toLowerCase()) ||
      inv.email.toLowerCase().includes(search.toLowerCase()) ||
      (inv.company && inv.company.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <MainLayout title="Invitees & RSVPs">
      <div style={{ marginBottom: 20 }}>
        <Link to={`/organizer/events/${eventId}`} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back to Event
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
            Event Guestlist Management
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 2 }}>
            {event?.title || 'Event Invitations'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Generate unique cryptographic tokens, send RSVP links, and track attendee status
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={handleExportCSV} icon={<Download size={15} />}>
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => setShowUploadModal(true)} icon={<UploadCloud size={15} />}>
            Upload CSV
          </Button>
          <Button variant="primary" onClick={() => setShowAddModal(true)} icon={<UserPlus size={15} />}>
            Add Invitee
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          marginBottom: 20,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by name, email, or organization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 42, backgroundColor: '#FFFFFF' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {['all', 'pending', 'yes', 'maybe', 'no', 'waitlist', 'checked-in'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Invitees Table */}
      {loading ? (
        <LoadingSkeleton height={60} count={5} />
      ) : filteredInvites.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No invitees found"
          description={
            search
              ? `No invitees match "${search}".`
              : "No invitees have been added yet. Add guests manually or upload a CSV list."
          }
          actionText="+ Add First Invitee"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Attendee Name</th>
                <th>Email &amp; Phone</th>
                <th>Role &amp; Company</th>
                <th>RSVP Status</th>
                <th>Guests</th>
                <th>Unique RSVP Token</th>
                <th>QR Pass</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvites.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.name}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem' }}>{inv.email}</div>
                    {inv.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.phone}</div>}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {inv.role || 'Invitee'}
                      {inv.company && ` • ${inv.company}`}
                    </div>
                  </td>
                  <td>
                    <Badge variant={inv.status === 'yes' ? 'going' : inv.status === 'no' ? 'not-going' : inv.status === 'maybe' ? 'maybe' : inv.status === 'waitlist' ? 'waitlist' : inv.status === 'checked-in' ? 'checked-in' : 'draft'}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem' }}>
                      {inv.plusOnesCount || 0} / {inv.plusOnesAllowed || 0} max
                    </span>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4 }}>
                      {inv.token.slice(0, 10)}...
                    </code>
                  </td>
                  <td>
                    <button
                      onClick={() => setActiveQRInvite(inv)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      <QrCode size={13} /> View QR
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        onClick={() => handleCopyRSVPLink(inv)}
                        className="btn btn-secondary btn-sm"
                        title="Copy direct RSVP URL"
                        style={{ padding: '5px 10px' }}
                      >
                        {copiedToken === inv.token ? <Check size={14} color="var(--success-solid)" /> : <Copy size={14} />}
                        <span style={{ marginLeft: 4 }}>Link</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Invitee Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Single Invitee"
      >
        <form onSubmit={handleAddSingleInvite}>
          <Input
            label="Full Name *"
            placeholder="e.g. Aarav Sharma"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            required
          />
          <Input
            label="Email Address *"
            type="email"
            placeholder="aarav.sharma@example.com"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
            />
            <Input
              label="Allowed +1 Guests"
              type="number"
              min="0"
              max="5"
              value={addPlusOnes}
              onChange={(e) => setAddPlusOnes(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Designation / Role"
              placeholder="e.g. Lead Architect"
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
            />
            <Input
              label="Company / Affiliation"
              placeholder="e.g. TechCorp"
              value={addCompany}
              onChange={(e) => setAddCompany(e.target.value)}
            />
          </div>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={adding}>
              Generate Secure Token &amp; Invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Import Invitees via CSV"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Paste comma-separated values or import from your spreadsheet. Columns supported: <code>name</code>, <code>email</code>, <code>phone</code>, <code>role</code>, <code>company</code>, <code>plusOnesAllowed</code>.
          </p>

          <textarea
            className="form-textarea"
            rows={7}
            placeholder={`name,email,role,company,plusOnesAllowed\nAarav Sharma,aarav@example.com,Student,IIT,1\nPriya Patel,priya@example.com,Engineer,Google,0`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button type="button" variant="secondary" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleCSVUpload} loading={uploading}>
              Import Invitees
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Inspection Modal */}
      {activeQRInvite && (
        <Modal
          isOpen={!!activeQRInvite}
          onClose={() => setActiveQRInvite(null)}
          title={`RSVP QR Pass: ${activeQRInvite.name}`}
        >
          <div style={{ textAlign: 'center' }}>
            <QRCodeCard
              url={`${window.location.origin}/rsvp?e=${eventId}&t=${activeQRInvite.token}`}
              title={activeQRInvite.name}
              subtitle={activeQRInvite.email}
              downloadFileName={`${activeQRInvite.name.toLowerCase().replace(/\s+/g, '-')}-rsvp-qr.png`}
            />
          </div>
        </Modal>
      )}
    </MainLayout>
  );
};
