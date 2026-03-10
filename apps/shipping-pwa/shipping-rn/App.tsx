import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Main Shipping Screen Component
const ShippingScreen = () => {
  const [doors, setDoors] = useState<DoorSchedule[]>([]);
  const [newDoorNumber, setNewDoorNumber] = useState('');
  const [selectedDC, setSelectedDC] = useState('6024');
  const [selectedFreight, setSelectedFreight] = useState('23/43');

  const destinationDCs = ['6024', '6070', '6039', '6040', '7045'];
  const freightTypes = ['23/43', '28', 'XD', 'AIB'];
  const trailerStatuses = ['empty', '25%', '50%', '75%', 'partial', 'shipload'];

  // Load doors from storage
  useEffect(() => {
    loadDoors();
  }, []);

  const loadDoors = async () => {
    try {
      const storedDoors = await AsyncStorage.getItem('shipping_doors');
      if (storedDoors) {
        setDoors(JSON.parse(storedDoors));
      }
    } catch (error) {
      console.error('Failed to load doors:', error);
    }
  };

  const saveDoors = async (doorsToSave: DoorSchedule[]) => {
    try {
      await AsyncStorage.setItem('shipping_doors', JSON.stringify(doorsToSave));
    } catch (error) {
      console.error('Failed to save doors:', error);
    }
  };

  const addDoor = () => {
    if (newDoorNumber?.length !== 3) {
      Alert.alert('Error', 'Please enter a 3-digit door number');
      return;
    }

    const newDoor: DoorSchedule = {
      id: Date.now().toString(),
      doorNumber: newDoorNumber,
      destinationDC: selectedDC,
      freightType: selectedFreight,
      trailerStatus: 'empty',
      palletCount: 0,
      timestamp: new Date().toISOString(),
      createdBy: 'User',
      tcrPresent: false,
    };

    const updatedDoors = [...doors, newDoor];
    setDoors(updatedDoors);
    saveDoors(updatedDoors);
    setNewDoorNumber('');
    
    Alert.alert('Success', `Door ${newDoorNumber} added successfully!`);
  };

  const removeDoor = (id: string) => {
    Alert.alert(
      'Remove Door',
      'Are you sure you want to remove this door?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedDoors = doors.filter(door => door.id !== id);
            setDoors(updatedDoors);
            saveDoors(updatedDoors);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0071CE" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DC 8980 Shipping</Text>
        <Text style={styles.headerSubtitle}>Door Management System</Text>
      </View>

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
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>DC: {selectedDC}</Text>
              {/* In a real app, you'd use a picker component */}
            </View>
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Type: {selectedFreight}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={addDoor}>
            <Text style={styles.addButtonText}>Add Door</Text>
          </TouchableOpacity>
        </View>

        {/* Active Doors List */}
        <View style={styles.doorsSection}>
          <Text style={styles.sectionTitle}>Active Doors ({doors.length})</Text>
          
          {doors.map((door) => (
            <View key={door.id} style={styles.doorCard}>
              <View style={styles.doorHeader}>
                <Text style={styles.doorNumber}>Door {door.doorNumber}</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeDoor(door.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.doorDetails}>
                <Text style={styles.doorDetail}>DC: {door.destinationDC}</Text>
                <Text style={styles.doorDetail}>Type: {door.freightType}</Text>
                <Text style={styles.doorDetail}>Status: {door.trailerStatus}</Text>
                <Text style={styles.doorDetail}>Pallets: {door.palletCount}</Text>
              </View>
              
              <Text style={styles.doorTimestamp}>
                Added: {new Date(door.timestamp).toLocaleString()}
              </Text>
            </View>
          ))}
          
          {doors.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No doors scheduled</Text>
              <Text style={styles.emptyStateSubtext}>Add your first door above</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Pallet Counter Screen
const PalletScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pallet Counter</Text>
      </View>
      <View style={styles.centerContent}>
        <Text style={styles.comingSoonText}>Pallet tracking coming soon!</Text>
      </View>
    </SafeAreaView>
  );
};

// Settings Screen
const SettingsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      <View style={styles.centerContent}>
        <Text style={styles.comingSoonText}>Settings coming soon!</Text>
      </View>
    </SafeAreaView>
  );
};

// Tab Navigator
const Tab = createBottomTabNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#0071CE',
          tabBarInactiveTintColor: '#8E9196',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E5E5E5',
          },
        }}>
        <Tab.Screen
          name="Shipping"
          component={ShippingScreen}
          options={{
            tabBarLabel: 'Doors',
          }}
        />
        <Tab.Screen
          name="Pallets"
          component={PalletScreen}
          options={{
            tabBarLabel: 'Pallets',
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F7',
  },
  header: {
    backgroundColor: '#0071CE',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#CCE9FF',
    textAlign: 'center',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  quickAddSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  doorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  pickerContainer: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F6F6F7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  pickerLabel: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#FFC220',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#004C91',
  },
  doorsSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doorCard: {
    backgroundColor: '#F6F6F7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0071CE',
  },
  doorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  doorNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  removeButton: {
    backgroundColor: '#D11F33',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  doorDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  doorDetail: {
    fontSize: 14,
    color: '#666666',
  },
  doorTimestamp: {
    fontSize: 12,
    color: '#8E9196',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E9196',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8E9196',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 18,
    color: '#8E9196',
  },
});

export default App;