import { Bell } from 'lucide-react';
import { useState } from 'react';

interface Notification {
	id: string;
	title: string;
	message: string;
	timestamp: string;
	read: boolean;
	type: 'info' | 'success' | 'warning' | 'error';
}

export default function NotificationDropdown() {
	const [isOpen, setIsOpen] = useState(false);
	const [notifications] = useState<Notification[]>([
		{
			id: '1',
			title: 'Booking Confirmed',
			message: 'Your booking at Luxury Hotel has been confirmed.',
			timestamp: '2 minutes ago',
			read: false,
			type: 'success',
		},
		{
			id: '2',
			title: 'Payment Processed',
			message: 'Your payment has been successfully processed.',
			timestamp: '1 hour ago',
			read: true,
			type: 'info',
		},
	]);

	const unreadCount = notifications.filter((n) => !n.read).length;

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
			>
				<Bell size={20} />
				{unreadCount > 0 && (
					<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
						{unreadCount}
					</span>
				)}
			</button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
					<div className="p-4 border-b border-gray-200">
						<h3 className="text-lg font-semibold">Notifications</h3>
					</div>
					<div className="max-h-96 overflow-y-auto">
						{notifications.length === 0 ? (
							<div className="p-4 text-center text-gray-500">
								No notifications
							</div>
						) : (
							notifications.map((notification) => (
								<div
									key={notification.id}
									className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${
										!notification.read ? 'bg-blue-50' : ''
									}`}
								>
									<div className="flex justify-between items-start">
										<div className="flex-1">
											<h4 className="text-sm font-medium text-gray-900">
												{notification.title}
											</h4>
											<p className="text-sm text-gray-600 mt-1">
												{notification.message}
											</p>
											<p className="text-xs text-gray-400 mt-2">
												{notification.timestamp}
											</p>
										</div>
										{!notification.read && (
											<div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
										)}
									</div>
								</div>
							))
						)}
					</div>
					<div className="p-4 border-t border-gray-200">
						<button className="text-sm text-blue-600 hover:text-blue-700">
							View all notifications
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
