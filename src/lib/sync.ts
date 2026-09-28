import { supabase } from "./supabase";
import { loadSessions, saveSessions } from "@/components/gym/storage";
import { loadTemplates, saveTemplates } from "@/components/gym/templates";
import type { Session, Template } from "@/components/gym/types";

export const LAST_SYNCED_KEY = "gym-tracker-last-synced-at";

/**
 * syncUp — "Local is truth". Replaces cloud data for this user with
 * exactly what's in local storage. Deletions are respected.
 */
export async function syncUp() {
  const { data: authData } = await supabase.auth.getSession();
  const user = authData.session?.user;
  if (!user) return;

  const sessions = loadSessions();
  const templates = loadTemplates();

  // Safeguard: Never wipe the cloud database if local storage is completely empty
  // (e.g. fresh device, unhydrated state, or cleared cache).
  if (sessions.length === 0 && templates.length === 0) {
    return;
  }

  // --- Sessions: delete all, then re-insert current local state ---
  await supabase.from("sessions").delete().eq("user_id", user.id);

  if (sessions.length > 0) {
    const sessionsPayload = sessions.map((s) => ({
      id: s.id,
      user_id: user.id,
      started_at: s.startedAt,
      ended_at: s.endedAt,
      exercises: s.exercises,
      template_id: s.templateId ?? null,
      template_name: s.templateName ?? null,
      updated_at: s.updatedAt
        ? new Date(s.updatedAt).toISOString()
        : new Date(s.startedAt).toISOString(),
    }));
    await supabase.from("sessions").insert(sessionsPayload);
  }

  // --- Templates: delete all, then re-insert ---
  await supabase.from("templates").delete().eq("user_id", user.id);

  if (templates.length > 0) {
    const templatesPayload = templates.map((t) => ({
      id: t.id,
      user_id: user.id,
      name: t.name,
      exercises: t.exercises,
      created_at: t.createdAt,
      updated_at: t.updatedAt
        ? new Date(t.updatedAt).toISOString()
        : new Date(t.createdAt).toISOString(),
    }));
    await supabase.from("templates").insert(templatesPayload);
  }

  localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
}

/**
 * syncDown — "Cloud fills gaps". Only adds cloud items whose IDs don't
 * exist locally. Never overwrites or deletes local data.
 * Used automatically on first login when local storage is empty.
 */
export async function syncDown() {
  const { data: authData } = await supabase.auth.getSession();
  const user = authData.session?.user;
  if (!user) return;

  const [sessionsRes, templatesRes] = await Promise.all([
    supabase.from("sessions").select("*"),
    supabase.from("templates").select("*"),
  ]);

  let synced = false;

  if (sessionsRes.data && sessionsRes.data.length > 0) {
    const localSessions = loadSessions();
    const localIds = new Set(localSessions.map((s) => s.id));

    const toAdd: Session[] = sessionsRes.data
      .filter((row) => !localIds.has(row.id))
      .map((row) => ({
        id: row.id,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        exercises: row.exercises,
        templateId: row.template_id ?? undefined,
        templateName: row.template_name ?? undefined,
        updatedAt: new Date(row.updated_at).getTime(),
      }));

    if (toAdd.length > 0) {
      saveSessions(
        [...localSessions, ...toAdd].sort((a, b) => b.startedAt - a.startedAt)
      );
      synced = true;
    }
  }

  if (templatesRes.data && templatesRes.data.length > 0) {
    const localTemplates = loadTemplates();
    const localIds = new Set(localTemplates.map((t) => t.id));

    const toAdd: Template[] = templatesRes.data
      .filter((row) => !localIds.has(row.id))
      .map((row) => ({
        id: row.id,
        name: row.name,
        exercises: row.exercises,
        createdAt: row.created_at,
        updatedAt: new Date(row.updated_at).getTime(),
      }));

    if (toAdd.length > 0) {
      saveTemplates(
        [...localTemplates, ...toAdd].sort((a, b) => b.createdAt - a.createdAt)
      );
      synced = true;
    }
  }

  if (synced) {
    localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
    window.dispatchEvent(new Event("gym-sync-complete"));
  }
}

/**
 * replaceLocalFromCloud — "Cloud is truth". Completely replaces local storage
 * with cloud data. Called only when user explicitly presses "Import from Cloud"
 * and confirms the warning.
 */
export async function replaceLocalFromCloud() {
  const { data: authData } = await supabase.auth.getSession();
  const user = authData.session?.user;
  if (!user) return;

  const [sessionsRes, templatesRes] = await Promise.all([
    supabase.from("sessions").select("*"),
    supabase.from("templates").select("*"),
  ]);

  if (sessionsRes.data) {
    const sessions: Session[] = sessionsRes.data.map((row) => ({
      id: row.id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      exercises: row.exercises,
      templateId: row.template_id ?? undefined,
      templateName: row.template_name ?? undefined,
      updatedAt: new Date(row.updated_at).getTime(),
    }));
    saveSessions(sessions.sort((a, b) => b.startedAt - a.startedAt));
  }

  if (templatesRes.data) {
    const templates: Template[] = templatesRes.data.map((row) => ({
      id: row.id,
      name: row.name,
      exercises: row.exercises,
      createdAt: row.created_at,
      updatedAt: new Date(row.updated_at).getTime(),
    }));
    saveTemplates(templates.sort((a, b) => b.createdAt - a.createdAt));
  }

  localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
  window.dispatchEvent(new Event("gym-sync-complete"));
}
