import { useAuth } from '@/contexts/AuthContext';

export default function UserProfilePage() {
	const { user, isAuthenticated } = useAuth();

	if (!isAuthenticated) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-4">
						Please sign in to view your profile
					</h1>
					<p className="text-gray-600">
						You need to be logged in to access your profile.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>

			<div className="bg-white rounded-lg shadow-md p-6">
				<div className="space-y-6">
					<div>
						<h2 className="text-xl font-semibold text-gray-800 mb-4">
							Personal Information
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									First Name
								</label>
								<input
									type="text"
									value={user?.firstName || ''}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									readOnly
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Last Name
								</label>
								<input
									type="text"
									value={user?.lastName || ''}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									readOnly
								/>
							</div>
							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Email
								</label>
								<input
									type="email"
									value={user?.email || ''}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									readOnly
								/>
							</div>
						</div>
					</div>

					<div className="pt-4 border-t border-gray-200">
						<button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 mr-4">
							Edit Profile
						</button>
						<button className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300">
							Change Password
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
