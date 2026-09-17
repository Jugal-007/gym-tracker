import { supabase } from "./supabase";
import { loadSessions, saveSessions } from "@/components/gym/storage";
import { loadTemplates, saveTemplates } from "@/components/gym/templates";
import type { Session, Template } from "@/components/gym/types";

export const LAST_SYNCED_KEY = "gym-tracker-last-synced-at";

export async function syncUp() {
  const { data: authData } = await supabase.auth.getSession();
  const user = authData.session?.user;
  
  if (!user) return; // Not logged in, skip sync

  const sessions = loadSessions();
  const templates = loadTemplates();

  // Push Sessions to Supabase
  if (sessions.length > 0) {
    const sessionsPayload = sessions.map(s => ({
      id: s.id,
      user_id: user.id,
      started_at: s.startedAt,
      ended_at: s.endedAt,
      exercises: s.exercises,
      template_id: s.templateId,
      template_name: s.templateName,
      updated_at: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date(s.startedAt).toISOString(),
    }));

    await supabase.from("sessions").upsert(sessionsPayload, { onConflict: "id" });
  }

  // Push Templates to Supabase
  if (templates.length > 0) {
    const templatesPayload = templates.map(t => ({
      id: t.id,
      user_id: user.id,
      name: t.name,
      exercises: t.exercises,
      created_at: t.createdAt,
      updated_at: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date(t.createdAt).toISOString(),
    }));

    await supabase.from("templates").upsert(templatesPayload, { onConflict: "id" });
  }
}

export async function syncDown() {
  const { data: authData } = await supabase.auth.getSession();
  const user = authData.session?.user;
  
  if (!user) return;

  const [sessionsRes, templatesRes] = await Promise.all([
    supabase.from("sessions").select("*"),
    supabase.from("templates").select("*")
  ]);

  let synced = false;

  if (sessionsRes.data && sessionsRes.data.length > 0) {
    const localSessions = loadSessions();
    const localMap = new Map(localSessions.map(s => [s.id, s]));

    for (const row of sessionsRes.data) {
      const cloudSession: Session = {
        id: row.id,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        exercises: row.exercises,
        templateId: row.template_id,
        templateName: row.template_name,
        updatedAt: new Date(row.updated_at).getTime(),
      };

      const local = localMap.get(cloudSession.id);
      // Cloud wins if it's newer, or if we don't have it locally
      if (!local || (cloudSession.updatedAt && local.updatedAt && cloudSession.updatedAt > local.updatedAt) || (!local.updatedAt)) {
        localMap.set(cloudSession.id, cloudSession);
        synced = true;
      }
    }
    if (synced) saveSessions(Array.from(localMap.values()).sort((a, b) => b.startedAt - a.startedAt));
  }

  if (templatesRes.data && templatesRes.data.length > 0) {
    const localTemplates = loadTemplates();
    const localMap = new Map(localTemplates.map(t => [t.id, t]));

    for (const row of templatesRes.data) {
      const cloudTemplate: Template = {
        id: row.id,
        name: row.name,
        exercises: row.exercises,
        createdAt: row.created_at,
        updatedAt: new Date(row.updated_at).getTime(),
      };

      const local = localMap.get(cloudTemplate.id);
      if (!local || (cloudTemplate.updatedAt && local.updatedAt && cloudTemplate.updatedAt > local.updatedAt) || (!local.updatedAt)) {
        localMap.set(cloudTemplate.id, cloudTemplate);
        synced = true;
      }
    }
    if (synced) saveTemplates(Array.from(localMap.values()).sort((a, b) => b.createdAt - a.createdAt));
  }

  if (synced) {
    localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
    window.dispatchEvent(new Event("gym-sync-complete"));
  }
}
