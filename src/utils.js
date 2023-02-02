import moment from 'moment';

export const preciseDuration = (value) => {
  const duration = moment.duration(value * 1000);
  const seconds = duration.seconds();
  const minutes = duration.minutes();
  const hours = duration.hours();
  const day = duration.days();

  const sDay = day > 0 ? `${day}d `: "";
  const sHours = hours > 0 ? ((hours < 10) ? `0${hours}h ` : `${hours}h `) : "";
  const sMinutes = minutes > 0 ? ((minutes < 10) ? `0${minutes}m ` : `${minutes}m `) : "";
  const sSeconds = (seconds < 10) ? `0${seconds}s` : `${seconds}s`;

  return `${sDay}${sHours}${sMinutes}${sSeconds}`
};
