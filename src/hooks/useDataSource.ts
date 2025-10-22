import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export type DataSource = "csv" | "firestore";

const DEFAULT_SOURCE: DataSource = "firestore";

export function useDataSource(): DataSource {
  const [source, setSource] = useState<DataSource>(DEFAULT_SOURCE);

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search).get("source");
    if (qp === "csv") {
      setSource("csv");
    }
    if (qp === "fs" || qp === "firestore") {
      setSource("firestore");
    }

    const unsub = onSnapshot(doc(db, "admin", "config"), (snap) => {
      const raw = (snap.data()?.dataSource as string | undefined)?.toLowerCase();
      if (raw === "csv") {
        setSource("csv");
      } else {
        setSource("firestore");
      }
    });

    return () => unsub();
  }, []);

  return source;
}
