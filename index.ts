import ical, { ICalEventData } from "ical-generator";
import http from "node:http";
import { DateTime } from "luxon";
import { config } from "./core/config";
import { errorHandler } from "./lib/errors";
import { getTimetable } from "./lib/hseapp";
import { normalizeStr } from "./lib/normalizeStr";
import dedent from "dedent";

interface ICreateCalendarParams {
  email: string;
  /** Exclude only matched lessons by `exclude` RegExp */
  exclude?: string;
  /** Include only matched lessons by `exclude` RegExp */
  include?: string;
}

async function createCalendar(params: ICreateCalendarParams) {
  if (params.include && params.exclude)
    throw new Error(`include and exclude can't exist together`);

  const email = params.email;
  const calendar = ical({
    name: `HSE · ${email} · ${
      params.exclude ? "exclude" : params.include ? "include" : "all"
    }`,
  });
  const start = DateTime.now().startOf("week");

  const lessons = await getTimetable(
    email,
    start,
    start.plus({ weeks: config.WEEKS_TO_PULL || 2 })
  );

  const excludeRegExp = params.exclude ? new RegExp(params.exclude, "i") : null;
  const includeRegExp = params.include ? new RegExp(params.include, "i") : null;

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

  return calendar;
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
      exclude: parsedUrl.searchParams.get("exclude") || undefined,
      include: parsedUrl.searchParams.get("include") || undefined,
    };

    if (!(params.email && allowedEmails.has(params.email))) {
      res.writeHead(403);
      return res.end("FORBIDDEN");
    }

    try {
      const createdCalendar = await createCalendar(params);
      return createdCalendar.serve(res, `${params.email}.ics`);
    } catch (err) {
      errorHandler(res)(err);
    }
  })
  .listen(config.PORT, () => {
    console.log(`Server running at http://127.0.0.1:${config.PORT}/`);
  });
