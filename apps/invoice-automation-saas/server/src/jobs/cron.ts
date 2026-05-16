import cron from 'node-cron'

export interface CronRegistration {
  name: string
  expression: string
  task: () => void | Promise<void>
}

const registrations: CronRegistration[] = []
let activeTasks: cron.ScheduledTask[] = []

export const registerCronSchedule = (registration: CronRegistration): void => {
  registrations.push(registration)
}

export const startCronSchedules = (): void => {
  for (const reg of registrations) {
    const task = cron.schedule(reg.expression, reg.task, { name: reg.name })
    activeTasks.push(task)
  }
}

export const stopCronSchedules = (): void => {
  for (const task of activeTasks) {
    task.stop()
  }
  activeTasks = []
}

export const listRegistrations = (): readonly CronRegistration[] => registrations

export const clearRegistrations = (): void => {
  registrations.length = 0
}
