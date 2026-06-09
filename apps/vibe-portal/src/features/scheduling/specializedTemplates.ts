export const schedulingSpecializationTemplates = {
  clinicReminderDashboard: {
    sourceApp: 'vibe-reminder',
    intent:
      'Specialized appointment reminder queue for clinic-style operators; keep as scheduling vertical copy rather than a separate app shell.',
    hero: {
      eyebrow: 'Clinic Autopilot',
      title: "Today's appointment flow",
      body: 'Keep reminders moving, spot no-show risk, and help patients reschedule without a phone call.',
      primaryAction: 'Run reminder sweep',
      loadingAction: 'Sending...',
    },
    metrics: ['Appointments this month', 'No-shows this month', 'No-show rate'],
    quickAdd: {
      kicker: 'Quick add',
      title: 'Schedule appointment',
      fields: [
        { label: 'Patient', placeholder: 'Patient name', autocomplete: 'name' },
        {
          label: 'Email or phone',
          placeholder: 'patient@example.com or +155****4567',
          autocomplete: 'email tel',
        },
        { label: 'Time', inputType: 'datetime-local', autocomplete: 'off' },
      ],
      submit: 'Schedule',
      loading: 'Scheduling...',
      successMessage: 'Appointment scheduled.',
    },
    queue: {
      kicker: 'Reminder queue',
      title: 'Upcoming appointments',
      countSuffix: 'scheduled',
      empty: 'No upcoming appointments yet.',
      noShowAction: 'Mark no-show',
    },
    reminderSweepResult:
      'Reminder sweep scanned {scanned} appointments and sent {deliveries} messages.',
  },
  patientRescheduleLink: {
    sourceApp: 'vibe-reminder',
    intent:
      'Patient-facing secure reschedule route pattern for /reschedule/:token flows shared by scheduling verticals.',
    eyebrow: 'Secure reschedule link',
    title: 'Pick a new appointment time',
    currentAppointmentCopy: '{patientName}, your current appointment is {appointmentTime}.',
    fieldLabel: 'New time',
    confirmAction: 'Confirm new time',
    loadingAction: 'Updating...',
    successMessage: 'Your appointment was rescheduled.',
    errors: {
      open: 'Unable to open reschedule link',
      submit: 'Unable to reschedule appointment',
      invalidOrExpired: 'Reschedule link is invalid or expired',
    },
  },
  reminderMessages: {
    sourceApp: 'vibe-reminder',
    smsText:
      'Reminder: {patientName}, your appointment is {appointmentTime}. Reschedule here: {rescheduleUrl}',
    email: {
      heading: 'Appointment reminder',
      greeting: 'Hi {patientName}, this is a reminder for your appointment on {appointmentTime}.',
      reschedulePrompt: 'Need a different time? Use your secure reschedule link below.',
      subject: 'Appointment reminder for {appointmentTime}',
    },
  },
  dentalSchedulerScaffold: {
    sourceApp: 'vibe-dental',
    intent:
      'Legacy dental app is mostly factory/auth/billing scaffolding; retain only this branded landing/legal copy if a dental vertical is reintroduced.',
    productName: 'Vibe-Tech Dental Clinic Scheduler',
    title: 'Vibe-Tech Dental Clinic Scheduler',
    termsIntro:
      'This SaaS app includes terms of service for Vibe-Tech (vibe-tech.org) dental clinic scheduler.',
    privacyIntro:
      'This SaaS app includes privacy policy for Vibe-Tech (vibe-tech.org) dental clinic scheduler.',
    acceptableUse:
      'Do not upload or submit unauthorized content to the Vibe-Tech dental clinic scheduler.',
    analyticsCopy: 'Analytics help Vibe-Tech optimize dental clinic scheduler user experiences.',
  },
} as const;

export type SchedulingSpecializationTemplateKey = keyof typeof schedulingSpecializationTemplates;
