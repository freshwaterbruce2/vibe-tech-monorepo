import { useParams } from 'react-router-dom';
import HotelDetails from '@/components/hotels/HotelDetails';

export function HotelDetailsPage() {
	const { id } = useParams<{ id: string }>();

	if (!id) {
		return <div>Hotel not found</div>;
	}

	return (
		<div className="min-h-screen">
			<HotelDetails />
		</div>
	);
}
