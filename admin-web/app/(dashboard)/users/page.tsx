"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

type Role = { name: string; display_name: string; description: string };
type Profile = { id: string; email: string; display_name: string; app_user_roles: { role_name: string }[] };

export default function UsersPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [canManageSeniorAdmins, setCanManageSeniorAdmins] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const supabase = getSupabase();
    const [{ data: permission }, { data: seniorPermission }, { data: roleRows }, { data: profiles, error }] = await Promise.all([
      supabase.rpc("has_permission", { requested: "users.manage" }),
      supabase.rpc("has_permission", { requested: "roles.manage" }),
      supabase.from("app_roles").select("name,display_name,description").order("display_name"),
      supabase.from("profiles").select("id,email,display_name,app_user_roles(role_name)").order("created_at", { ascending: false }),
    ]);
    setCanManage(Boolean(permission)); setCanManageSeniorAdmins(Boolean(seniorPermission)); setRoles((roleRows ?? []) as Role[]);
    if (error) setMessage(error.message); else setUsers((profiles ?? []) as Profile[]);
  };
  useEffect(() => { void load(); }, []);

  const toggle = async (user: Profile, role: string, checked: boolean) => {
    const current = user.app_user_roles.map((r) => r.role_name).filter((r) => r !== "reader");
    const next = checked ? [...new Set([...current, role])] : current.filter((r) => r !== role);
    setBusy(user.id); setMessage(null);
    const { error } = await getSupabase().rpc("set_user_roles", { target_user: user.id, requested_roles: next });
    if (error) setMessage(error.message); else { setMessage(`Roles updated for ${user.email}.`); await load(); }
    setBusy(null);
  };

  return <div>
    <div className="page-head"><div><h1>Users &amp; roles</h1><p className="sub">Accounts may have multiple roles. Changes are enforced by database policies and appear in the user&apos;s mobile account.</p></div></div>
    {message && <div className="notice">{message}</div>}
    {!canManage ? <div className="card"><p>You do not have permission to manage users.</p></div> :
      <div className="card" style={{ overflowX: "auto" }}><table><thead><tr><th>User</th>{roles.map(r=><th key={r.name} title={r.description}>{r.display_name}</th>)}</tr></thead>
      <tbody>{users.map(user=><tr key={user.id}><td><strong>{user.display_name || user.email}</strong><div className="sub">{user.email}</div></td>{roles.map(role=>{
        const checked=role.name==="reader" || user.app_user_roles.some(r=>r.role_name===role.name);
        const seniorRestricted = role.name === "super_admin" && !canManageSeniorAdmins;
        return <td key={role.name} style={{textAlign:"center"}} title={seniorRestricted ? "Only a Super admin may change this role" : undefined}><input type="checkbox" checked={checked} disabled={role.name==="reader" || seniorRestricted || busy===user.id} onChange={e=>void toggle(user,role.name,e.target.checked)} aria-label={`${role.display_name} for ${user.email}`}/></td>;
      })}</tr>)}</tbody></table></div>}
  </div>;
}
