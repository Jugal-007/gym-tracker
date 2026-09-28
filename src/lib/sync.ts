import { supabase } from "./supabase";
import { loadSessions, saveSessions } from "@/components/gym/storage";
import { loadTemplates, saveTemplates } from "@/components/gym/templates";
import type { Session, Template } from "@/components/gym/types";

export const LAST_SYNCED_KEY = "gym-tracker-last-synced-at";

/**
 * syncUp — Safe, non-destructive cloud synchronization using upsert.
 * Only uploads existing items to Supabase without blindly wiping cloud data.
 */
export async function syncUp() {
  const { data: authData } = await supabase.auth.getSession();
  const user = authData.session?.user;
  if (!user) return;

  const sessions = loadSessions();
  const templates = loadTemplates();

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
    const { error: sessionErr } = await supabase.from("sessions").upsert(sessionsPayload, { onConflict: "id" });
    if (sessionErr) console.error("Error syncing sessions up:", sessionErr);
  }

  if (templates.length > 0) {
    const templatesPayload = templates.map((t) => ({
      id: t.id,
      user_id: user.id,
      name: t.name,
      exercises: t.exercises,
      created_at: typeof t.createdAt === "number" ? t.createdAt : Number(t.createdAt) || Date.now(),
      updated_at: t.updatedAt
        ? new Date(t.updatedAt).toISOString()
        : new Date(t.createdAt).toISOString(),
    }));
    const { error: templateErr } = await supabase.from("templates").upsert(templatesPayload, { onConflict: "id" });
    if (templateErr) console.error("Error syncing templates up:", templateErr);
  }

  localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
}

/** Explicitly delete a single session from cloud */
export async function syncDeleteSession(sessionId: string) {
  const { data: authData } = await supabase.auth.getSession();
  const user = authData.session?.user;
  if (!user) return;
  await supabase.from("sessions").delete().eq("id", sessionId).eq("user_id", user.id);
}

/** Explicitly delete a single template from cloud */
export async function syncDeleteTemplate(templateId: string) {
  const { data: authData } = await supabase.auth.getSession();
  const user = authData.session?.user;
  if (!user) return;
  await supabase.from("templates").delete().eq("id", templateId).eq("user_id", user.id);
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

  if (sessionsRes.error) console.error("Error fetching sessions from cloud:", sessionsRes.error);
  if (templatesRes.error) console.error("Error fetching templates from cloud:", templatesRes.error);

  let synced = false;

  if (sessionsRes.data && sessionsRes.data.length > 0) {
    const localSessions = loadSessions();
    const localIds = new Set(localSessions.map((s) => s.id));

    const toAdd: Session[] = sessionsRes.data
      .filter((row) => !localIds.has(row.id))
      .map((row) => ({
        id: row.id,
        startedAt: typeof row.started_at === "number" ? row.started_at : Number(row.started_at) || Date.now(),
        endedAt: row.ended_at ? (typeof row.ended_at === "number" ? row.ended_at : Number(row.ended_at)) : null,
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
        createdAt: typeof row.created_at === "number" ? row.created_at : Number(row.created_at) || Date.now(),
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
