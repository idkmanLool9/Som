import type { SubjectGrades } from '../logic/grades';

export type GradesStackParamList = {
  GradesList: undefined;
  SubjectDetail: { subject: SubjectGrades };
};

export type RootTabParamList = {
  Cijfers: undefined;
  Berekenen: undefined;
  Huiswerk: undefined;
  Account: undefined;
};
