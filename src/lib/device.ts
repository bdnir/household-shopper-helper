const KEY = "fg.device_id";
const MEMBER_KEY = "fg.member";

export type ActiveMember = {
  groupId: string;
  memberId: string;
  groupName: string;
  name: string;
  isAdmin: boolean;
};

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getActiveMember(): ActiveMember | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(MEMBER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setActiveMember(m: ActiveMember | null) {
  if (typeof window === "undefined") return;
  if (m) localStorage.setItem(MEMBER_KEY, JSON.stringify(m));
  else localStorage.removeItem(MEMBER_KEY);
}