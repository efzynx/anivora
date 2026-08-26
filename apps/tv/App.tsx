import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './src/context/AuthContext';
import { HomeScreen } from './src/screens/Home/HomeScreen';
import { ContentDetailScreen } from './src/screens/Detail/ContentDetailScreen';
import { SearchScreen } from './src/screens/Search/SearchScreen';
import { PlayerScreen } from './src/screens/Player/PlayerScreen';
import { FavoritesScreen } from './src/screens/Favorites/FavoritesScreen';
import { HistoryScreen } from './src/screens/History/HistoryScreen';
import { AuthScreen } from './src/screens/Auth/AuthScreen';
import { UpdateDialog, useAppUpdateChecker } from './src/components/UpdateDialog';
import { Colors } from './src/theme/tokens';

export type RootStackParamList = {
  Home: undefined;
  ContentDetail: { slugOrId: string };
  Search: undefined;
  Favorites: undefined;
  History: undefined;
  Auth: undefined;
  Player: { episodeId: string; title: string; episodeNumber?: number };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.backgroundPrimary,
    card: Colors.backgroundSecondary,
    text: Colors.textPrimary,
    border: Colors.borderSubtle,
    primary: Colors.accentPrimary,
  },
};

export const App = () => {
  const { updateInfo, modalVisible, dismissUpdate } = useAppUpdateChecker();

  return (
    <AuthProvider>
      <NavigationContainer theme={AppNavTheme}>
        <StatusBar hidden={true} backgroundColor={Colors.backgroundPrimary} barStyle="light-content" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animationEnabled: true,
            cardStyle: { backgroundColor: Colors.backgroundPrimary },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="ContentDetail" component={ContentDetailScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Player" component={PlayerScreen} />
        </Stack.Navigator>

        <UpdateDialog
          visible={modalVisible}
          updateInfo={updateInfo}
          onDismiss={dismissUpdate}
        />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;

