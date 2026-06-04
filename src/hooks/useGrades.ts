import { useCallback, useEffect, useState } from 'react';
import { SomtodayClient } from '../api/client';
import { getResults, getStudentId, getStudents } from '../api/somtoday';
import type { Student } from '../api/types';
import {
  groupBySubject,
  normalizeResults,
  overallAverage,
  type SubjectGrades,
} from '../logic/grades';

interface GradesData {
  loading: boolean;
  error: string | null;
  student: Student | null;
  subjects: SubjectGrades[];
  overall: number | null;
  reload: () => void;
}

/** Laadt de leerling + alle cijfers en groepeert ze per vak. */
export function useGrades(client: SomtodayClient | null): GradesData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [subjects, setSubjects] = useState<SubjectGrades[]>([]);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    let me: Student | null = null;
    try {
      const students = await getStudents(client);
      me = students[0] ?? null;
      setStudent(me);
      const id = me ? getStudentId(me) : undefined;
      if (!id) {
        throw new Error('Geen leerling-id gevonden voor dit account.');
      }
      const raws = await getResults(client, id);
      setSubjects(groupBySubject(normalizeResults(raws)));
    } catch (e) {
      let msg = e instanceof Error ? e.message : 'Onbekende fout';
      // Tijdelijke diagnostiek: laat zien welke leerling-links + API-url er zijn,
      // zodat we het juiste resultaten-endpoint/id kunnen bepalen.
      if (me) {
        const links = (me.links ?? []).map((l) => `${l.rel}:${l.id}`).join(', ');
        msg += `\n\n[debug] apiUrl=${client.getSession().apiUrl}\nlinks=[${links}]`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    loading,
    error,
    student,
    subjects,
    overall: overallAverage(subjects),
    reload: () => void load(),
  };
}
