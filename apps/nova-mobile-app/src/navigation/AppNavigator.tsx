import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Activity, Brain, MessageCircle, Settings } from 'lucide-react-native';
import { Platform, View } from 'react-native';
import { OfflineBanner } from '../components/OfflineBanner';
import { config } from '../config';
import { ChatScreen } from '../screens/ChatScreen';
import { MemoryScreen } from '../screens/MemoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StatusScreen } from '../screens/StatusScreen';

const Tab = createBottomTabNavigator();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: config.THEME.ACCENT_CYAN,
    background: config.THEME.BACKGROUND,
    card: config.THEME.SURFACE,
    text: config.THEME.TEXT_PRIMARY,
    border: config.THEME.BORDER,
    notification: config.THEME.ACCENT_MAGENTA,
  },
};

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 80 : 60;

export function AppNavigator() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <View style={{ flex: 1 }}>
        {config.FEATURES.OFFLINE_MODE && <OfflineBanner />}
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: config.THEME.SURFACE,
              borderTopColor: config.THEME.BORDER,
              borderTopWidth: 1,
              height: TAB_BAR_HEIGHT,
              paddingBottom: Platform.OS === 'ios' ? 24 : 8,
              paddingTop: 4,
            },
            tabBarActiveTintColor: config.THEME.ACCENT_CYAN,
            tabBarInactiveTintColor: config.THEME.TEXT_MUTED,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
          }}
          screenListeners={{
            tabPress: () => {
              void Haptics.selectionAsync();
            },
          }}
        >
          <Tab.Screen
            name="Chat"
            component={ChatScreen}
            options={{
              tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="Memory"
            component={MemoryScreen}
            options={{
              tabBarIcon: ({ color, size }) => <Brain size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="Status"
            component={StatusScreen}
            options={{
              tabBarIcon: ({ color, size }) => <Activity size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
            }}
          />
        </Tab.Navigator>
      </View>
    </NavigationContainer>
  );
}
