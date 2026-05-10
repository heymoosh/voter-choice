export interface CanonicalIssue {
  id: string;
  label: string;
  labelEs: string;
  keywords: string[];
}

export const CANONICAL_ISSUES: CanonicalIssue[] = [
  {
    id: "economy",
    label: "Economy & Jobs",
    labelEs: "Economía y Empleos",
    keywords: [
      "economy",
      "jobs",
      "unemployment",
      "wages",
      "inflation",
      "cost of living",
      "taxes",
      "budget",
    ],
  },
  {
    id: "healthcare",
    label: "Healthcare",
    labelEs: "Salud",
    keywords: [
      "healthcare",
      "health care",
      "insurance",
      "medicaid",
      "medicare",
      "aca",
      "affordable care",
      "prescription",
      "mental health",
    ],
  },
  {
    id: "education",
    label: "Education",
    labelEs: "Educación",
    keywords: [
      "education",
      "schools",
      "teachers",
      "college",
      "student loans",
      "curriculum",
      "school choice",
      "public school",
    ],
  },
  {
    id: "climate",
    label: "Climate & Environment",
    labelEs: "Clima y Medio Ambiente",
    keywords: [
      "climate",
      "environment",
      "clean energy",
      "pollution",
      "carbon",
      "emissions",
      "green",
      "fossil fuels",
      "renewable",
    ],
  },
  {
    id: "immigration",
    label: "Immigration",
    labelEs: "Inmigración",
    keywords: [
      "immigration",
      "border",
      "asylum",
      "undocumented",
      "visa",
      "citizenship",
      "deportation",
      "daca",
    ],
  },
  {
    id: "public-safety",
    label: "Public Safety & Policing",
    labelEs: "Seguridad Pública y Policía",
    keywords: [
      "crime",
      "police",
      "public safety",
      "law enforcement",
      "gun",
      "violence",
      "prison",
      "criminal justice",
    ],
  },
  {
    id: "housing",
    label: "Housing & Homelessness",
    labelEs: "Vivienda y Personas sin Hogar",
    keywords: [
      "housing",
      "rent",
      "homeless",
      "affordable housing",
      "zoning",
      "eviction",
      "mortgage",
    ],
  },
  {
    id: "reproductive-rights",
    label: "Reproductive Rights",
    labelEs: "Derechos Reproductivos",
    keywords: [
      "abortion",
      "reproductive",
      "roe",
      "planned parenthood",
      "contraception",
      "ivf",
    ],
  },
  {
    id: "voting-rights",
    label: "Voting Rights & Democracy",
    labelEs: "Derechos de Voto y Democracia",
    keywords: [
      "voting",
      "election",
      "democracy",
      "gerrymandering",
      "voter id",
      "registration",
      "electoral",
    ],
  },
  {
    id: "civil-rights",
    label: "Civil Rights & Equality",
    labelEs: "Derechos Civiles e Igualdad",
    keywords: [
      "civil rights",
      "equality",
      "discrimination",
      "lgbtq",
      "race",
      "gender",
      "disability",
    ],
  },
];

export function mapKeywordsToIssues(text: string): CanonicalIssue[] {
  const lower = text.toLowerCase();
  return CANONICAL_ISSUES.filter((issue) =>
    issue.keywords.some((kw) => lower.includes(kw)),
  );
}
