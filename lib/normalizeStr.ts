export const normalizeStr = (str: string): string => {
  if (!str || typeof str !== "string") return "";
  return str.replace(/\s+/g, " ").trim();
};
