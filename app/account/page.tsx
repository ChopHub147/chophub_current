"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CustomerProfile = {
  name: string;
  username: string | null;
  phone: string;
  email: string | null;
  avatar_url: string | null;
};

export default function AccountPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = async () => {
    const response = await fetch("/api/customers/profile", { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json() as { profile?: CustomerProfile };
    return data.profile ?? null;
  };

  useEffect(() => {
    let cancelled = false;
    loadProfile().then((value) => {
      if (cancelled) return;
      if (value) {
        setProfile(value);
        setName(value.name || "");
        setUsername(value.username || "");
      }
      setProfileLoading(false);
    }).catch(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/customers/login" : "/api/customers/signup";
      const body = mode === "login" ? { identifier, password } : { name, username, phone, email, password };
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({})) as { error?: string; welcomeEmailSent?: boolean };
      if (!response.ok) { setError(result.error || "Something went wrong. Please try again."); return; }
      const signedInProfile = await loadProfile();
      if (!signedInProfile) { setError("You signed in, but we couldn’t load your profile. Please apply the customer account database update and try again."); return; }
      setProfile(signedInProfile);
      setName(signedInProfile.name || "");
      setUsername(signedInProfile.username || "");
      setPhone(signedInProfile.phone || "");
      setEmail(signedInProfile.email || "");
      setMessage(mode === "signup" ? (result.welcomeEmailSent ? "Your account is ready. A welcome message has been sent to your email." : "Your account is ready, but the welcome email could not be sent. Please check the email settings.") : "You’re signed in.");
    } catch {
      setError("We couldn’t reach ChopHub. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/customers/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, username }) });
      const result = await response.json().catch(() => ({})) as { error?: string; profile?: CustomerProfile };
      if (!response.ok || !result.profile) { setError(result.error || "Could not save your profile."); return; }
      setProfile({ ...profile!, ...result.profile });
      setMessage("Profile saved.");
    } catch {
      setError("We couldn’t save your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setMessage("");
    setPhotoLoading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/customers/avatar", { method: "POST", body: form });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setError(result.error || "Could not upload your photo."); return; }
      const updated = await loadProfile();
      if (updated) setProfile(updated);
      setMessage("Profile photo updated.");
    } catch {
      setError("We couldn’t upload your photo. Please try again.");
    } finally {
      setPhotoLoading(false);
    }
  };

  if (profileLoading) {
    return <main className="min-h-screen bg-[#fffefe] px-5 py-10 pb-24 text-[#10231b] sm:px-8"><div className="mx-auto max-w-md text-sm text-[#53625d]">Loading your account…</div></main>;
  }

  if (profile) {
    return (
      <main className="min-h-screen bg-[#fffefe] px-5 py-10 pb-24 text-[#10231b] sm:px-8">
        <div className="mx-auto max-w-md">
          <Link href="/" className="text-sm font-semibold text-[#07833f]">← Back to Home</Link>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Your Profile</h1>
          <div className="mt-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="Your profile" className="h-20 w-20 rounded-full border border-green-100 object-cover" /> : <div aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-3xl text-green-700">{(profile.name || "C").slice(0, 1).toUpperCase()}</div>}
              <div>
                <label htmlFor="profile-photo" className="inline-flex cursor-pointer rounded-full border border-green-700 px-4 py-2 text-sm font-semibold text-green-800">{photoLoading ? "Uploading…" : profile.avatar_url ? "Change photo" : "Add profile photo"}</label>
                <input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={photoLoading} className="sr-only" />
                <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP, up to 5 MB</p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="mt-6 flex flex-col gap-3">
              <label className="text-sm font-medium">Full name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-black/10 px-4 py-3 text-sm" /></label>
              <label className="text-sm font-medium">Username<input required minLength={3} maxLength={24} pattern="(?=.*[A-Za-z])[A-Za-z0-9_.-]{3,24}" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. ada_12" className="mt-1 w-full rounded-lg border border-black/10 px-4 py-3 text-sm" /><span className="mt-1 block text-xs text-gray-500">Use 3–24 letters, numbers, dots, underscores, or hyphens; include at least one letter.</span></label>
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-900"><p>Phone: {profile.phone}</p><p className="mt-1">Email: {profile.email || "Not set"}</p></div>
              {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
              {message && <p role="status" className="text-sm font-semibold text-green-700">{message}</p>}
              <button type="submit" disabled={loading} className="mt-2 rounded-full bg-[#07833f] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{loading ? "Saving…" : "Save profile"}</button>
            </form>
            <Link href="/orders" className="mt-4 inline-flex text-sm font-semibold text-[#07833f]">View order history and rate purchased meals →</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffefe] px-5 py-10 pb-24 text-[#10231b] sm:px-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm font-semibold text-[#07833f]">← Back to Home</Link>
        <h1 className="mt-4 text-3xl font-black tracking-tight">{mode === "login" ? "Sign In" : "Create Account"}</h1>
        <div className="mt-4 flex gap-2 text-sm font-semibold">
          <button type="button" onClick={() => { setMode("login"); setError(""); }} className={`rounded-full px-4 py-2 ${mode === "login" ? "bg-[#07833f] text-white" : "bg-[#f0f9f1] text-[#244438]"}`}>Sign In</button>
          <button type="button" onClick={() => { setMode("signup"); setError(""); }} className={`rounded-full px-4 py-2 ${mode === "signup" ? "bg-[#07833f] text-white" : "bg-[#f0f9f1] text-[#244438]"}`}>Sign Up</button>
        </div>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          {mode === "signup" ? <>
            <input required placeholder="Full name" value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-black/10 px-4 py-3 text-sm" />
            <input required minLength={3} maxLength={24} pattern="(?=.*[A-Za-z])[A-Za-z0-9_.-]{3,24}" placeholder="Username (3–24 characters)" value={username} onChange={(event) => setUsername(event.target.value)} className="rounded-lg border border-black/10 px-4 py-3 text-sm" />
            <input required type="tel" placeholder="Phone number" value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-lg border border-black/10 px-4 py-3 text-sm" />
            <input required type="email" placeholder="Email address (for your welcome message)" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-lg border border-black/10 px-4 py-3 text-sm" />
          </> : <input required autoComplete="username" placeholder="Username, email, or phone number" value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="rounded-lg border border-black/10 px-4 py-3 text-sm" />}
          <input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-lg border border-black/10 px-4 py-3 text-sm" />
          {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="mt-2 rounded-full bg-[#07833f] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}</button>
        </form>
      </div>
    </main>
  );
}
