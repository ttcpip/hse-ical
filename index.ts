import ical, { ICalEventData } from "ical-generator";
import http from "node:http";
import { DateTime } from "luxon";
import { config } from "./core/config";
import { errorHandler } from "./lib/errors";
import { getTimetable } from "./lib/hseapp";
import { normalizeStr } from "./lib/normalizeStr";
import dedent from "dedent";

interface IExtra {
  /** Exclude only matched lessons by `exclude` RegExp */
  exclude?: string;
  /** Include only matched lessons by `exclude` RegExp */
  include?: string;
}
interface ICreateCalendarParams {
  email: string;
  extra?: IExtra;
}

async function createCalendar(params: ICreateCalendarParams) {
  const extra = params.extra;
  if (extra?.include && extra?.exclude)
    throw new Error(`include and exclude can't exist together`);

  const email = params.email;
  const idParams = extra?.exclude
    ? "exclude"
    : extra?.include
    ? "include"
    : "all";
  const calendar = ical({
    name: `HSE · ${email} · ${idParams}`,
  });
  const filename = `${params.email}_${idParams}.ics`;
  const start = DateTime.now().startOf("week");

  const lessons = await getTimetable(
    email,
    start,
    start.plus({ weeks: config.WEEKS_TO_PULL || 2 })
  );

  const excludeRegExp = extra?.exclude ? new RegExp(extra?.exclude, "i") : null;
  const includeRegExp = extra?.include ? new RegExp(extra?.include, "i") : null;

  for (const lesson of lessons) {
    const lecturer = lesson.lecturer_profiles?.find((p) => p) || {};

    const summary = normalizeStr(`${lesson.discipline} · ${lesson.type}`);
    const description = normalizeStr(
      dedent`
        ${lecturer.full_name || "no_name"} ${lecturer.email || "no_email"} ${
        lecturer.description || ""
      }
        Link: ${lesson.discipline_link || "no_link"}
      `
    );

    const data: ICalEventData = { summary, description };

    if (lesson.date_start) data.start = new Date(lesson.date_start);
    if (lesson.date_end) data.end = new Date(lesson.date_end);
    if (lesson.auditorium) {
      data.location = { title: normalizeStr(lesson.auditorium) };
      const [lon, lat] = lesson.location?.coordinates || [0, 0];
      if (lon && lat) data.location.geo = { lon, lat };
    }

    if (excludeRegExp) {
      // if match then skip this lesson
      const isMatch = excludeRegExp.test(summary);
      if (isMatch) continue;
    }
    if (includeRegExp) {
      // if not match then skip this lesson
      const isMatch = includeRegExp.test(summary);
      if (!isMatch) continue;
    }

    calendar.createEvent(data);
  }

  return { calendar, filename };
}

const allowedEmails = new Set(config.ALLOWED_EMAILS);
http
  .createServer(async (req, res) => {
    const ip =
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress;

    console.log(`New request from ${ip}:`, req.url);
    const parsedUrl = new URL(req.url || "/", `http://${req.headers.host}`);

    const params: ICreateCalendarParams = {
      email: parsedUrl.searchParams.get("email") || "",
      extra:
        parsedUrl.searchParams.get("extra") &&
        JSON.parse(
          Buffer.from(
            parsedUrl.searchParams.get("extra") || "",
            "base64url"
          ).toString("utf8")
        ),
    };

    if (!(params.email && allowedEmails.has(params.email))) {
      res.writeHead(403);
      return res.end("FORBIDDEN");
    }

    try {
      const { calendar, filename } = await createCalendar(params);
      return calendar.serve(res, filename);
    } catch (err) {
      errorHandler(res)(err);
    }
  })
  .listen(config.PORT, () => {
    console.log(`Server running at http://127.0.0.1:${config.PORT}/`);
  });
