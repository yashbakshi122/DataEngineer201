import { db } from '../firebase/config';
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { type Invitee } from '../types';

export const generateSecureToken = (): string => {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const inviteService = {
  // ── Create a single invite ────────────────────────────────────────────────
  async createInvite(
    eventId: string,
    inviteData: {
      name: string;
      email: string;
      phone?: string;
      role?: string;
      company?: string;
      plusOnesAllowed?: number;
    }
  ): Promise<Invitee> {
    const inviteRef = doc(collection(db, `events_invites/${eventId}/invites`));
    const token = generateSecureToken();
    const newInvite: Invitee = {
      id: inviteRef.id,
      eventId,
      name: inviteData.name.trim(),
      email: inviteData.email.trim().toLowerCase(),
      phone: inviteData.phone?.trim() || '',
      role: inviteData.role?.trim() || 'Invitee',
      company: inviteData.company?.trim() || '',
      token,
      status: 'pending',
      plusOnesAllowed: inviteData.plusOnesAllowed ?? 0,
      plusOnesCount: 0,
      createdAt: new Date().toISOString(),
    };
    await setDoc(inviteRef, newInvite);
    await setDoc(doc(db, 'email_invites', inviteRef.id), {
      inviteId: inviteRef.id,
      eventId,
      email: newInvite.email,
      name: newInvite.name,
      token: newInvite.token,
      status: newInvite.status,
      plusOnesAllowed: newInvite.plusOnesAllowed,
      plusOnesCount: 0,
      createdAt: newInvite.createdAt,
    });
    return newInvite;
  },

  // ── Batch-create invites ──────────────────────────────────────────────────
  async createBatchInvites(
    eventId: string,
    invites: Array<{
      name: string;
      email: string;
      phone?: string;
      role?: string;
      company?: string;
      plusOnesAllowed?: number;
    }>
  ): Promise<Invitee[]> {
    const results: Invitee[] = [];
    for (const item of invites) {
      results.push(await this.createInvite(eventId, item));
    }
    return results;
  },

  // ── Real-time listener for all invites on one event (organizer) ───────────
  subscribeEventInvites(eventId: string, callback: (invites: Invitee[]) => void): () => void {
    const invitesRef = collection(db, `events_invites/${eventId}/invites`);
    return onSnapshot(
      invitesRef,
      (snapshot) => {
        const list: Invitee[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Invitee, 'id'>) }));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (err) => { console.warn('[inviteService] subscribeEventInvites:', err); callback([]); }
    );
  },

  // ── Real-time listener for ALL invites for one attendee (by email) ────────
  // Uses a collectionGroup query across /events_invites/{*}/invites subcollections.
  subscribeMyInvites(userEmail: string, callback: (invites: Invitee[]) => void): () => void {
    const email = userEmail.toLowerCase();
    const merged = new Map<string, Invitee>();
    const emit = () => {
      const list = Array.from(merged.values());
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    };

    const unsubEmail = onSnapshot(
      query(collection(db, 'email_invites'), where('email', '==', email)),
      (snapshot) => {
        snapshot.forEach((d) => {
          const data = d.data() as Omit<Invitee, 'id'> & { inviteId?: string };
          merged.set(data.inviteId || d.id, { id: data.inviteId || d.id, ...data });
        });
        emit();
      },
      (err) => console.warn('[inviteService] email_invites:', err)
    );

    const unsubGroup = onSnapshot(
      query(collectionGroup(db, 'invites'), where('email', '==', email)),
      (snapshot) => {
        snapshot.forEach((d) => {
          merged.set(d.id, { id: d.id, ...(d.data() as Omit<Invitee, 'id'>) });
        });
        emit();
      },
      (err) => console.warn('[inviteService] collectionGroup invites (index may be building):', err)
    );

    getDocs(query(collection(db, 'events'), where('status', 'in', ['published', 'completed'])))
      .then(async (eventSnap) => {
        for (const ev of eventSnap.docs) {
          const found = await this.getInviteByEmail(ev.id, email);
          if (found?.id) merged.set(found.id, found);
        }
        emit();
      })
      .catch(() => {});

    return () => {
      unsubEmail();
      unsubGroup();
    };
  },

  // ── Look up invite by secure token ────────────────────────────────────────
  async getInviteByToken(eventId: string, token: string): Promise<Invitee | null> {
    const q = query(
      collection(db, `events_invites/${eventId}/invites`),
      where('token', '==', token)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as Omit<Invitee, 'id'>) };
  },

  // ── Look up invite by attendee email (for logged-in user flow) ────────────
  async getInviteByEmail(eventId: string, email: string): Promise<Invitee | null> {
    const q = query(
      collection(db, `events_invites/${eventId}/invites`),
      where('email', '==', email.toLowerCase())
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as Omit<Invitee, 'id'>) };
  },

  // ── CSV export ────────────────────────────────────────────────────────────
  exportInvitesToCSV(invites: Invitee[], eventTitle: string): void {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Company', 'Status',
      'Plus Ones Allowed', 'Plus Ones Used', 'RSVP Link'];
    const rows = invites.map((inv) => [
      `"${inv.name.replace(/"/g, '""')}"`,
      `"${inv.email.replace(/"/g, '""')}"`,
      `"${(inv.phone || '').replace(/"/g, '""')}"`,
      `"${(inv.role || '').replace(/"/g, '""')}"`,
      `"${(inv.company || '').replace(/"/g, '""')}"`,
      `"${inv.status}"`,
      inv.plusOnesAllowed,
      inv.plusOnesCount || 0,
      `"${window.location.origin}/rsvp?e=${inv.eventId}&t=${inv.token}"`,
    ]);
    const csv = 'data:text/csv;charset=utf-8,'
      + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `${eventTitle.toLowerCase().replace(/\s+/g, '-')}-invitees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // ── CSV parse ─────────────────────────────────────────────────────────────
  parseCSV(csvText: string): Array<{
    name: string; email: string; phone?: string;
    role?: string; company?: string; plusOnesAllowed?: number;
  }> {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
    const idx = (terms: string[]) => headers.findIndex((h) => terms.some((t) => h.includes(t)));
    const nameIdx    = idx(['name']);
    const emailIdx   = idx(['email']);
    const phoneIdx   = idx(['phone', 'mobile']);
    const roleIdx    = idx(['role', 'title']);
    const companyIdx = idx(['company', 'org']);
    const plusIdx    = idx(['plus', 'guest']);
    if (nameIdx === -1 || emailIdx === -1)
      throw new Error('CSV must contain at least "name" and "email" columns');
    const parsed: ReturnType<typeof this.parseCSV> = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((v) => v.trim().replace(/^"(.*)"$/, '$1'));
      if (row[nameIdx] && row[emailIdx]) {
        parsed.push({
          name:           row[nameIdx],
          email:          row[emailIdx],
          phone:          phoneIdx   !== -1 ? row[phoneIdx]   : undefined,
          role:           roleIdx    !== -1 ? row[roleIdx]    : undefined,
          company:        companyIdx !== -1 ? row[companyIdx] : undefined,
          plusOnesAllowed: plusIdx   !== -1 && !isNaN(Number(row[plusIdx]))
                            ? Number(row[plusIdx]) : 0,
        });
      }
    }
    return parsed;
  },
};
