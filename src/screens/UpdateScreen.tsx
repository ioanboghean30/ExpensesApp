import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';

const CATEGORII_PREDEFINITE = ["Food", "Transport", "Bills", "Entertainment", "Shopping", "Health", "Other"
];

type Cheltuiala = {
    id: string;
    suma: number;
    descriere: string;
    categorie: string;
    data: Date;
};
export default function UpdateScreen({ route, navigation, authStatus }: { route: any, navigation: any, authStatus: string }) {
        const {cheltuiala} = route.params; //Preluam cheltuiala din Homescreen.
        const [suma, setSuma] = useState(cheltuiala.suma.toString()); //qm pus .toString() pt ca suma e numar iar TextInput lucreaza cu stringuri
        const [descriere, setDescriere] = useState(cheltuiala.descriere); 
        const [categorie, setCategorie] = useState(cheltuiala.categorie);
        const [dataAleasa, setDataAleasa] = useState(new Date(cheltuiala.data));
        const [showDataPicker, setShowDataPicker] = useState(false);//sa nu apara calendarul direct cand intra.
        const onChangeDate = (event: any, selectedDate?: Date) =>{
            setShowDataPicker(false);
            if(selectedDate){
                setDataAleasa(selectedDate);
            }
        };

        const [loading , setLoading] = useState(false);

        //Aici o sa am funcia de salvare.
        const handleUpdate = async () => {
            if (!suma || !descriere || !categorie) {
                Alert.alert("Error", "Please fill all fields.");
                return;
            }
            setLoading (true);

            try {
                if (authStatus === 'guest') {
            const cheltuieliJson = await AsyncStorage.getItem('cheltuieliSalvate');
            let cheltuieliSalvate: Cheltuiala[] = cheltuieliJson ? JSON.parse(cheltuieliJson) : [];
            const cheltuieliActualizate = cheltuieliSalvate.map(c => {
                if (c.id === cheltuiala.id) {
                    return {
                        ...c,
                        suma: parseFloat(suma),
                        descriere: descriere,
                        categorie: categorie,
                        data: dataAleasa,
                    };
                }
                return c;
            });
            await AsyncStorage.setItem('cheltuieliSalvate', JSON.stringify(cheltuieliActualizate));
        } else if (authStatus === 'loggedIn') {
            const { data,  error } = await supabase
                .from('cheltuieli')
                .update({
                    suma: parseFloat(suma),
                    descriere: descriere,
                    categorie: categorie,
                    data: dataAleasa.toISOString(),
                })
                .match({id: parseInt(cheltuiala.id) });

            if (error) {
                Alert.alert("Supabase error", error.message);
            }
        }
        setLoading (false);
        navigation.goBack();
    } catch (e) {
        setLoading (false);
            Alert.alert("Error", "An unexpected error occurred.");
            console.error(e);
    }
        };
    return (
       <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
                style={styles.input}
                value={suma}
                onChangeText={setSuma}
                keyboardType="numeric"
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
                      style={styles.input}
                      value={descriere}
                      onChangeText={setDescriere}
                    />

            <View style={styles.pickerContainer}>
                <Picker
                selectedValue={categorie}
                onValueChange={(itemValue) => setCategorie(itemValue)}
                style={styles.picker}
                dropdownIconColor={'#aaa'}
                >
                    {CATEGORII_PREDEFINITE.map((cat, index) => (
                        <Picker.Item label={cat} value={cat} key={index.toString()}/>
                    ))}
                </Picker>
            </View>
            <Text style={styles.label}>Date</Text>
            <Pressable onPress={() => setShowDataPicker(true)}>
                <View style={styles.input}>
                    <Text style={{ color: 'white', fontSize: 16 }}>
                        {dataAleasa.toLocaleDateString('ro-RO')}
                    </Text>
                </View>
            </Pressable>
            {showDataPicker && (
                <DateTimePicker
                value={dataAleasa}
                mode="date"
                display="default"
                onChange={onChangeDate}
                />
            )}
            <Pressable 
            style={styles.buttonPrimary} 
            onPress={handleUpdate} 
            disabled={loading}
            >
                <Text style={styles.buttonPrimaryText}>
                    {loading ? 'Loading...' : 'Save Changes'}
                </Text>
            </Pressable>
        </ScrollView>
       </SafeAreaView>    
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1E1E1E",
    },
    scrollContainer: {
        padding: 20,
    },
    label: {
        color: "white",
        fontSize: 16,
        marginBottom: 5,
        fontWeight:"600",
    },
    input: {
        backgroundColor: "#333",
        color: "white",
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    buttonPrimary: {
        backgroundColor: "#007AFF",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
    },
    buttonPrimaryText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    pickerContainer:{
        backgroundColor: '#333',
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: Platform.OS === 'android' ? 1 : 0,
        borderColor: '#333',
    },
    picker:{
        color: 'white',
        height: 50,
    },
    
   
});
