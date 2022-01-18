import 'dotenv/config'
import './utils/checkDotenv'
import ical from 'ical-generator'
import http from 'node:http'
import {DateTime} from 'luxon'
import {config} from './core/config'

import {errorHandler} from './lib/errors'
import {getTimetable} from './lib/hseapp'

async function updateEvents(email: string) {
  const calendar = ical({name: `Расписание · ${email}`})
  const start = DateTime.now().startOf('week')
  const lessons = await getTimetable(email, start, start.plus({weeks: 2}))
  for (const lesson of lessons) {
    calendar.createEvent({
      start: new Date(lesson.date_start),
      end: new Date(lesson.date_end),
      summary: `${lesson.discipline} · ${lesson.type} · ${lesson.lecturer_profile?.full_name}`,
      ...lesson.building && {
        location: {
          title: lesson.building,
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
  return calendar
}

http.createServer(async (req, res) => {
  const email = config.email
  return updateEvents(email)
    .then((calendar) => calendar.serve(res, `${email}.ics`))
    .catch(errorHandler(res))
})
  .listen(3000, () => {
    console.log('Server running at http://127.0.0.1:3000/')
  })

void (async () => {
})()
