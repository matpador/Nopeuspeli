
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Score = {
  id: string;
  player_name: string;
  points: number;
  created_at: string;
};

const ADMIN_EMAIL = "ikuriarcadenopeuspeli@gmail.com";

export default function Admin() {
  const [user, setUser] = useState("");
  const [scores, setScores] = useState<Score[]>([]);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  async function loadScores() {
    const { data: auth } = await supabase.auth.getUser();

    if (
      !auth.user ||
      auth.user.email?.toLowerCase() !== ADMIN_EMAIL
    ) {
      setUser("");
      setScores([]);
      setChecking(false);
      return;
    }

    setUser(auth.user.email);

    const { data, error } = await supabase
      .from("scores")
      .select("id, player_name, points, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setMessage("Tulosten lataaminen epäonnistui.");
    } else {
      setScores(data || []);
    }

    setChecking(false);
  }

  useEffect(() => {
    loadScores();

    const { data: listener } =
      supabase.auth.onAuthStateChange(() => {
        setTimeout(loadScores, 0);
      });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      setMessage("Väärä ylläpitäjän sähköpostiosoite.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: ADMIN_EMAIL,
      options: {
        emailRedirectTo: window.location.origin + "/admin",
      },
    });

    setMessage(
      error
        ? "Kirjautumislinkin lähetys epäonnistui."
        : "Kirjautumislinkki lähetetty sähköpostiisi. Tarkista sähköpostisi!"
    );

    setBusy(false);
  }

  async function decide(
    id: string,
    status: "approved" | "rejected"
  ) {
    setBusy(true);
    setMessage("");

    const { error } = await supabase
      .from("scores")
      .update({ status })
      .eq("id", id)
      .eq("status", "pending");

    if (error) {
      setMessage("Tuloksen käsittely epäonnistui.");
    } else {
      setMessage(
        status === "approved"
          ? "Tulos hyväksytty!"
          : "Tulos hylätty!"
      );
      await loadScores();
    }

    setBusy(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser("");
    setScores([]);
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-[#111] text-white flex items-center justify-center">
        Tarkistetaan kirjautumista...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#111] text-white flex items-center justify-center p-5">
        <form
          onSubmit={login}
          className="bg-[#222] p-8 rounded-2xl w-full max-w-md space-y-5"
        >
          <h1 className="text-3xl font-black text-yellow-400">
            YLLÄPITO
          </h1>

          <p className="text-gray-400">
            Kirjaudu sisään hallitaksesi pelaajien tuloksia.
          </p>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#333] p-4 rounded-xl"
            required
          />

          <button
            disabled={busy}
            className="w-full bg-yellow-500 text-black font-black p-4 rounded-xl"
          >
            {busy ? "LÄHETETÄÄN..." : "LÄHETÄ KIRJAUTUMISLINKKI"}
          </button>

          {message && (
            <p className="text-yellow-300">{message}</p>
          )}

          <a href="/" className="block text-center text-gray-400">
            ← Takaisin etusivulle
          </a>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111] text-white p-5 md:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-wrap justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-yellow-400">
              TULOSTEN HALLINTA
            </h1>
            <p className="text-gray-400">{user}</p>
          </div>

          <button
            onClick={logout}
            className="bg-gray-700 px-5 py-3 rounded-xl"
          >
            Kirjaudu ulos
          </button>
        </header>

        <section className="bg-[#222] rounded-2xl p-5">
          <h2 className="text-xl font-bold mb-5">
            ODOTTAVAT TULOKSET ({scores.length})
          </h2>

          {scores.length === 0 && (
            <p className="text-gray-400">
              Ei odottavia tuloksia.
            </p>
          )}

          {scores.map((score) => (
            <div
              key={score.id}
              className="border-b border-gray-700 py-5 space-y-3"
            >
              <div>
                <p className="font-bold text-xl">
                  {score.player_name}
                </p>
                <p className="text-yellow-400 font-black text-2xl">
                  {score.points} pistettä
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(score.created_at).toLocaleString("fi-FI")}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  disabled={busy}
                  onClick={() => decide(score.id, "approved")}
                  className="flex-1 bg-green-700 p-3 rounded-xl font-bold disabled:opacity-50"
                >
                  ✓ HYVÄKSY
                </button>

                <button
                  disabled={busy}
                  onClick={() => decide(score.id, "rejected")}
                  className="flex-1 bg-red-700 p-3 rounded-xl font-bold disabled:opacity-50"
                >
                  ✕ HYLKÄÄ
                </button>
              </div>
            </div>
          ))}
        </section>

        {message && (
          <p className="text-yellow-300 mt-5">{message}</p>
        )}

        <a href="/" className="block text-gray-400 mt-8">
          ← Takaisin tulostauluun
        </a>
      </div>
    </main>
  );
}
