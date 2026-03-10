import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
	Alert,
	Platform,
	SafeAreaView,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

// Types based on the original shipping app
interface DoorSchedule {
	id: string;
	doorNumber: string;
	destinationDC: string;
	freightType: string;
	trailerStatus: string;
	palletCount: number;
	timestamp: string;
	createdBy: string;
	tcrPresent: boolean;
}

const App = () => {
	const [doors, setDoors] = useState<DoorSchedule[]>([]);
	const [newDoorNumber, setNewDoorNumber] = useState("");
	const [selectedDC, setSelectedDC] = useState("6024");
	const [selectedFreight, setSelectedFreight] = useState("23/43");
	const [activeTab, setActiveTab] = useState("doors");

	const destinationDCs = ["6024", "6070", "6039", "6040", "7045"];
	const freightTypes = ["23/43", "28", "XD", "AIB"];

	// Load doors from storage
	useEffect(() => {
		loadDoors();
	}, []);

	const loadDoors = async () => {
		try {
			const storedDoors = await AsyncStorage.getItem("shipping_doors");
			if (storedDoors) {
				setDoors(JSON.parse(storedDoors));
			}
		} catch (error) {
			console.error("Failed to load doors:", error);
		}
	};

	const saveDoors = async (doorsToSave: DoorSchedule[]) => {
		try {
			await AsyncStorage.setItem("shipping_doors", JSON.stringify(doorsToSave));
		} catch (error) {
			console.error("Failed to save doors:", error);
		}
	};

	const addDoor = () => {
		if (!newDoorNumber || newDoorNumber.length !== 3) {
			Alert.alert("Error", "Please enter a 3-digit door number");
			return;
		}

		const newDoor: DoorSchedule = {
			id: Date.now().toString(),
			doorNumber: newDoorNumber,
			destinationDC: selectedDC,
			freightType: selectedFreight,
			trailerStatus: "empty",
			palletCount: 0,
			timestamp: new Date().toISOString(),
			createdBy: "User",
			tcrPresent: false,
		};

		const updatedDoors = [...doors, newDoor];
		setDoors(updatedDoors);
		saveDoors(updatedDoors);
		setNewDoorNumber("");

		Alert.alert("Success", `Door ${newDoorNumber} added successfully!`);
	};

	const removeDoor = (id: string) => {
		Alert.alert("Remove Door", "Are you sure you want to remove this door?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Remove",
				style: "destructive",
				onPress: () => {
					const updatedDoors = doors.filter((door) => door.id !== id);
					setDoors(updatedDoors);
					saveDoors(updatedDoors);
				},
			},
		]);
	};

	const cycleDC = () => {
		const currentIndex = destinationDCs.indexOf(selectedDC);
		const nextIndex = (currentIndex + 1) % destinationDCs.length;
		setSelectedDC(destinationDCs[nextIndex]);
	};

	const cycleFreight = () => {
		const currentIndex = freightTypes.indexOf(selectedFreight);
		const nextIndex = (currentIndex + 1) % freightTypes.length;
		setSelectedFreight(freightTypes[nextIndex]);
	};

	const renderDoorsTab = () => (
		<ScrollView style={styles.scrollView}>
			{/* Quick Add Section */}
			<View style={styles.quickAddSection}>
				<Text style={styles.sectionTitle}>Quick Add Door</Text>

				<View style={styles.inputRow}>
					<TextInput
						style={styles.doorInput}
						placeholder="Door #"
						value={newDoorNumber}
						onChangeText={setNewDoorNumber}
						keyboardType="numeric"
						maxLength={3}
					/>

					<TouchableOpacity style={styles.pickerContainer} onPress={cycleDC}>
						<Text style={styles.pickerLabel}>DC: {selectedDC}</Text>
						<Text style={styles.pickerHint}>Tap to change</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.pickerContainer}
						onPress={cycleFreight}
					>
						<Text style={styles.pickerLabel}>Type: {selectedFreight}</Text>
						<Text style={styles.pickerHint}>Tap to change</Text>
					</TouchableOpacity>
				</View>

				<TouchableOpacity style={styles.addButton} onPress={addDoor}>
					<Text style={styles.addButtonText}>⚡ Quick Add Door</Text>
				</TouchableOpacity>
			</View>

			{/* Active Doors List */}
			<View style={styles.doorsSection}>
				<Text style={styles.sectionTitle}>Active Doors ({doors.length})</Text>

				{doors.map((door) => (
					<View key={door.id} style={styles.doorCard}>
						<View style={styles.doorHeader}>
							<Text style={styles.doorNumber}>🚪 Door {door.doorNumber}</Text>
							<TouchableOpacity
								style={styles.removeButton}
								onPress={() => removeDoor(door.id)}
							>
								<Text style={styles.removeButtonText}>✕</Text>
							</TouchableOpacity>
						</View>

						<View style={styles.doorDetails}>
							<Text style={styles.doorDetail}>🏢 DC: {door.destinationDC}</Text>
							<Text style={styles.doorDetail}>📦 Type: {door.freightType}</Text>
							<Text style={styles.doorDetail}>
								🚛 Status: {door.trailerStatus}
							</Text>
							<Text style={styles.doorDetail}>
								📋 Pallets: {door.palletCount}
							</Text>
						</View>

						<Text style={styles.doorTimestamp}>
							⏰ Added: {new Date(door.timestamp).toLocaleString()}
						</Text>
					</View>
				))}

				{doors.length === 0 && (
					<View style={styles.emptyState}>
						<Text style={styles.emptyStateIcon}>🚪</Text>
						<Text style={styles.emptyStateText}>No doors scheduled</Text>
						<Text style={styles.emptyStateSubtext}>
							Add your first door above
						</Text>
					</View>
				)}
			</View>
		</ScrollView>
	);

	const renderPalletsTab = () => (
		<View style={styles.centerContent}>
			<Text style={styles.comingSoonIcon}>📦</Text>
			<Text style={styles.comingSoonText}>Pallet Counter</Text>
			<Text style={styles.comingSoonSubtext}>Coming soon!</Text>
		</View>
	);

	const renderSettingsTab = () => (
		<View style={styles.centerContent}>
			<Text style={styles.comingSoonIcon}>⚙️</Text>
			<Text style={styles.comingSoonText}>Settings</Text>
			<Text style={styles.comingSoonSubtext}>Configure your preferences</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor="#0071CE" />

			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.headerTitle}>🏢 DC 8980 Shipping</Text>
				<Text style={styles.headerSubtitle}>Door Management System</Text>
			</View>

			{/* Tab Content */}
			{activeTab === "doors" && renderDoorsTab()}
			{activeTab === "pallets" && renderPalletsTab()}
			{activeTab === "settings" && renderSettingsTab()}

			{/* Bottom Tab Bar */}
			<View style={styles.tabBar}>
				<TouchableOpacity
					style={[styles.tab, activeTab === "doors" && styles.activeTab]}
					onPress={() => setActiveTab("doors")}
				>
					<Text
						style={[
							styles.tabText,
							activeTab === "doors" && styles.activeTabText,
						]}
					>
						🚪 Doors
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.tab, activeTab === "pallets" && styles.activeTab]}
					onPress={() => setActiveTab("pallets")}
				>
					<Text
						style={[
							styles.tabText,
							activeTab === "pallets" && styles.activeTabText,
						]}
					>
						📦 Pallets
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.tab, activeTab === "settings" && styles.activeTab]}
					onPress={() => setActiveTab("settings")}
				>
					<Text
						style={[
							styles.tabText,
							activeTab === "settings" && styles.activeTabText,
						]}
					>
						⚙️ Settings
					</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F6F6F7",
	},
	header: {
		backgroundColor: "#0071CE",
		padding: 20,
		paddingTop: Platform.OS === "ios" ? 60 : 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#FFFFFF",
		textAlign: "center",
	},
	headerSubtitle: {
		fontSize: 16,
		color: "#CCE9FF",
		textAlign: "center",
		marginTop: 4,
	},
	scrollView: {
		flex: 1,
		padding: 16,
	},
	quickAddSection: {
		backgroundColor: "#FFFFFF",
		padding: 20,
		borderRadius: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#333333",
		marginBottom: 16,
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 20,
		gap: 12,
	},
	doorInput: {
		flex: 1,
		borderWidth: 2,
		borderColor: "#0071CE",
		borderRadius: 12,
		padding: 16,
		fontSize: 18,
		backgroundColor: "#FFFFFF",
		textAlign: "center",
		fontWeight: "600",
	},
	pickerContainer: {
		flex: 1,
		padding: 12,
		backgroundColor: "#F6F6F7",
		borderRadius: 12,
		borderWidth: 2,
		borderColor: "#E5E5E5",
		alignItems: "center",
	},
	pickerLabel: {
		fontSize: 14,
		color: "#333333",
		fontWeight: "600",
	},
	pickerHint: {
		fontSize: 10,
		color: "#8E9196",
		marginTop: 2,
	},
	addButton: {
		backgroundColor: "#FFC220",
		padding: 18,
		borderRadius: 12,
		alignItems: "center",
		shadowColor: "#FFC220",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	addButtonText: {
		fontSize: 18,
		fontWeight: "700",
		color: "#004C91",
	},
	doorsSection: {
		backgroundColor: "#FFFFFF",
		padding: 20,
		borderRadius: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	doorCard: {
		backgroundColor: "#F8F9FA",
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
		borderLeftWidth: 4,
		borderLeftColor: "#0071CE",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	doorHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	doorNumber: {
		fontSize: 20,
		fontWeight: "700",
		color: "#333333",
	},
	removeButton: {
		backgroundColor: "#D11F33",
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	removeButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "700",
	},
	doorDetails: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 16,
		marginBottom: 8,
	},
	doorDetail: {
		fontSize: 14,
		color: "#666666",
		fontWeight: "500",
	},
	doorTimestamp: {
		fontSize: 12,
		color: "#8E9196",
		fontStyle: "italic",
	},
	emptyState: {
		alignItems: "center",
		padding: 40,
	},
	emptyStateIcon: {
		fontSize: 48,
		marginBottom: 12,
	},
	emptyStateText: {
		fontSize: 18,
		color: "#8E9196",
		fontWeight: "600",
		marginBottom: 4,
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: "#8E9196",
	},
	centerContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	comingSoonIcon: {
		fontSize: 64,
		marginBottom: 16,
	},
	comingSoonText: {
		fontSize: 24,
		color: "#333333",
		fontWeight: "600",
		marginBottom: 8,
	},
	comingSoonSubtext: {
		fontSize: 16,
		color: "#8E9196",
	},
	tabBar: {
		flexDirection: "row",
		backgroundColor: "#FFFFFF",
		borderTopWidth: 1,
		borderTopColor: "#E5E5E5",
		paddingBottom: Platform.OS === "ios" ? 34 : 16,
		paddingTop: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 5,
	},
	tab: {
		flex: 1,
		alignItems: "center",
		paddingVertical: 8,
	},
	activeTab: {
		backgroundColor: "#E6F3FA",
		marginHorizontal: 8,
		borderRadius: 12,
	},
	tabText: {
		fontSize: 14,
		color: "#8E9196",
		fontWeight: "500",
	},
	activeTabText: {
		color: "#0071CE",
		fontWeight: "700",
	},
});

export default App;
