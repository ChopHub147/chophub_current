export const serviceDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export type ServiceDay = (typeof serviceDays)[number];

export function currentServiceDay(date = new Date()): ServiceDay {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "long",
  }).format(date) as ServiceDay;
}
