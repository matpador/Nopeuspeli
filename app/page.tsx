
"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";

type Score = {
  player_name: string;
  points: number;
};

export default function Home() {
  const [scores, setScores] = useState<Score[]>([]);
  const [name, setName] = useState("");
  const [points, setPoints] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");

  async function loadScores() {
    const { data, error } = await supabase
      .from("top10")
      .select("*")
      .order("points", { ascending: false });

    if (!error && data) setScores(data);
  }

  useEffect(() => {
    setSiteUrl(window.location.origin);
    loadScores();

    const channel = supabase
      .channel("public-score-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scores",
        },
        () => loadScores()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function submitScore(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const cleanName = name.trim();
    const value = Number(points);

    if (
      cleanName.length < 2 ||
      cleanName.length > 30 ||
      !Number.isSafeInteger(value) ||
      value < 0
    ) {
      setMessage("Tarkista nimi ja pistemäärä.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("scores").insert({
      player_name: cleanName,
      points: value,
      status: "pending",
    });

    setLoading(false);

    if (error) {
      setMessage("Tuloksen lähetys epäonnistui. Yritä uudelleen.");
      return;
    }

    setName("");
    setPoints("");
    setMessage("🏆 Tuloksesi on lähetetty ylläpitäjän hyväksyttäväksi!");
  }

  return (
    <main className="page">
      <header className="hero">
        <div className="hero-label">NOPEUSPELISSÄ NOPEIN VOITTAA</div>
        <h1>SPEDEN SPELIT</h1>
        <h2>NOPEUSPELI</h2>
        <p>Testaa nopeutesi ja ota paikkasi TOP 10 -listalla!</p>
      </header>

      <div className="container">
        <section className="panel">
          <div className="section-label">🏆 PARHAAT PELAAJAT</div>
          <h2 className="section-title">TOP 10</h2>

          {scores.length === 0 ? (
            <p className="empty">
              Ensimmäisiä tuloksia odotetaan!
            </p>
          ) : (
            <div className="score-list">
              {scores.map((score, index) => (
                <div
                  className={`score-row ${index === 0 ? "first" : ""}`}
                  key={score.player_name}
                >
                  <span className="rank">
                    {index === 0 ? "🥇" :
                     index === 1 ? "🥈" :
                     index === 2 ? "🥉" : `${index + 1}.`}
                  </span>
                  <span className="player">{score.player_name}</span>
                  <strong>{score.points} p</strong>
                </div>
              ))}
            </div>
          )}

          <p className="small-note">
            Listalla näkyvät vain ylläpitäjän hyväksymät parhaat tulokset.
          </p>
        </section>

        <section className="panel form-panel" id="ilmoita">
          <div className="section-label">🎮 OLETKO PELANNUT?</div>
          <h2 className="section-title">ILMOITA TULOKSESI</h2>
          <p className="description">
            Kirjoita nimesi ja pelissä saavuttamasi pistemäärä.
          </p>

          <form onSubmit={submitScore}>
            <label htmlFor="player">Pelaajan nimi</label>
            <input
              id="player"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kirjoita nimesi"
              minLength={2}
              maxLength={30}
              required
            />

            <label htmlFor="points">Pisteet</label>
            <input
              id="points"
              type="number"
              min="0"
              step="1"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Esim. 25"
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "LÄHETETÄÄN..." : "LÄHETÄ TULOS"}
            </button>
          </form>

          {message && (
            <div className="message" role="status">
              {message}
            </div>
          )}

          <p className="small-note">
            Tulos tulee julkiseksi vasta ylläpitäjän hyväksynnän jälkeen.
          </p>
        </section>

        <section className="qr-panel">
          <h2>SKANNAA JA ILMOITA</h2>
          <p>Avaa tuloksen ilmoittaminen puhelimellasi.</p>
          {siteUrl && (
            <div className="qr-code">
              <QRCodeSVG
                value={`${siteUrl}/#ilmoita`}
                size={190}
                level="H"
              />
            </div>
          )}
          <p className="qr-caption">
            Skannaa QR-koodi kamerallasi!
          </p>
        </section>

        <footer>
          SPEDEN SPELIT · NOPEUSPELI
          <a href="/admin">Ylläpito</a>
        </footer>
      </div>
    </main>
  );
}
