import { useAuth } from '@/contexts/AuthContext';

export default function BookingHistoryPage() {
	const { isAuthenticated } = useAuth();

	if (!isAuthenticated) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-4">
						Please sign in to view your booking history
					</h1>
					<p className="text-gray-600">
						You need to be logged in to access your booking history.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold text-gray-900 mb-6">Booking History</h1>

			<div className="bg-white rounded-lg shadow-md p-6">
				<div className="text-center py-12">
					<h2 className="text-xl font-semibold text-gray-700 mb-2">
						No bookings found
					</h2>
					<p className="text-gray-500 mb-6">
						You haven't made any bookings yet. Start exploring our hotels!
					</p>
					<button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
						Browse Hotels
					</button>
				</div>
			</div>
		</div>
	);
}
