import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native'; // Import pentru ecranul de Loading
import 'react-native-gesture-handler'; // Trebuie să fie primul import
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Importăm Ecranele
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SignupScreen from './src/screens/SignupScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import UpdateScreen from './src/screens/UpdateScreen';

// Inițializăm Navigatoarele
const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// ---
// 1. COMPONENTA PENTRU CONȚINUTUL MENIULUI
// (Definită ÎNAINTE de a fi folosită)
// Am pus 'any' ca să rezolvăm rapid erorile TypeScript
// ---
function CustomDrawerContent(props: any, handleLogout: any, authStatus: any) {
  return (
    <DrawerContentScrollView {...props}>
      {/* Afișează link-urile standard (Acasa, Setari) */}
      <DrawerItemList {...props} />
      
      {/* Afișează Deconectare doar dacă ești logat cu cont */}
      {authStatus === 'loggedIn' && (
        <DrawerItem
          label="Logout"
          onPress={handleLogout}
        />
      )}
       {/* Buton pt deconectare guest */}
     {authStatus === 'guest' && (
        <DrawerItem
          label="Logout"
          onPress={handleLogout}
        />
      )} 
    </DrawerContentScrollView>
  );
}

function MainStack({authStatus}: {authStatus: string}) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '', //Ascunde textul Home ca se vedea ansulea
        headerTintColor: '#007AFF',
        headerTitleAlign: 'center',
        headerStyle: {backgroundColor: '#fff'},
        headerTitleStyle: { fontWeight: 'bold'}, //am facut sageata albastra
      }}
      >
      <Stack.Screen  name="Home">
        {(props) => <HomeScreen {...props} authStatus={authStatus} />}
      </Stack.Screen>
      <Stack.Screen 
        name="UpdateScreen" 
        options={{ title: 'Update expense' }}
        >
        {(props) => <UpdateScreen {...props} authStatus={authStatus} />}  
        </Stack.Screen>

        <Stack.Screen
        name="AddExpenseScreen"
        options={{ title: 'Add Expense' }}
        >
          {(props) => <AddExpenseScreen {...props} authStatus={authStatus} />}
        </Stack.Screen>

        <Stack.Screen
        name="StatisticsScreen"
        options={{title: 'Statistics', }}
        
        >
          {(props) => <StatisticsScreen {...props} authStatus={authStatus} />}
        </Stack.Screen>
    </Stack.Navigator>
  );
}

// ---
// 2. COMPONENTA PENTRU MENIUL "DRAWER" (DUPĂ LOGIN)
// (Definită ÎNAINTE de a fi folosită în App)
// ---
function AppDrawer({ handleLogout, authStatus }: { handleLogout: any, authStatus: string }) {
  return (
    <Drawer.Navigator
      initialRouteName="AcasaStack"
      // Aici folosim componenta customizată de mai sus
      drawerContent={(props) => CustomDrawerContent(props, handleLogout, authStatus)}
    >
      <Drawer.Screen 
      name="AcasaStack"
      options={{ 
        title: 'Home',
        headerTitle: "" 
      }}
      >
        {(props) => <MainStack {...props} authStatus={authStatus}/>}
      </Drawer.Screen>
      
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

// ---
// 3. COMPONENTA PRINCIPALĂ APP
// ---
function App() {
  // Starea de autentificare (cu sintaxa TypeScript corectă)
  const [authStatus, setAuthStatus] = useState<'loggedOut' | 'guest' | 'loggedIn'>('loggedOut');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // useEffect pentru ÎNCĂRCAREA statusului (varianta corectă, cu try/catch)
  useEffect(() => {
    const loadAuthStatus = async () => {
      try {
        const savedStatus = await AsyncStorage.getItem('authStatus');
        if (savedStatus === 'guest' || savedStatus === 'loggedIn') {
          setAuthStatus(savedStatus); // Tipul e inferat corect
        } else {
          setAuthStatus('loggedOut');
        }
      } catch (e) {
        console.error("Error:", e);
        setAuthStatus('loggedOut');
      } finally {
        setIsLoadingAuth(false); // Am terminat de încărcat
      }
    };
    loadAuthStatus();
  }, []); // [] rulează o singură dată

  // useEffect pentru SALVAREA statusului (varianta corectă)
  useEffect(() => {
    const saveAuthStatus = async () => {
      try {
        await AsyncStorage.setItem('authStatus', authStatus);
      } catch (e) {
        console.error("Saving error:", e);
      }
    };
    // Nu salvăm dacă încă se încarcă
    if (!isLoadingAuth) {
      saveAuthStatus();
    }
  }, [authStatus, isLoadingAuth]);

  // --- Handlerele ---

  // Funcția pentru Guest (cu numele corect)
  const handleGuestLogin = () => {
    console.log('User logged as Guest!');
    setAuthStatus('guest');
  };

  const handleLogin = () => {
    console.log('Logged user!');
    setAuthStatus('loggedIn');
  };

  const handleLogout = () => {
    console.log('logged out user!');
    setAuthStatus('loggedOut');
  };

  // --- Randarea ---
  return (
    <SafeAreaProvider>
    <NavigationContainer>
      {isLoadingAuth ? (
        // Ecranul de încărcare (folosește View și Text importate)
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading...</Text></View>
      ) : authStatus === 'loggedIn' || authStatus === 'guest' ? (
        // Când e logat SAU guest, arată meniul
        <AppDrawer handleLogout={handleLogout} authStatus={authStatus} />
      ) : (
        // Când e 'loggedOut', arată ecranul de login
        <Stack.Navigator>
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {/* Trimitem funcția cu numele corect: handleGuestLogin */}
            {(props) => <LoginScreen {...props} onLogin={handleLogin} onGuestLogin={handleGuestLogin} />}
          </Stack.Screen>
         <Stack.Screen name="Signup" component={SignupScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
    </SafeAreaProvider>
      );
}

export default App;