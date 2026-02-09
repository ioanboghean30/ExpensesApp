import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView, // We need ScrollView for the form + list
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';

//categories
const CATEGORII_PREDEFINITE = [
  "Food", "Transport", "Bills", "Entertainment", "Shopping", "Health", "Other"
];

// Type definition 
type Cheltuiala = {
  id: string;
  suma: number;
  descriere: string;
  data: Date;
  categorie: string;
};
//Mapare nume categorie pentru conita din libraria MaterialCommunityIcons.
const ICONITE_CATEGORII: { [key: string]: any } = {
  "Food": "food-variant",
  "Transport": "car",
  "Bills": "file-document-outline",
  "Entertainment": "gamepad-variant",
  "Shopping": "shopping",
  "Health": "heart-pulse",
  "Other": "dots-horizontal-circle",
}
//Mapare nume categorie(culoarea).
const CULORI_CATEGORII: { [key: string]: string } = {
  "Food": "#FF6384",
  "Transport": "#36A2EB",
  "Bills": "#FFCE56",
  "Entertainment": "#4BC0C0",
  "Shopping": "#9966FF",
  "Health": "#FF9F40",
  "Other": "#C9CBCF",
};

// Receives navigation (for Update) and authStatus (for logic)
export default function AddExpenseScreen({ navigation, authStatus }: { navigation: any, authStatus: string }) {
  
  // Form states
  const [suma, setSuma] = useState('');
  const [descriere, setDescriere] = useState<string>('');
  const [categorie, setCategorie] = useState(CATEGORII_PREDEFINITE[0]);

  //pentru adaugarea datei de catre user
  const [dataAleasa, setDataAleasa] = useState(new Date());//apate data curenta. 
  const [showDataPicker, setShowDataPicker] = useState(false); //am pus calendarul ca sa poata modifica userul data.
  const onChangeDate = (event: any, selectedDate?: Date) => {
    const current = selectedDate || dataAleasa;
    // dispare dupa selectia userului.
    if (Platform.OS === 'android')  setShowDataPicker(false);
    setDataAleasa(current);
  };
  
  // List states
  const [cheltuieli, setCheltuieli] = useState<Cheltuiala[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFocused = useIsFocused(); // Hook for reloading

  // Logica pentru incaracarea cheltuielilor
  useEffect(() => {
    const incarcaCheltuieli = async () => {
      try {
        let dateIncarcate: Cheltuiala[] = []; 
        if (authStatus === 'guest') {
          const cheltuieliJson = await AsyncStorage.getItem('cheltuieliSalvate');
          if (cheltuieliJson !== null) {
            const cheltuieliSalvate = JSON.parse(cheltuieliJson);
            dateIncarcate = cheltuieliSalvate.map((c: any) => ({
              ...c,
              data: new Date(c.data),
            }));
          }
        } else if (authStatus === 'loggedIn') {
          const { data, error } = await supabase
            .from('cheltuieli')
            .select('*')
            .order('data', { ascending: false });
          if (error) throw error;
          if (data) {
            dateIncarcate = data.map((c: any) => ({
              ...c,
              id: c.id.toString(), // face id ul string
              data: new Date(c.data),
            }));
          }
        }
        setCheltuieli(dateIncarcate);
      } catch (e) {
        console.error("Error loading expenses:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isFocused) {
      incarcaCheltuieli(); 
    }
  }, [authStatus, isFocused]); 

  // logica de salvare la guest
  useEffect(() => {
    const salveazaCheltuieli = async () => {
      try {
        const cheltuieliJson = JSON.stringify(cheltuieli);
        await AsyncStorage.setItem('cheltuieliSalvate', cheltuieliJson);
      } catch (e) {
        console.log('Error saving expenses:', e);
      } 
    };
    if (authStatus === 'guest' && !isLoading) {
      salveazaCheltuieli(); 
    }
  }, [cheltuieli, authStatus, isLoading]);

  //logica pt butonul add
  const handleAdaugaCheltuiala = async () => {

    const descriereSafe = String(descriere || "");
    const sumaNumber = parseFloat(suma);
    if (!descriereSafe.trim() || isNaN(sumaNumber) || sumaNumber <= 0) {
      Alert.alert('Error', 'Please enter the amount and description.');
      return;
    }
    const nouaData = dataAleasa;
    const cheltuialaDeBaza = {
      suma: parseFloat(suma), 
      descriere: descriereSafe.trim(), 
      data: nouaData, 
      categorie: categorie,
    };

    if (authStatus === 'guest') {
      const cheltuialaNouaGuest = {
        ...cheltuialaDeBaza,
        id: Math.random().toString(),
      };
      setCheltuieli(cheltuieliAnterioare => [cheltuialaNouaGuest, ...cheltuieliAnterioare]);
    } else if (authStatus === 'loggedIn') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; 

      const cheltuialaNouaSupabase = {
        ...cheltuialaDeBaza,
        user_id: user.id,
        data: nouaData.toISOString(),
      };
      const { data: dataInserat, error } = await supabase
        .from('cheltuieli')
        .insert(cheltuialaNouaSupabase)
        .select() 
        .single();
      if (error) {
        Alert.alert('Supabase Error', error.message);
      } else if (dataInserat) {
        const cheltuialaFinala = {
          ...dataInserat,
          id: dataInserat.id.toString(),
          data: new Date(dataInserat.data),
        };
        setCheltuieli(cheltuieliAnterioare => [cheltuialaFinala, ...cheltuieliAnterioare]);
      }
    }
    setSuma('');
    setDescriere('');
    setCategorie(CATEGORII_PREDEFINITE[0]); // Reset picker
  };

  // logica pt butonul delete
  const handleStergeCheltuiala = (id: string, suma: number) => {
    Alert.alert(
      "Delete Confirmation",
      `Are you sure you want to delete the ${suma.toFixed(2)} RON expense?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            if (authStatus === 'guest') {
              setCheltuieli(cheltuieliAnterioare => 
                cheltuieliAnterioare.filter(c => c.id !== id)
              );
            } else if (authStatus === 'loggedIn') {
              try {
                const { error } = await supabase
                  .from('cheltuieli')
                  .delete()
                  .match({ id: parseInt(id) }); 
                if (error) throw error;
                setCheltuieli(cheltuieliAnterioare => 
                  cheltuieliAnterioare.filter(c => c.id !== id)
                );
              } catch (e: any) {
                Alert.alert('Delete Error', e.message);
              }
            }
          } 
        }
      ]
    );
  };

  // logica pentru optiuni(delete, update)
  const handleShowOptions = (item: Cheltuiala) => {
    Alert.alert(
      "Options",
      "",
      [
        {
          text: "Delete",
          onPress: () => handleStergeCheltuiala(item.id, item.suma),
          style: "destructive"
        },
        {
          text: "Update",
          onPress: () => navigation.navigate('UpdateScreen', { 
            cheltuiala: item 
          }),
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        
        <Text style={styles.titlu}>Add an Expense</Text>

        {/* --- Add Form --- */}
        <TextInput
          style={styles.input}
          placeholder="Amount (e.g., 50)"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={suma}
          onChangeText={setSuma}
        />
        <TextInput
          style={styles.input}
          placeholder="Description (e.g., Coffee)"
          placeholderTextColor="#999"
          value={String(descriere)}
          onChangeText={(text) => setDescriere(text)}
        />
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={categorie}
            onValueChange={(itemValue) => setCategorie(itemValue)}
            style={styles.picker}
            dropdownIconColor={'#aaa'}
          >
            {CATEGORII_PREDEFINITE.map((cat, index) => (
              <Picker.Item label={cat} value={cat} key={index.toString()} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Date</Text>
        <Pressable onPress={() =>setShowDataPicker(true)}>
          <View style={styles.input}>
            <Text style={{ color: 'white', fontSize: 16, paddingTop: 0}}>
              {dataAleasa.toLocaleDateString('ro-RO')}
            </Text>
          </View>
        </Pressable>
        {showDataPicker && Platform.OS !== 'web' &&(
         <DateTimePicker
            value={dataAleasa}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeDate}
            maximumDate={new Date()}
         />
        )}
        <Pressable 
          style={styles.buttonPrimary} 
          onPress={handleAdaugaCheltuiala} 
        >
        <MaterialCommunityIcons
        name="plus-circle-outline"//numele iconitei
        size={24}//marimea acesteia
        color="white"//culoarea
        style={{ marginRight: 8 }}//spatiu de 8 intre iconta si text.
        />
          <Text style={styles.buttonPrimaryText}>Add Expense</Text>
        </Pressable>

        {/* --- Separator --- */}
        <View style={styles.separator} />
        
        <Text style={styles.titlu}>Expense History</Text>

        {/* --- Expense List --- */}
        <FlatList
          data={cheltuieli}
          scrollEnabled={false} // Let the main ScrollView handle scrolling
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={[styles.iconContainer, { backgroundColor: CULORI_CATEGORII[item.categorie] || '#555' }]}>
                <MaterialCommunityIcons
                name={ICONITE_CATEGORII[item.categorie] || "help-circle"}
                size={24}
                color="white"
                />
              </View>
              <View style={styles.listItemContinut}>
                <View style={styles.listItemAntet}>
                  <Text style={styles.listTextDescriere}>{item.descriere}</Text>
                  <Text style={styles.listTextSuma}>{item.suma.toFixed(2)} RON</Text>
                </View>
                <View style={styles.listItemDetalii}>
                  <Text style={styles.listTextCategorie}>{item.categorie}</Text>
                  <Text style={styles.listTextData}>{item.data.toLocaleDateString('en-US')}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => handleShowOptions(item)}
                style={styles.optionsButton}
                >
                <MaterialCommunityIcons name="dots-vertical" size={24} color= "#aaa" />
              </Pressable>
            </View>
          )}
          keyExtractor={item => item.id}
          style={styles.list}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles 
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    padding: 20, 
  },
  titlu: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    marginTop: 10,
  },
  label: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#333',
    color: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  pickerContainer: {
    backgroundColor: '#333',
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
    borderWidth: Platform.OS === 'android' ? 1 : 0,
    borderColor: '#333',
  },
  picker: {
    color: 'white',
    height: 50,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: 20,
  },
  list: {
    marginTop: 0, 
  },
  listItem: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row', 
    alignItems: 'center', 
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  listItemContinut: {
    flex: 1, 
  },
  optionsButton: {
    padding: 5,
    marginLeft: 5,
  },
  optionsButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  listItemAntet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  listItemDetalii: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  listTextDescriere: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listTextCategorie: {
    color: '#aaa',
    fontSize: 14,
    fontStyle: 'italic',
  },
  listTextSuma: {
    color: 'lightgreen',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listTextData: {
    color: 'grey',
    fontSize: 14,
  },
});