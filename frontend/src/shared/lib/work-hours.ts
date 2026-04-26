import { WORK_END_HOUR, WORK_START_HOUR } from "@/shared/constants/restaurant";

export function isOutsideWorkingHours(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Moscow"
  });
  const hour = Number(
    formatter.formatToParts(date).find((part) => part.type === "hour")?.value ?? 0
  );

  return hour < WORK_START_HOUR || hour >= WORK_END_HOUR;
}
