const RACE_CODE_RULES: Array<{ keywords: string[]; code: string }> = [
  { keywords: ["australia", "melbourne"], code: "AUS" },
  { keywords: ["china", "shanghai"], code: "CHN" },
  { keywords: ["japan", "suzuka"], code: "JPN" },
  { keywords: ["bahrain", "sakhir"], code: "BHR" },
  { keywords: ["saudi", "jeddah"], code: "SAU" },
  { keywords: ["usa", "united states", "miami", "vegas", "austin"], code: "USA" },
  { keywords: ["italy", "italia", "imola", "monza", "emilia"], code: "ITA" },
  { keywords: ["monaco", "monte carlo"], code: "MON" },
  { keywords: ["spain", "espana", "barcelona"], code: "ESP" },
  { keywords: ["canada", "montreal"], code: "CAN" },
  { keywords: ["austria", "spielberg"], code: "AUT" },
  { keywords: ["britain", "british", "silverstone", "uk"], code: "GBR" },
  { keywords: ["belgium", "spa"], code: "BEL" },
  { keywords: ["hungary", "hungarian", "budapest"], code: "HUN" },
  { keywords: ["netherlands", "dutch", "zandvoort"], code: "NED" },
  { keywords: ["azerbaijan", "baku"], code: "AZE" },
  { keywords: ["singapore", "marina bay"], code: "SGP" },
  { keywords: ["qatar", "lusail"], code: "QAT" },
  { keywords: ["mexico", "mexico city"], code: "MEX" },
  { keywords: ["brazil", "sao paulo", "interlagos"], code: "BRA" },
  { keywords: ["abu dhabi", "yas marina", "uae"], code: "UAE" },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getRaceShortCode(raceName: string) {
  const normalized = normalize(raceName);
  for (const rule of RACE_CODE_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.code;
    }
  }

  const words = normalized
    .split(" ")
    .filter((word) => !["gp", "grand", "prix", "race"].includes(word));
  const fallback = words.join("").slice(0, 3).toUpperCase();
  return fallback || "RCE";
}

