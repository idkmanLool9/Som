import { useCallback, useEffect, useState } from 'react';
import { SomtodayClient } from '../api/client';
import { getHomework } from '../api/somtoday';
import type { RawHomework } from '../api/types';

export interface HomeworkItem {
  id: string;
  subject: string;
  title: string;
  description: string;
  type: string;
  date: string | null; // yyyy-MM-dd
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function normalize(raw: RawHomework, index: number): HomeworkItem {
  const item = raw.studiewijzerItem ?? {};
  const rawDate = raw.datumTijd ?? raw.datum ?? null;
  return {
    id: String(index),
    subject: raw.vak?.afkorting ?? raw.vak?.naam ?? '',
    title: item.onderwerp ?? 'Huiswerk',
    description: item.omschrijving ?? '',
    type: item.huiswerkType ?? '',
    date: rawDate ? rawDate.slice(0, 10) : null,
  };
}

interface HomeworkData {
  loading: boolean;
  error: string | null;
  items: HomeworkItem[];
  reload: () => void;
}

/** Laadt huiswerk voor de komende `daysAhead` dagen. */
export function useHomework(client: SomtodayClient | null, daysAhead = 21): HomeworkData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<HomeworkItem[]>([]);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const end = new Date();
      end.setDate(end.getDate() + daysAhead);
      const raws = await getHomework(client, isoDate(today), isoDate(end));
      const normalized = raws.map(normalize).filter((h) => h.title || h.description);
      normalized.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
      setItems(normalized);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onbekende fout');
    } finally {
      setLoading(false);
    }
  }, [client, daysAhead]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, error, items, reload: () => void load() };
}
