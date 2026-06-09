import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { config } from '../config';
import { LoginScreen } from '../screens/LoginScreen';
import { useAuthStore } from '../stores/authStore';
import { AppNavigator } from './AppNavigator';

const Stack = createNativeStackNavigator();

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

export function RootNavigator() {
  const { token } = useAuthStore();

  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token == null ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="MainApp" component={AppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
