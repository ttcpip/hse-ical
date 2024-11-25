import LruCache from "lru-cache";
import { TimetableResponse } from "./types";

export const timetableCache = new LruCache<string, TimetableResponse>({
  maxAge: 1000 * 60 * 10, // 10minutes
  max: 10,
});
