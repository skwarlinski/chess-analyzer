import { useEffect, useRef, useState } from "react";

export function useStockfish(fen) {
  const workerRef = useRef(null);
  const [evaluation, setEvaluation] = useState(0);
  const [bestMoves, setBestMoves] = useState([]);
  const [depth, setDepth] = useState(0);
  const accRef = useRef({});

  useEffect(() => {
    const workerCode = `importScripts('${window.location.origin}${window.location.pathname.replace(/\/$/, '')}/stockfish.js');`;
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    worker.onmessage = (e) => {
      const line = e.data;
      if (typeof line !== "string") return;

      if (line.startsWith("info depth")) {
        const depthMatch = line.match(/depth (\d+)/);
        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
        const pvMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
        const multipvMatch = line.match(/multipv (\d+)/);

        if (!depthMatch || !scoreMatch || !pvMatch) return;

        const d = parseInt(depthMatch[1]);
        const scoreType = scoreMatch[1];
        const scoreVal = parseInt(scoreMatch[2]);
        const move = pvMatch[1];
        const mpv = multipvMatch ? parseInt(multipvMatch[1]) : 1;

        let score;
        if (scoreType === "mate") {
          score = scoreVal > 0 ? 99 : -99;
        } else {
          score = parseFloat((scoreVal / 100).toFixed(2));
        }

        accRef.current[mpv] = { move, score };

        if (d >= 8) {
          setDepth(d);
          if (mpv === 1) setEvaluation(score);
          const sorted = Object.entries(accRef.current)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([, v]) => v);
          setBestMoves(sorted);
        }
      }
    };

    worker.postMessage("uci");
    worker.postMessage("setoption name MultiPV value 3");
    worker.postMessage("isready");
    workerRef.current = worker;

    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    accRef.current = {};
    setBestMoves([]);
    setDepth(0);
    worker.postMessage("stop");
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage("go depth 12");
  }, [fen]);

  return { evaluation, bestMoves, depth };
}