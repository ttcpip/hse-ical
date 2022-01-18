export const config = {
  emails: (process.env.EMAILS || '').split(','),
  port: Number(process.env.PORT),
}
