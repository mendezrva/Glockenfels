/** Heimfall: a setup screen (how many duchies, which ones, who rules them), then the game. */
import { useState } from 'react';
import { DUCHIES, type DuchyId } from '@glockenfels/kingdoms';
import { Game } from './Game';
import { loadSave, useKingdoms, writeSave, type SavedKingdoms, type Seat } from './session';

interface SetupSeat extends Seat { duchy: DuchyId }
interface Setup { count: number; seats: SetupSeat[] }

const SETUP_KEY = 'glockenfels.kingdoms.setup.v2';
const NAMES = ['You', 'Abt Ulrich', 'Jägerin Vroni', 'Bauer Sepp', 'Steiger Hans', 'Weberin Lene'];
const freshSetup = (): Setup => ({ count: 4, seats: DUCHIES.map((d, i) => ({ name: NAMES[i], bot: i > 0, duchy: d.id })) });
function loadSetup(): Setup {
  try {
    const s = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null') as Setup | null;
    if (s && s.seats?.length === DUCHIES.length && s.count >= 2 && s.count <= 6) return s;
  } catch { /* ignore */ }
  return freshSetup();
}

function Running({ saved, onQuit }: { saved: SavedKingdoms; onQuit: () => void }) {
  const game = useKingdoms(saved);
  return <Game game={game} onQuit={onQuit} />;
}

export default function App() {
  const [saved, setSaved] = useState<SavedKingdoms | null>(() => (new URLSearchParams(location.search).has('resume') ? loadSave() : null));
  const [setup, setSetup] = useState<Setup>(loadSetup);
  const resumable = loadSave();
  if (saved) return <Running key={saved.seed} saved={saved} onQuit={() => setSaved(null)} />;

  const seats = setup.seats.slice(0, setup.count);
  const start = () => {
    try { localStorage.setItem(SETUP_KEY, JSON.stringify(setup)); } catch { /* ignore */ }
    const seed = (Math.random() * 2 ** 31) >>> 0;
    const s: SavedKingdoms = {
      v: 1, seed, first: seed % setup.count, log: [],
      seats: seats.map(({ name, bot }) => ({ name, bot })), duchies: seats.map((x) => x.duchy),
    };
    writeSave(s);
    setSaved(s);
  };
  const set = (i: number, p: Partial<SetupSeat>) => setSetup((o) => ({ ...o, seats: o.seats.map((x, j) => (j === i ? { ...x, ...p } : x)) }));
  // Picking a duchy someone else holds swaps the two, so every seat keeps a different duchy.
  const pick = (i: number, duchy: DuchyId) => setSetup((o) => {
    const j = o.seats.findIndex((x) => x.duchy === duchy);
    return { ...o, seats: o.seats.map((x, k) => (k === i ? { ...x, duchy } : k === j ? { ...x, duchy: o.seats[i].duchy } : x)) };
  });

  return (
    <div className="k-setup">
      <div className="k-setup-card">
        <div className="rauten" />
        <h1>Heimfall</h1>
        <p className="k-sub">The Duke of Bavaria-Glockenfels is dead and leaves no son. By the law of his house, his land falls home to his cousins. Build, bargain and outwit them before the Emperor makes his award.</p>
        <div className="k-count">
          <span>Lines of the house</span>
          <div className="seg" role="group" aria-label="Number of duchies">
            {[2, 3, 4, 5, 6].map((n) => (
              <button key={n} type="button" aria-pressed={setup.count === n} onClick={() => setSetup((o) => ({ ...o, count: n }))}>{n}</button>
            ))}
          </div>
        </div>
        <div className="k-duchies">
          {seats.map((seat, i) => {
            const d = DUCHIES.find((x) => x.id === seat.duchy)!;
            return (
              <div key={i} className="k-duchy" style={{ '--pc': d.colour } as React.CSSProperties}>
                <div className="k-duchy-head">
                  <span className="dot" />
                  <select aria-label={`Seat ${i + 1} duchy`} value={seat.duchy} onChange={(e) => pick(i, e.target.value as DuchyId)}>
                    {DUCHIES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  <em>{d.theme}</em>
                </div>
                <p>{d.power}</p>
                <div className="k-duchy-row">
                  <input aria-label={`${d.name} ruler name`} value={seat.name} maxLength={18} onChange={(e) => set(i, { name: e.target.value })} />
                  <div className="seg">
                    <button type="button" aria-pressed={!seat.bot} onClick={() => set(i, { bot: false })}>Person</button>
                    <button type="button" aria-pressed={seat.bot} onClick={() => set(i, { bot: true })}>Bot</button>
                  </div>
                </div>
              </div>
            );
          })}
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
