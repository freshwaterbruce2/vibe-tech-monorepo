declare module 'react-big-calendar' {
  import { ComponentType, ReactNode } from 'react';

  export type View = 'month' | 'week' | 'work_week' | 'day' | 'agenda';

  export interface Event {
    title?: string;
    start?: Date;
    end?: Date;
    allDay?: boolean;
    resource?: unknown;
  }

  export interface CalendarProps<TEvent extends Event = Event> {
    localizer: object;
    events?: TEvent[];
    startAccessor?: keyof TEvent | ((event: TEvent) => Date);
    endAccessor?: keyof TEvent | ((event: TEvent) => Date);
    style?: React.CSSProperties;
    view?: View;
    onView?: (view: View) => void;
    date?: Date;
    onNavigate?: (date: Date) => void;
    selectable?: boolean;
    onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[]; action: string }) => void;
    onSelectEvent?: (event: TEvent, e: React.SyntheticEvent) => void;
    popup?: boolean;
    toolbar?: boolean;
    views?: View[] | { [key: string]: boolean | ComponentType<unknown> };
    components?: object;
    formats?: object;
    messages?: object;
    culture?: string;
    className?: string;
  }

  export const Calendar: ComponentType<CalendarProps>;
  export const Views: {
    MONTH: 'month';
    WEEK: 'week';
    WORK_WEEK: 'work_week';
    DAY: 'day';
    AGENDA: 'agenda';
  };

  export function dateFnsLocalizer(config: {
    format: (date: Date, format: string, options?: object) => string;
    parse: (value: string, format: string, baseDate: Date, options?: object) => Date;
    startOfWeek: (date: Date, options?: object) => Date;
    getDay: (date: Date) => number;
    locales: object;
  }): object;
}

declare module 'react-big-calendar/lib/css/react-big-calendar.css';
