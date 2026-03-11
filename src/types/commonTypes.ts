export type IntentSpec = {
  slots: string[];
  style: string[];
  vibe: string[];
  colors: string[];
  materials: string[];
  constraints: {
    must_include: string[];
    avoid: string[];
    season?: string | undefined;
  };
};
