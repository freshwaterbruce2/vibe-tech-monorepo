import { CalendarDays, MapPin, Search, UsersRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toSearchParams } from './booking-utils';
import type { SearchValues } from './types';

interface SearchFormProps {
  initialValues: SearchValues;
  submitLabel?: string;
  variant?: 'hero' | 'compact';
}

export function SearchForm({
  initialValues,
  submitLabel = 'Search stays',
  variant = 'hero',
}: SearchFormProps) {
  const navigate = useNavigate();
  const [values, setValues] = useState<SearchValues>(initialValues);

  const updateValue = <Key extends keyof SearchValues>(key: Key, value: SearchValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void navigate(`/search?${toSearchParams(values).toString()}`);
  };

  return (
    <form
      className={`searchForm ${variant === 'compact' ? 'searchFormCompact' : ''}`}
      onSubmit={onSubmit}
    >
      <label>
        <span>
          <MapPin size={17} aria-hidden="true" /> Destination
        </span>
        <input
          value={values.destination}
          onChange={(event) => updateValue('destination', event.target.value)}
          placeholder="City, hotel, or district"
          required
        />
      </label>
      <label>
        <span>
          <CalendarDays size={17} aria-hidden="true" /> Check-in
        </span>
        <input
          type="date"
          value={values.checkIn}
          onChange={(event) => updateValue('checkIn', event.target.value)}
          required
        />
      </label>
      <label>
        <span>
          <CalendarDays size={17} aria-hidden="true" /> Check-out
        </span>
        <input
          type="date"
          min={values.checkIn || undefined}
          value={values.checkOut}
          onChange={(event) => updateValue('checkOut', event.target.value)}
          required
        />
      </label>
      <label>
        <span>
          <UsersRound size={17} aria-hidden="true" /> Guests
        </span>
        <input
          type="number"
          min={1}
          max={8}
          value={values.guests}
          onChange={(event) => updateValue('guests', Number(event.target.value))}
          required
        />
      </label>
      <button className="primaryButton" type="submit">
        <Search size={18} aria-hidden="true" />
        {submitLabel}
      </button>
    </form>
  );
}
