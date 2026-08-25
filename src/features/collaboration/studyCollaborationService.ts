import { supabase } from "@/src/auth/supabaseClient";
import { db } from "@/src/db/database";
import type { Study } from "@/src/services/studiesService";

export type WorkingCopy = {
  id: string;
  projectId: string | null;
  sourceStudyId: string | null;
  ownerId: string | null;
  title: string;
  subtitle: string;
  category: string;
  contentHtml: string;
  plainText: string;
  authorName: string;
  baseRevisionId: string | null;
  baseRevisionNumber: number;
  isOwner: number;
  dirty: number;
  submissionStatus: string | null;
  createdAt: number;
  updatedAt: number;
  syncState: "local" | "pending" | "synced" | "error";
};

export type ProjectSummary = {
  projectId: string;
  ownerId: string;
  isOwner: boolean;
  title: string;
  subtitle: string;
  category: string;
  revisionId: string;
  revisionNumber: number;
  publishedStudyId: string | null;
  updatedAt: string;
  pendingReviews: number;
  myContributionStatus: string | null;
};

export type ProjectDetail = {
  projectId: string;
  ownerId: string;
  ownerName: string;
  isOwner: boolean;
  publishedStudyId: string | null;
  publishedRevisionId: string | null;
  updatedAt: string;
  current: {
    id: string; number: number; title: string; subtitle: string; category: string;
    contentHtml: string; plainText: string; authorId: string; createdAt: string;
  };
  contributions: {
    id: string; authorId: string; authorName: string; status: string; message: string;
    reviewMessage: string; createdAt: string; baseRevisionId: string; proposedRevisionId: string;
  }[];
  history: { id: number; action: string; actorName: string; detail: string; createdAt: string }[];
};

export type ContributionDetail = {
  id: string;
  projectId: string;
  status: string;
  message: string;
  reviewMessage: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  canReview: boolean;
  isOutdated: boolean;
  base: RevisionContent;
  proposed: RevisionContent;
};

type RevisionContent = {
  id: string; number: number; title: string; subtitle: string; category: string;
  contentHtml: string; plainText: string;
};

type StartResult = {
  projectId: string; ownerId: string; isOwner: boolean; revisionId: string; revisionNumber: number;
  title: string; subtitle: string; category: string; contentHtml: string; plainText: string;
  publishedStudyId: string | null;
};

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function studyContentToEditorHtml(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return "<p></p>";
  if (/<\/?(?:p|h[1-6]|ul|ol|li|blockquote|div|section|article|br|a)\b/i.test(trimmed)) return trimmed;
  return trimmed.split(/\n{2,}/).map((block) => {
    const value = block.trim();
    if (value.startsWith("### ")) return `<h3>${escapeHtml(value.slice(4))}</h3>`;
    if (value.startsWith("## ")) return `<h2>${escapeHtml(value.slice(3))}</h2>`;
    return `<p>${escapeHtml(value).replace(/\n/g, "<br>")}</p>`;
  }).join("");
}

export function stripHtml(value: string) {
  return value
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function rpcError(error: { message?: string } | null, fallback: string) {
  if (!error) return;
  throw new Error(error.message || fallback);
}

export async function saveStudyToLibrary(study: Study, userId: string | null, displayName = "") {
  const existing = await db.getFirstAsync<WorkingCopy>(
    `SELECT * FROM study_working_copies WHERE sourceStudyId=? AND COALESCE(ownerId,'local')=COALESCE(?,'local') LIMIT 1`,
    [study.id, userId]
  );
  if (existing) return existing.id;
  const id = uuid();
  const now = Date.now();
  const html = studyContentToEditorHtml(study.content);
  const plain = stripHtml(html);
  await db.runAsync(
    `INSERT INTO study_working_copies
      (id,projectId,sourceStudyId,ownerId,title,subtitle,category,contentHtml,plainText,authorName,
       baseRevisionId,baseRevisionNumber,isOwner,dirty,submissionStatus,createdAt,updatedAt,syncState)
     VALUES (?,NULL,?,?,?,?,?,?,?,?,NULL,0,0,0,NULL,?,?,'local')`,
    [id, study.id, userId, study.title, study.subtitle || "", study.category || "Bible Study", html, plain,
      study.author || displayName, now, now]
  );
  if (userId) {
    try { await connectWorkingCopy(id, userId); } catch { /* The local copy remains usable offline. */ }
  }
  return id;
}

export async function listWorkingCopies(userId: string | null) {
  return db.getAllAsync<WorkingCopy>(
    `SELECT * FROM study_working_copies WHERE ownerId=? OR (ownerId IS NULL AND ? IS NULL) ORDER BY updatedAt DESC`,
    [userId, userId]
  );
}

export async function getWorkingCopy(id: string, userId: string | null) {
  return db.getFirstAsync<WorkingCopy>(
    `SELECT * FROM study_working_copies WHERE id=? AND (ownerId=? OR ownerId IS NULL) LIMIT 1`, [id, userId]
  );
}

export async function saveWorkingCopy(id: string, values: Pick<WorkingCopy,"title"|"subtitle"|"category"|"contentHtml"|"plainText">) {
  await db.runAsync(
    `UPDATE study_working_copies SET title=?,subtitle=?,category=?,contentHtml=?,plainText=?,dirty=1,
      updatedAt=?,syncState=CASE WHEN projectId IS NULL THEN 'local' ELSE 'pending' END WHERE id=?`,
    [values.title.trim() || "Untitled study", values.subtitle.trim(), values.category.trim() || "Bible Study",
      values.contentHtml || "<p></p>", values.plainText, Date.now(), id]
  );
}

export async function claimLocalCopies(userId: string) {
  const anonymous = await db.getAllAsync<WorkingCopy>(`SELECT * FROM study_working_copies WHERE ownerId IS NULL`);
  await db.withTransactionAsync(async () => {
    for (const copy of anonymous) {
      const duplicate = copy.sourceStudyId
        ? await db.getFirstAsync<{ id: string }>(`SELECT id FROM study_working_copies WHERE ownerId=? AND sourceStudyId=? LIMIT 1`, [userId, copy.sourceStudyId])
        : null;
      // Preserve both drafts. The anonymous duplicate becomes an independent local study.
      if (duplicate) await db.runAsync(`UPDATE study_working_copies SET ownerId=?,sourceStudyId=NULL WHERE id=?`, [userId, copy.id]);
      else await db.runAsync(`UPDATE study_working_copies SET ownerId=? WHERE id=?`, [userId, copy.id]);
    }
  });
}

export async function connectWorkingCopy(id: string, userId: string) {
  const copy = await getWorkingCopy(id, userId);
  if (!copy) throw new Error("Study copy not found");
  const { data, error } = await supabase.rpc("start_study_copy", {
    p_source_study_id: copy.sourceStudyId || "",
    p_title: copy.title, p_subtitle: copy.subtitle, p_category: copy.category,
    p_content_html: copy.contentHtml, p_plain_text: copy.plainText,
  });
  rpcError(error, "Could not connect this study");
  const result = data as StartResult;
  const keepLocalDraft = Boolean(copy.dirty);
  await db.runAsync(
    `UPDATE study_working_copies SET projectId=?,ownerId=?,baseRevisionId=?,baseRevisionNumber=?,isOwner=?,
      title=?,subtitle=?,category=?,contentHtml=?,plainText=?,syncState='synced',updatedAt=? WHERE id=?`,
    [result.projectId, userId, result.revisionId, result.revisionNumber, result.isOwner ? 1 : 0,
      keepLocalDraft ? copy.title : result.title, keepLocalDraft ? copy.subtitle : result.subtitle,
      keepLocalDraft ? copy.category : result.category, keepLocalDraft ? copy.contentHtml : result.contentHtml,
      keepLocalDraft ? copy.plainText : result.plainText, Date.now(), id]
  );
  return result;
}

export async function getMyProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await supabase.rpc("get_my_study_projects");
  rpcError(error, "Could not load study projects");
  return (data ?? []) as ProjectSummary[];
}

export async function getProject(projectId: string): Promise<ProjectDetail> {
  const { data, error } = await supabase.rpc("get_study_project", { p_project_id: projectId });
  rpcError(error, "Could not load the study project");
  return data as ProjectDetail;
}

export async function openProjectLocally(projectId: string, userId: string) {
  const existing = await db.getFirstAsync<WorkingCopy>(`SELECT * FROM study_working_copies WHERE projectId=? AND ownerId=?`, [projectId, userId]);
  if (existing) return existing.id;
  const project = await getProject(projectId);
  const id = uuid(); const now = Date.now();
  await db.runAsync(
    `INSERT INTO study_working_copies
      (id,projectId,sourceStudyId,ownerId,title,subtitle,category,contentHtml,plainText,authorName,baseRevisionId,
       baseRevisionNumber,isOwner,dirty,submissionStatus,createdAt,updatedAt,syncState)
     VALUES (?,?,NULL,?,?,?,?,?,?,?,?,?,?,0,NULL,?,?,'synced')`,
    [id, projectId, userId, project.current.title, project.current.subtitle, project.current.category,
      project.current.contentHtml, project.current.plainText, project.ownerName, project.current.id,
      project.current.number, project.isOwner ? 1 : 0, now, now]
  );
  return id;
}

export async function refreshWorkingCopy(id: string, userId: string) {
  const copy = await getWorkingCopy(id, userId);
  if (!copy?.projectId) return copy;
  const project = await getProject(copy.projectId);
  if (project.current.id === copy.baseRevisionId) return copy;
  if (copy.dirty) throw new Error("The original and your copy both changed. Send or discard your changes before updating");
  await db.runAsync(
    `UPDATE study_working_copies SET title=?,subtitle=?,category=?,contentHtml=?,plainText=?,baseRevisionId=?,
      baseRevisionNumber=?,submissionStatus=NULL,syncState='synced',updatedAt=? WHERE id=?`,
    [project.current.title, project.current.subtitle, project.current.category, project.current.contentHtml,
      project.current.plainText, project.current.id, project.current.number, Date.now(), id]
  );
  return getWorkingCopy(id, userId);
}

export async function reconcileWorkingCopy(id: string, project: ProjectDetail, userId: string) {
  const copy = await getWorkingCopy(id, userId);
  if (!copy || copy.isOwner) return copy;
  const mine = project.contributions.find((item) => item.authorId === userId);
  if (!mine) return copy;
  if (mine.status === "accepted" && !copy.dirty && project.current.plainText === copy.plainText) {
    await db.runAsync(`UPDATE study_working_copies SET baseRevisionId=?,baseRevisionNumber=?,submissionStatus='accepted',syncState='synced',updatedAt=? WHERE id=?`,
      [project.current.id, project.current.number, Date.now(), id]);
  } else {
    await db.runAsync(`UPDATE study_working_copies SET submissionStatus=?,updatedAt=? WHERE id=?`, [mine.status, Date.now(), id]);
  }
  return getWorkingCopy(id, userId);
}

export async function sendWorkingCopy(id: string, userId: string, message: string) {
  let copy = await getWorkingCopy(id, userId);
  if (!copy) throw new Error("Study copy not found");
  if (!copy.projectId || !copy.baseRevisionId) {
    await connectWorkingCopy(id, userId);
    copy = await getWorkingCopy(id, userId);
  }
  if (!copy?.projectId || !copy.baseRevisionId) throw new Error("This study is not connected yet");
  if (!copy.dirty) throw new Error("Make an improvement before sending");
  const params = {
    p_project_id: copy.projectId, p_base_revision_id: copy.baseRevisionId,
    p_title: copy.title, p_subtitle: copy.subtitle, p_category: copy.category,
    p_content_html: copy.contentHtml, p_plain_text: copy.plainText,
  };
  if (copy.isOwner) {
    const { data, error } = await supabase.rpc("save_owner_study_version", { ...params, p_summary: message });
    rpcError(error, "Could not save the official version");
    const result = data as { revisionId: string; revisionNumber: number };
    await db.runAsync(`UPDATE study_working_copies SET baseRevisionId=?,baseRevisionNumber=?,dirty=0,submissionStatus=NULL,syncState='synced',updatedAt=? WHERE id=?`,
      [result.revisionId, result.revisionNumber, Date.now(), id]);
    return { ownerSaved: true, ...result };
  }
  const { data, error } = await supabase.rpc("submit_study_contribution", { ...params, p_message: message });
  rpcError(error, "Could not send your improvements");
  const result = data as { contributionId: string; status: string };
  await db.runAsync(`UPDATE study_working_copies SET dirty=0,submissionStatus=?,syncState='synced',updatedAt=? WHERE id=?`,
    [result.status, Date.now(), id]);
  return { ownerSaved: false, ...result };
}

export async function getContribution(id: string): Promise<ContributionDetail> {
  const { data, error } = await supabase.rpc("get_study_contribution", { p_contribution_id: id });
  rpcError(error, "Could not load this contribution");
  return data as ContributionDetail;
}

export async function reviewContribution(id: string, decision: "accept"|"request_changes"|"decline", message: string) {
  const { data, error } = await supabase.rpc("review_study_contribution", {
    p_contribution_id: id, p_decision: decision, p_review_message: message,
  });
  rpcError(error, "Could not complete the review");
  const result = data as { status: string; revisionId?: string };
  if (result.status === "outdated") throw new Error("The official study changed after this contribution began. Ask the contributor to update and send it again");
  return result;
}

export async function publishProject(projectId: string) {
  const { data, error } = await supabase.rpc("publish_study_project", { p_project_id: projectId });
  rpcError(error, "Could not publish this study");
  return data as { studyId: string; revisionId: string; revisionNumber: number };
}

export type TextDiffLine = { type: "same"|"added"|"removed"; text: string };

export function diffText(before: string, after: string): TextDiffLine[] {
  const a = before.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const b = after.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const matrix = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) {
    matrix[i][j] = a[i] === b[j] ? matrix[i + 1][j + 1] + 1 : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
  }
  const lines: TextDiffLine[] = []; let i = 0; let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { lines.push({ type: "same", text: a[i] }); i += 1; j += 1; }
    else if (j < b.length && (i === a.length || matrix[i][j + 1] >= matrix[i + 1][j])) { lines.push({ type: "added", text: b[j] }); j += 1; }
    else { lines.push({ type: "removed", text: a[i] }); i += 1; }
  }
  return lines;
}
