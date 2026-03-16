import { Calendar as CalendarIcon, Minus, Plus } from 'lucide-react';
import React from 'react';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useSearchStore } from '@/store/searchStore';
import { cn } from '@/utils/cn';
import { Button } from './Button';
import { Input } from './Input';

interface DatePickerProps {
	onClose?: () => void;
	className?: string;
}

interface GuestSelectorProps {
	adults: number;
	children: number;
	rooms: number;
	onGuestChange: (adults: number, children: number, rooms: number) => void;
	className?: string;
}

const GuestSelector: React.FC<GuestSelectorProps> = ({
	adults,
	children,
	rooms,
	onGuestChange,
	className,
}) => {
	const increment = (type: 'adults' | 'children' | 'rooms') => {
		switch (type) {
			case 'adults':
				if (adults < 10) {
					onGuestChange(adults + 1, children, rooms);
				}
				break;
			case 'children':
				if (children < 8) {
					onGuestChange(adults, children + 1, rooms);
				}
				break;
			case 'rooms':
				if (rooms < 5) {
					onGuestChange(adults, children, rooms + 1);
				}
				break;
		}
	};

	const decrement = (type: 'adults' | 'children' | 'rooms') => {
		switch (type) {
			case 'adults':
				if (adults > 1) {
					onGuestChange(adults - 1, children, rooms);
				}
				break;
			case 'children':
				if (children > 0) {
					onGuestChange(adults, children - 1, rooms);
				}
				break;
			case 'rooms':
				if (rooms > 1) {
					onGuestChange(adults, children, rooms - 1);
				}
				break;
		}
	};

	return (
		<div className={cn('space-y-4', className)}>
			<h3 className="font-semibold text-foreground mb-4">Guests & Rooms</h3>

			{/* Adults */}
			<div className="flex items-center justify-between">
				<div>
					<div className="font-medium text-foreground">Adults</div>
					<div className="text-sm text-muted-foreground">Ages 13+</div>
				</div>
				<div className="flex items-center gap-3">
					<Button
						variant="outline"
						size="icon"
						onClick={() => decrement('adults')}
						disabled={adults <= 1}
						className="h-8 w-8"
					>
						<Minus className="w-4 h-4" />
					</Button>
					<span className="w-8 text-center font-medium text-foreground">
						{adults}
					</span>
					<Button
						variant="outline"
						size="icon"
						onClick={() => increment('adults')}
						disabled={adults >= 10}
						className="h-8 w-8"
					>
						<Plus className="w-4 h-4" />
					</Button>
				</div>
			</div>

			{/* Children */}
			<div className="flex items-center justify-between">
				<div>
					<div className="font-medium text-foreground">Children</div>
					<div className="text-sm text-muted-foreground">Ages 0-12</div>
				</div>
				<div className="flex items-center gap-3">
					<Button
						variant="outline"
						size="icon"
						onClick={() => decrement('children')}
						disabled={children <= 0}
						className="h-8 w-8"
					>
						<Minus className="w-4 h-4" />
					</Button>
					<span className="w-8 text-center font-medium text-foreground">
						{children}
					</span>
					<Button
						variant="outline"
						size="icon"
						onClick={() => increment('children')}
						disabled={children >= 8}
						className="h-8 w-8"
					>
						<Plus className="w-4 h-4" />
					</Button>
				</div>
			</div>

			{/* Rooms */}
			<div className="flex items-center justify-between">
				<div>
					<div className="font-medium text-foreground">Rooms</div>
					<div className="text-sm text-muted-foreground">Maximum 5 rooms</div>
				</div>
				<div className="flex items-center gap-3">
					<Button
						variant="outline"
						size="icon"
						onClick={() => decrement('rooms')}
						disabled={rooms <= 1}
						className="h-8 w-8"
					>
						<Minus className="w-4 h-4" />
					</Button>
					<span className="w-8 text-center font-medium text-foreground">
						{rooms}
					</span>
					<Button
						variant="outline"
						size="icon"
						onClick={() => increment('rooms')}
						disabled={rooms >= 5}
						className="h-8 w-8"
					>
						<Plus className="w-4 h-4" />
					</Button>
				</div>
			</div>
		</div>
	);
};

export const DatePicker: React.FC<DatePickerProps> = ({
	onClose,
	className,
}) => {
	const { selectedDateRange, guestCount, setDateRange, setGuestCount } =
		useSearchStore();

	const [checkInDate, setCheckInDate] = useState(
		selectedDateRange.checkIn || '',
	);
	const [checkOutDate, setCheckOutDate] = useState(
		selectedDateRange.checkOut || '',
	);
	// const [currentMonth, setCurrentMonth] = useState(new Date());
	const [localGuestCount, setLocalGuestCount] = useState(guestCount);
	const [activeTab, setActiveTab] = useState<'dates' | 'guests'>('dates');

	const today = new Date();
	const minDate = today.toISOString().split('T')[0];

	// Calculate nights
	const calculateNights = (checkIn: string, checkOut: string) => {
		if (!checkIn || !checkOut) {
			return 0;
		}
		const start = new Date(checkIn);
		const end = new Date(checkOut);
		const diffTime = end.getTime() - start.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return Math.max(0, diffDays);
	};

	const nights = calculateNights(checkInDate, checkOutDate);

	// Auto-set checkout date when checkin is selected
	useEffect(() => {
		if (checkInDate && !checkOutDate) {
			const checkIn = new Date(checkInDate);
			const nextDay = new Date(checkIn);
			nextDay.setDate(checkIn.getDate() + 1);
			setCheckOutDate(nextDay.toISOString().split('T')[0] ?? '');
		}
	}, [checkInDate, checkOutDate]);

	// Validate dates
	const isValidDateRange = () => {
		if (!checkInDate || !checkOutDate) {
			return false;
		}
		const checkIn = new Date(checkInDate);
		const checkOut = new Date(checkOutDate);
		return checkOut > checkIn;
	};

	const handleApply = () => {
		if (isValidDateRange()) {
			setDateRange(checkInDate, checkOutDate);
			setGuestCount(
				localGuestCount.adults,
				localGuestCount.children,
				localGuestCount.rooms,
			);
			onClose?.();
		}
	};

	const handleGuestChange = (
		adults: number,
		children: number,
		rooms: number,
	) => {
		setLocalGuestCount({ adults, children, rooms });
	};

	const formatDateDisplay = (date: string) => {
		if (!date) {
			return '';
		}
		return new Date(date).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
		});
	};

	const getGuestSummary = () => {
		const { adults, children, rooms } = localGuestCount;
		const guestText = `${adults} adult${adults > 1 ? 's' : ''}${children > 0 ? `, ${children} child${children > 1 ? 'ren' : ''}` : ''}`;
		const roomText = `${rooms} room${rooms > 1 ? 's' : ''}`;
		return `${guestText} â€¢ ${roomText}`;
	};

	return (
		<div className={cn('w-full max-w-md', className)}>
			<Card className="p-6">
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-2">
						<CalendarIcon className="w-5 h-5 text-primary-600" />
						<h2 className="text-lg font-semibold text-foreground">
							Select Dates & Guests
						</h2>
					</div>
					{onClose && (
						<Button
							onClick={onClose}
							variant="ghost"
							size="sm"
							className="text-gray-500 hover:text-gray-700"
						>
							âœ•
						</Button>
					)}
				</div>

				{/* Tabs */}
				<div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6">
					<button
						onClick={() => setActiveTab('dates')}
						className={cn(
							'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
							activeTab === 'dates'
								? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
								: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
						)}
					>
						Dates
					</button>
					<button
						onClick={() => setActiveTab('guests')}
						className={cn(
							'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
							activeTab === 'guests'
								? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
								: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
						)}
					>
						Guests
					</button>
				</div>

				{/* Content */}
				<div className="space-y-6">
					{activeTab === 'dates' && (
						<>
							{/* Date Inputs */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Check-in
									</label>
									<Input
										type="date"
										value={checkInDate}
										onChange={(e) => setCheckInDate(e.target.value)}
										min={minDate}
										className="w-full"
									/>
									{checkInDate && (
										<div className="text-xs text-muted-foreground mt-1">
											{formatDateDisplay(checkInDate)}
										</div>
									)}
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Check-out
									</label>
									<Input
										type="date"
										value={checkOutDate}
										onChange={(e) => setCheckOutDate(e.target.value)}
										min={checkInDate || minDate}
										className="w-full"
									/>
									{checkOutDate && (
										<div className="text-xs text-muted-foreground mt-1">
											{formatDateDisplay(checkOutDate)}
										</div>
									)}
								</div>
							</div>

							{/* Duration Display */}
							{nights > 0 && (
								<div className="text-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
									<div className="text-sm text-primary-700 dark:text-primary-300">
										{nights} night{nights > 1 ? 's' : ''} stay
									</div>
								</div>
							)}

							{/* Quick Date Shortcuts */}
							<div>
								<div className="text-sm font-medium text-foreground mb-2">
									Quick Select
								</div>
								<div className="grid grid-cols-2 gap-2">
									{[
										{
											label: 'This Weekend',
											days: () => {
												const today = new Date();
												const friday = new Date(today);
												friday.setDate(
													today.getDate() +
														((5 - today.getDay() + 7) % 7),
												);
												const sunday = new Date(friday);
												sunday.setDate(friday.getDate() + 2);
												return { start: friday, end: sunday };
											},
										},
										{
											label: 'Next Week',
											days: () => {
												const today = new Date();
												const nextWeek = new Date(today);
												nextWeek.setDate(today.getDate() + 7);
												const endDate = new Date(nextWeek);
												endDate.setDate(nextWeek.getDate() + 2);
												return { start: nextWeek, end: endDate };
											},
										},
									].map((option) => {
										const dates = option.days();
										return (
											<Button
												key={option.label}
												variant="outline"
												size="sm"
												onClick={() => {
													setCheckInDate(
														dates.start.toISOString().split('T')[0] ?? '',
													);
													setCheckOutDate(
														dates.end.toISOString().split('T')[0] ?? '',
													);
												}}
												className="text-xs"
											>
												{option.label}
											</Button>
										);
									})}
								</div>
							</div>
						</>
					)}

					{activeTab === 'guests' && (
						<GuestSelector
							adults={localGuestCount.adults}
							children={localGuestCount.children}
							rooms={localGuestCount.rooms}
							onGuestChange={handleGuestChange}
						/>
					)}
				</div>

				{/* Summary */}
				<div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
					<div className="text-sm text-muted-foreground mb-1">
						Your Selection:
					</div>
					<div className="space-y-1">
						{checkInDate && checkOutDate && (
							<div className="text-sm font-medium text-foreground">
								{formatDateDisplay(checkInDate)} -{' '}
								{formatDateDisplay(checkOutDate)}
								{nights > 0 && (
									<span className="text-muted-foreground">
										{' '}
										({nights} night{nights > 1 ? 's' : ''})
									</span>
								)}
							</div>
						)}
						<div className="text-sm font-medium text-foreground">
							{getGuestSummary()}
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3 mt-6">
					{onClose && (
						<Button
							onClick={onClose}
							variant="outline"
							size="lg"
							className="flex-1"
						>
							Cancel
						</Button>
					)}
					<Button
						onClick={handleApply}
						disabled={!isValidDateRange()}
						size="lg"
						className="flex-2"
					>
						Apply
					</Button>
				</div>
			</Card>
		</div>
	);
};

export default DatePicker;
