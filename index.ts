import 'dotenv/config'
import './utils/checkDotenv'
import ical, {ICalCalendar} from 'ical-generator'
import http from 'node:http'
import {DateTime} from 'luxon'
import {config} from './core/config'
import LruCache from 'lru-cache'

import {errorHandler} from './lib/errors'
import {getTimetable} from './lib/hseapp'

const cache = new LruCache<string, ICalCalendar>({
  maxAge: 1000 * 60 * 60, // 1h
  max: 10,
})

async function createCalendar(email: string) {
  const cached = cache.get(email)
  if (cached) {
    console.log(email, 'returned from cache')
    return cached
  }
  const calendar = ical({name: `HSE · ${email}`})
  const start = DateTime.now().startOf('week')
  const lessons = await getTimetable(email, start, start.plus({weeks: 2}))
  for (const lesson of lessons) {
    const lecturer = lesson.lecturer_profiles?.[0] || null
    
    calendar.createEvent({
      start: new Date(lesson.date_start),
      end: new Date(lesson.date_end),
      
      summary: `${lesson.discipline} · ${lesson.type}`,
      description: (`${!lecturer ? 'no_lecturer' : `${lecturer.full_name || 'no_name'} ${lecturer.email || 'no_email'}`}\n`
        + `Link: ${lesson.discipline_link || 'no_link'}`).trim(),
      ...lesson.auditorium && {
        location: {
          title: lesson.auditorium,
          ...lesson.location && {
            geo: {
              lat: lesson.location.coordinates[1],
              lon: lesson.location.coordinates[0],
            },
          }
        },
      },
      url: lesson.stream_links?.[0].link,
    })
  }
  cache.set(email, calendar)
  return calendar
}

http.createServer(async (req, res) => {
  const email = req.url && decodeURIComponent(req.url.slice(1)) || ''
  console.log(email)
  if (!config.emails.includes(email)) {
    res.writeHead(403)
    return res.end('FORBIDDEN')
  }
  return createCalendar(email)
    .then((calendar) => calendar.serve(res, `${email}.ics`))
    .catch(errorHandler(res))
})
  .listen(config.port, () => {
    console.log('Server running at http://127.0.0.1:3000/')
  })
