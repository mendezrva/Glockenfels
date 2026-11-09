/** Tiny Kingdoms: a setup screen (who rules which duchy), then the game. */
import { useState } from 'react';
import { DUCHIES } from '@glockenfels/kingdoms';
import { Game } from './Game';
import { duchyCss } from './colors';
import { loadSave, useKingdoms, writeSave, type SavedKingdoms, type Seat } from './session';

const SEATS_KEY = 'glockenfels.kingdoms.seats.v1';
function loadSeats(): Seat[] {
  try {
    const s = JSON.parse(localStorage.getItem(SEATS_KEY) ?? 'null') as Seat[] | null;
    if (s && s.length === 4) return s;
  } catch { /* ignore */ }
  return [{ name: 'You', bot: false }, { name: 'Abt Ulrich', bot: true }, { name: 'Jägerin Vroni', bot: true }, { name: 'Bauer Sepp', bot: true }];
}

function Running({ saved, onQuit }: { saved: SavedKingdoms; onQuit: () => void }) {
  const game = useKingdoms(saved);
  return <Game game={game} onQuit={onQuit} />;
}

export default function App() {
  const [saved, setSaved] = useState<SavedKingdoms | null>(() => (new URLSearchParams(location.search).has('resume') ? loadSave() : null));
  const [seats, setSeats] = useState<Seat[]>(loadSeats);
  const resumable = loadSave();
  if (saved) return <Running key={saved.seed} saved={saved} onQuit={() => setSaved(null)} />;

  const start = () => {
    try { localStorage.setItem(SEATS_KEY, JSON.stringify(seats)); } catch { /* ignore */ }
    const seed = (Math.random() * 2 ** 31) >>> 0;
    const s: SavedKingdoms = { v: 1, seed, first: seed % 4, seats, log: [] };
    writeSave(s);
    setSaved(s);
  };
  const set = (i: number, p: Partial<Seat>) => setSeats((o) => o.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <div className="k-setup">
      <div className="k-setup-card">
        <div className="rauten" />
        <h1>Tiny Kingdoms</h1>
        <p className="k-sub">A Glockenfels game of four rival duchies, a fractured Markt, and the choice between reaching out and building at home.</p>
        <div className="k-duchies">
          {DUCHIES.map((d, i) => (
            <div key={d.id} className="k-duchy" style={{ '--pc': duchyCss(i) } as React.CSSProperties}>
              <div className="k-duchy-head"><span className="dot" /><b>{d.name}</b><em>{d.theme}</em></div>
              <p>{d.power}</p>
              <div className="k-duchy-row">
                <input aria-label={`${d.name} ruler name`} value={seats[i].name} maxLength={18} onChange={(e) => set(i, { name: e.target.value })} />
                <div className="seg">
                  <button type="button" aria-pressed={!seats[i].bot} onClick={() => set(i, { bot: false })}>Person</button>
                  <button type="button" aria-pressed={seats[i].bot} onClick={() => set(i, { bot: true })}>Bot</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="panel-row">
          {resumable && resumable.log.length > 0 && <button type="button" onClick={() => setSaved(resumable)}>Resume game</button>}
          <button type="button" className="primary wide" onClick={start}>Start</button>
        </div>
        <p className="note">Pass and play on one device. Seats marked Bot are played by the balanced bot from the simulator.</p>
      </div>
    </div>
  );
}
