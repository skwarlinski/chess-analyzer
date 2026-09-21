import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useStockfish } from "./hooks/useStockfish";

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([]);
  const [currentMove, setCurrentMove] = useState(-1);
  const [showArrow, setShowArrow] = useState(true);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});
  const [moveInput, setMoveInput] = useState("");
  const [moveError, setMoveError] = useState("");

  const fen = (() => {
    const tmp = new Chess();
    history.slice(0, currentMove + 1).forEach((m) => tmp.move(m));
    return tmp.fen();
  })();

  const { evaluation, bestMoves, depth } = useStockfish(fen);

  function getMoveOptions(square) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) return;
    const squares = {};
    moves.forEach((m) => {
      squares[m.to] = {
        background: game.get(m.to)
          ? "radial-gradient(circle, rgba(0,0,0,0.3) 85%, transparent 85%)"
          : "radial-gradient(circle, rgba(0,0,0,0.2) 30%, transparent 30%)",
        borderRadius: "50%",
      };
    });
    squares[square] = { background: "rgba(255, 255, 0, 0.3)" };
    setOptionSquares(squares);
    setSelectedSquare(square);
  }

  function onSquareClick(square) {
    if (currentMove !== history.length - 1 && history.length > 0) return;
    if (selectedSquare) {
      const tmp = new Chess(game.fen());
      const move = tmp.move({ from: selectedSquare, to: square, promotion: "q" });
      if (move) {
        setGame(tmp);
        setHistory((h) => [...h, move.san]);
        setCurrentMove((c) => c + 1);
        setSelectedSquare(null);
        setOptionSquares({});
        return;
      }
    }
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      getMoveOptions(square);
    } else {
      setSelectedSquare(null);
      setOptionSquares({});
    }
  }

  function goTo(index) {
    setCurrentMove(index);
    const tmp = new Chess();
    history.slice(0, index + 1).forEach((m) => tmp.move(m));
    setGame(tmp);
    setSelectedSquare(null);
    setOptionSquares({});
  }

  function reset() {
    setGame(new Chess());
    setHistory([]);
    setCurrentMove(-1);
    setSelectedSquare(null);
    setOptionSquares({});
    setMoveInput("");
    setMoveError("");
  }

  function loadMoves() {
    try {
      const tmp = new Chess();
      const raw = moveInput.trim();
      // usuń numery ruchów np. "1." "2." i symbole wyników
      const cleaned = raw
        .replace(/\d+\./g, "")
        .replace(/1-0|0-1|1\/2-1\/2|\*/g, "")
        .trim();
      const tokens = cleaned.split(/\s+/).filter(Boolean);
      if (tokens.length === 0) throw new Error();
      for (const token of tokens) {
        // usuń ikony figurek (chess.com wstawia unicode)
        const clean = token.replace(/[♔♕♖♗♘♙♚♛♜♝♞♟]/g, "");
        if (!clean) continue;
        const move = tmp.move(clean);
        if (!move) throw new Error(`Nieprawidłowy ruch: ${clean}`);
      }
      const moves = tmp.history();
      setHistory(moves);
      setGame(tmp);
      setCurrentMove(moves.length - 1);
      setSelectedSquare(null);
      setOptionSquares({});
      setMoveError("");
    } catch (e) {
      setMoveError(e.message || "Błąd — sprawdź ruchy.");
    }
  }

  const evalLabel = Math.abs(evaluation) >= 99
    ? evaluation > 0 ? "Mat!" : "-Mat!"
    : evaluation > 0 ? `+${evaluation}` : `${evaluation}`;

  const whitePercent = 50 + (Math.max(-10, Math.min(10, evaluation)) / 10) * 50;

  return (
    <div style={{ background: "#1a1a2e", minHeight: "100vh", color: "#e8e8e8", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
          ♟ Chess Analyzer
          <span style={{ fontSize: 12, color: "#888", background: "#252540", padding: "3px 10px", borderRadius: 20, marginLeft: "auto" }}>
            Głębokość {depth}
          </span>
        </h1>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 20, height: 480, background: "#1e1e1e", borderRadius: 3, overflow: "hidden", display: "flex", flexDirection: "column-reverse", border: "1px solid #333" }}>
              <div style={{ background: "#f0f0f0", width: "100%", height: `${whitePercent}%`, transition: "height 0.4s ease" }} />
            </div>
            <span style={{ fontSize: 11, color: "#aaa" }}>{evalLabel}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Chessboard
              position={fen}
              onSquareClick={onSquareClick}
              boardWidth={480}
              customSquareStyles={optionSquares}
              customDarkSquareStyle={{ backgroundColor: "#4a7c59" }}
              customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
              customArrows={showArrow && bestMoves[0] ? [[bestMoves[0].move.slice(0,2), bestMoves[0].move.slice(2,4), "rgba(0,200,100,0.8)"]] : []}
              arePiecesDraggable={false}
            />
            <div style={{ display: "flex", gap: 8 }}>
              {[["⏮", () => goTo(-1)], ["◀", () => goTo(Math.max(-1, currentMove - 1))], ["▶", () => goTo(Math.min(history.length - 1, currentMove + 1))], ["⏭", () => goTo(history.length - 1)]].map(([label, fn]) => (
                <button key={label} onClick={fn} style={{ background: "#252540", border: "1px solid #3a3a5c", color: "#ccc", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
                  {label}
                </button>
              ))}
              <button
                onClick={() => setShowArrow((v) => !v)}
                style={{ background: showArrow ? "#1a3a2a" : "#252540", border: `1px solid ${showArrow ? "#2a6a4a" : "#3a3a5c"}`, color: showArrow ? "#98c379" : "#666", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
              >
                {showArrow ? "Strzałka ON" : "Strzałka OFF"}
              </button>
              <button onClick={reset} style={{ marginLeft: "auto", background: "#3a2020", border: "1px solid #5a2a2a", color: "#e06c75", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
                ✕ Reset
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

            <div style={{ background: "#20203a", borderRadius: 8, padding: 16, border: "1px solid #2a2a4a" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.8px", color: "#666", marginBottom: 10 }}>Najlepsze ruchy</div>
              {bestMoves.length === 0 && <div style={{ color: "#555", fontSize: 13 }}>Analiza...</div>}
              {bestMoves.map((bm, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < bestMoves.length - 1 ? "1px solid #2a2a40" : "none" }}>
                  <span style={{ fontSize: 11, color: "#555", width: 14 }}>{i + 1}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 15, flex: 1 }}>{bm.move}</span>
                  <span style={{ fontSize: 13, color: bm.score > 0 ? "#98c379" : bm.score < 0 ? "#e06c75" : "#888" }}>
                    {bm.score > 0 ? "+" : ""}{bm.score}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ background: "#20203a", borderRadius: 8, padding: 16, border: "1px solid #2a2a4a" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.8px", color: "#666", marginBottom: 10 }}>Ruchy</div>
              <div style={{ maxHeight: 160, overflowY: "auto" }}>
                {history.length === 0 && <div style={{ color: "#555", fontSize: 13 }}>Brak ruchów</div>}
                {Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => (
                  <div key={i} style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
                    <span style={{ fontSize: 12, color: "#555", width: 24, textAlign: "right" }}>{i + 1}.</span>
                    {[0, 1].map((j) => {
                      const idx = i * 2 + j;
                      return history[idx] ? (
                        <span key={j} onClick={() => goTo(idx)}
                          style={{ padding: "2px 7px", borderRadius: 4, fontSize: 14, fontFamily: "monospace", cursor: "pointer", background: currentMove === idx ? "#3a3a6a" : "transparent", color: currentMove === idx ? "#fff" : "#ccc" }}>
                          {history[idx]}
                        </span>
                      ) : null;
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#20203a", borderRadius: 8, padding: 16, border: "1px solid #2a2a4a" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.8px", color: "#666", marginBottom: 10 }}>Wczytaj ruchy</div>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>
                Wpisz ruchy z ekranu, np: <span style={{ color: "#888", fontFamily: "monospace" }}>e4 e5 Nf3 Nc6 Bc4</span>
              </div>
              <textarea
                placeholder="e4 e5 Nf3 Nc6 Bc4 h6 O-O Nf6 d4 d6 d5 Ne7"
                value={moveInput}
                onChange={(e) => setMoveInput(e.target.value)}
                rows={4}
                style={{ width: "100%", background: "#16162a", border: "1px solid #3a3a5c", borderRadius: 6, color: "#ccc", fontSize: 13, fontFamily: "monospace", padding: 8, resize: "vertical", outline: "none", marginBottom: 8, boxSizing: "border-box" }}
              />
              {moveError && <div style={{ fontSize: 12, color: "#e06c75", marginBottom: 8 }}>{moveError}</div>}
              <button
                onClick={loadMoves}
                style={{ width: "100%", padding: 9, background: "#3a3a7a", border: "none", borderRadius: 6, color: "#e8e8e8", fontSize: 14, cursor: "pointer" }}
              >
                Załaduj i analizuj
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}