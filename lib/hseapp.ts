import got, {HTTPError} from 'got'
import {DateTime} from 'luxon'
import {ERROR, ExpectedError} from './errors'

type City = string

interface Location {
  type: 'Point'
  coordinates: [number, number]
  _id: string
}
interface Person {
  id: string
  email: string
  full_name: string
  description: string
}
interface StreamLink {
  link: string
  description: unknown | null
}

interface Lesson {
  id: string
  building: string | null
  type: string
  stream: string
  auditorium_id: number
  auditorium: string
  date_start: string
  date_end: string
  created_at: string
  updated_at: string
  importance_level: number
  building_id: number | null
  city: City
  location: Location | null
  discipline: string
  discipline_link: string
  lesson_number_start: number
  lesson_number_end: number
  duration: number[]
  note: unknown | null
  stream_links: null | StreamLink[]
  lecturer_emails: string[]
  hash: string
  consultation: unknown | null
  lecturer_profiles: Person[]
  lecturer_profile: Person
}

type TimetableResponse = Lesson[]

function toISOString(date: Date | DateTime) {
  if (date instanceof Date) {
    return DateTime.fromJSDate(date).toISODate()
  }
  return date.toISODate()
}

export const getTimetable = async (email: string, startDate: Date | DateTime, endDate: Date| DateTime) => {
  const start = Date.now()
  const startDateISOString = toISOString(startDate)
  const endDateISOString = toISOString(endDate)
  const url = `https://api.hseapp.ru/v3/ruz/lessons?email=${email}&start=${startDateISOString}&end=${endDateISOString}`
  return got.get<TimetableResponse>(url, {
    headers: {
      'Accept-Language': 'ru-RU, ru;q=0.9, en-US;q=0.8, en;q=0.7',
    },
    responseType: 'json',
  }).then((v) => {
    console.log(`getTimetable took ${Date.now() - start}ms, ${url}`)
    return v.body
  }).catch((error) => {
    if (error instanceof HTTPError) {
      console.log(error.response.statusCode, error.response.body)
      if (error.response.statusCode === 400) {
        throw new ExpectedError(ERROR.BAD_REQUEST)
      }
    }
    throw error
  })
}
