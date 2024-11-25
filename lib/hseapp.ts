import got, { HTTPError } from "got";
import { DateTime } from "luxon";
import { ERROR, ExpectedError } from "./errors";
import { name, version } from "../package.json";
import { timetableCache } from "./timetableCache";
import { TimetableResponse } from "./types";

function toISOString(date: Date | DateTime) {
  if (date instanceof Date) {
    return DateTime.fromJSDate(date).toISODate();
  }
  return date.toISODate();
}

export const getTimetable = async (
  email: string,
  startDate: Date | DateTime,
  endDate: Date | DateTime
) => {
  const cached = timetableCache.get(email);
  if (cached) {
    console.log(email, "returned from cache");
    return cached;
  }

  const start = Date.now();
  const startDateISOString = toISOString(startDate);
  const endDateISOString = toISOString(endDate);
  const url = `https://api.hseapp.ru/v3/ruz/lessons?email=${email}&start=${startDateISOString}&end=${endDateISOString}`;

  const resp = await got
    .get<TimetableResponse>(url, {
      headers: {
        "Accept-Language": "ru-RU, ru;q=0.9, en-US;q=0.8, en;q=0.7",
        "User-Agent": `${name}@${version}`,
      },
      responseType: "json",
    })
    .catch((err: Error) => ({ err }));
  console.log(`getTimetable took ${Date.now() - start}ms, ${url}`);

  if ("err" in resp) {
    const err = resp.err;
    if (err instanceof HTTPError) {
      console.error(err.response.statusCode, err.response.body);
      if (err.response.statusCode === 400) {
        throw new ExpectedError(ERROR.BAD_REQUEST);
      }
    }
    throw err;
  }

  const lessons = resp.body;
  timetableCache.set(email, lessons);
  return lessons;
};
