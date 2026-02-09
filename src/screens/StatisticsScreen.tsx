import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';

// --- CONFIGURĂRI VIZUALE ---
const SCREEN_WIDTH = Dimensions.get('window').width;

const CULORI_CATEGORII: {[key: string]: string } = {
    "Food": "#FF6384",
    "Transport": "#36A2EB", 
    "Entertainment": "#4BC0C0",
    "Bills": "#FFCE56",
    "Shopping": "#9966FF",
    "Health": "#FF9F40",
    "Other": "#C9CBCF"
};

// Lista de filtre pentru timp
const TIME_FILTERS = [
    { id: '7days', label: '7 Days' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
    { id: 'all', label: 'All Time' },
    { id: 'custom', label: 'Custom' },
];

const CATEGORII_LISTA = ["All", "Food", "Transport", "Bills", "Entertainment", "Shopping", "Health", "Other"];

type Cheltuiala = {
    id: string;
    suma: number;
    descriere: string;
    data: Date;
    categorie: string;
};

export default function StatisticsScreen({authStatus}: {authStatus: string}){
    const [cheltuieli, setCheltuieli] = useState<Cheltuiala[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isFocused = useIsFocused();

    // --- STATE-URI NOI PENTRU UI ---
    const [activeFilter, setActiveFilter] = useState('month'); // Default: Luna curenta
    const [activeCategory, setActiveCategory] = useState('All'); // Default: Toate categoriile

    const [customStart, setCustomStart] = useState(new Date());
    const [customEnd, setCustomEnd] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);//pt a arata sau ascunde calendarul in functie de ce trebuie
    const [pickerMode, setPickerMode] = useState<'start' | 'end'>('start');//pt a sti ce data modificam

    const onDateChange = (event: any, selectedDate: Date | undefined) => {
        setShowPicker(Platform.OS === 'ios'); //pe ios ramane deschis, pe androi se inchide singur
        if (event.type === 'dismissed') {
            setShowPicker(false);
            return;
        }
        if (selectedDate) {
            if (pickerMode === 'start') {
                setCustomStart(selectedDate);
            } else {
                setCustomEnd(selectedDate);
            }
        }
    };

    const openDatePicker = (mode: 'start' | 'end') => {
        setPickerMode(mode);
        setShowPicker(true);
    };


    // 1. Încărcarea datelor (Logica veche, neschimbată momentan)
    useEffect(() => {
        const incarcaCheltuieli = async () =>{
            setIsLoading(true);
            try{
                let dateIncarcate: Cheltuiala[] = [];
                if(authStatus === 'guest'){
                    const cheltuieliJson = await AsyncStorage.getItem('cheltuieliSalvate');
                    if (cheltuieliJson !== null){
                        const cheltuieliSalvate = JSON.parse(cheltuieliJson);
                        dateIncarcate = cheltuieliSalvate.map((c: any) => ({
                            ...c,
                            data: new Date(c.data),
                        }));
                    }
                } else if (authStatus === 'loggedIn'){
                    const{data, error} = await supabase
                        .from('cheltuieli')
                        .select('*');
                    if (error) throw error;
                    if (data){
                        dateIncarcate = data.map((c: any) => ({
                            ...c,
                            id: c.id.toString(),
                            data: new Date(c.data),
                        }));
                    }
                }
                setCheltuieli(dateIncarcate);
            } catch(e) {
                console.error("Error loading expenses:", e);
            } finally {
                setIsLoading(false);
            }
        };
        if(isFocused) {
            incarcaCheltuieli();
        }
    }, [authStatus, isFocused]);

    const getStartDate = () =>{
        const now = new Date();
        const start = new Date();

        switch(activeFilter){
            case '7days':
                start.setDate(now.getDate() - 7);//incepe de azi si scadem 7 zile.
                break;
            case 'month':
                start.setDate(1);//pun de la ziua 1 ca sa faca pe luna respectiva, nu pe last 30 days
                break;
            case 'year':
                start.setMonth(0, 1);// 1 ianuarie din anul curent
                break;
            case 'custom':
                start.setTime(customStart.getTime());
                break;
            case 'all':
                return new Date(0); //data minima posibila
        }
        start.setHours(0,0,0,0);//setam la inceputul zilei
        return start;
    };
    //aplic efectiv diltrele pe lista de cheltuieli
    const filteredExpenses = cheltuieli.filter((item) =>{
        const itemDate = new Date(item.data);
        const startDate = getStartDate();

        //pentru custom trebuie sa stiu si data de final
        let matchesTime = false;
        if(activeFilter === 'custom') {
            //setez finalul zilei selecatate pentru a inclusde si ziua aia
            const end = new Date(customEnd);
            end.setHours(23,59,59,999);
            matchesTime = itemDate >= startDate && itemDate <= end;
        } else {
            matchesTime = itemDate >= startDate;
        }
        
        //verificam categoria
        const matchesCategory = activeCategory === 'All' || item.categorie === activeCategory;
        //returnez true doar daca ambele conditii sunt indeplinite
        return matchesTime && matchesCategory;
    });

    // calcul folosind filteredExpenses
    const getChartData = () => {
        const totaluri: { [key: string]: number } = {};
        filteredExpenses.forEach((item) => {
            if(totaluri[item.categorie]){
                totaluri[item.categorie] += item.suma;
            } else{
                 totaluri[item.categorie] = item.suma;
            }
        });
        
        return Object.keys(totaluri).map((numeCat) =>({
            name: numeCat,
            population: totaluri[numeCat],
            color: CULORI_CATEGORII[numeCat] || '#ccc',
            legendFontColor: '#bbb',
            legendFontSize: 12
        })).sort((a, b) => b.population - a.population);
    };
    //bar chart ul
const getTrendData = () => {
        const dataMap: { [key: string]: number } = {}; 
        const labels: string[] = [];

        // 1. SETĂM START ȘI END
        let end = new Date(); 
        let start = new Date(getStartDate());

        if (activeFilter === 'custom') {
            end = new Date(customEnd);
        }

        // RESETĂM ORELE (CRITIC PENTRU CUSTOM)
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Ajustări speciale
        if (activeFilter === 'month') start.setDate(1); 
        if (activeFilter === 'all') {
             if (cheltuieli.length > 0) {
                const dateCheltuieli = cheltuieli.map(c => c.data.getTime());
                start = new Date(Math.min(...dateCheltuieli));
                start.setDate(1); 
                start.setHours(0, 0, 0, 0);
             } else {
                 start = new Date(new Date().getFullYear(), 0, 1); 
             }
        }

        // 2. DECIDEM GRUPAREA (Zile vs Luni)
        let gruparePeLuni = false;

        if (activeFilter === 'year' || activeFilter === 'all') {
            gruparePeLuni = true;
        } else if (activeFilter === 'custom') {
            // Calculăm diferența de zile
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            if (diffDays > 30) gruparePeLuni = true;
        }

        if (gruparePeLuni) start.setDate(1);

        // 3. GENERĂM AXA TIMPULUI (AICI ERA PROBLEMA)
        // Acum bucla rulează PENTRU TOATE CAZURILE, inclusiv Custom
        let current = new Date(start);
        
        while (current <= end) {
            let label = '';
            
            if (gruparePeLuni) {
                // Mod Luni
                const monthName = current.toLocaleString('default', { month: 'short' });
                const year = current.getFullYear().toString().slice(-2);
                label = `${monthName} '${year}`;
                // Avansăm o lună
                current.setMonth(current.getMonth() + 1);
            } else {
                // Mod Zile
                label = `${current.getDate()}/${current.getMonth() + 1}`;
                // Avansăm o zi
                current.setDate(current.getDate() + 1);
            }
            
            labels.push(label);
            dataMap[label] = 0; // Punem 0 peste tot
        }

        // 4. UMPLEM CU DATE
        filteredExpenses.forEach((item) => {
            let label = '';
            if (gruparePeLuni) {
                const monthName = item.data.toLocaleString('default', { month: 'short' });
                const year = item.data.getFullYear().toString().slice(-2);
                label = `${monthName} '${year}`;
            } else {
                label = `${item.data.getDate()}/${item.data.getMonth() + 1}`;
            }

            if (dataMap[label] !== undefined) {
                dataMap[label] += item.suma;
            }
        });

        if (labels.length === 0) return { labels: ["No Data"], datasets: [{ data: [0] }] };

        return {
            labels: labels,
            datasets: [{ data: labels.map(label => dataMap[label]) }]
        };
    };
    // calculul totalurilor pe datele filtrate
    const totalCheltuit = filteredExpenses.reduce((acc,c) => acc + c.suma, 0);
    //calculam media zilnica( daca e 7 zile impart la 7, daca e month impart la ziua curenta, etc)
    let divizorZile = 1;
    if(activeFilter === '7days')
        divizorZile = 7;
    else if(activeFilter === 'month')
        divizorZile = new Date().getDate();
    else if(activeFilter === 'year'){
       //calculam a cata zi din an este
        const now = new Date();
        const start = new Date (now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        divizorZile = Math.floor(diff/ (1000 * 60 * 60 * 24));
    }
    else if(activeFilter === 'custom'){
        //calculam diferenta in milisecunde intre final si start
        const diffTime = Math.abs(customEnd.getTime() - customStart.getTime());
        //convertim milisecundele in zile
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         divizorZile = diffDays + 1; //adaugam 1 ca sa includem si ziua de start
    }
    else if(activeFilter === 'all'){
        if(cheltuieli.length > 0){
            //gasirea datei primei cheltuieli
            const minTime = Math.min(...cheltuieli.map(c => c.data.getTime()));
            const firstDate = new Date(minTime);
            const now = new Date();
            //calcularea zilelor dintre prima cheltuiala si azi
            const diffTime = Math.abs(now.getTime() - firstDate.getTime());
            divizorZile = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            divizorZile += 1; //includem si ziua primei cheltuieli
        } else {
            divizorZile = 1; //evitam impartirea la 0 daca nu avem cheltuieli
        }
    }
    //evitam impartirea la 0
    const dailyAverage = divizorZile > 0 ? totalCheltuit / divizorZile : totalCheltuit;

    //salvam datele intr o variabila ca sa le numaram
    const trendData = getTrendData();

    //calculul latimii per bara
    const chartWidth = trendData.labels.length * 50 + 60;
    const categoryList = getChartData();

    // --- UI RENDER ---
    return(
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Statistics</Text>
            </View>

            {isLoading ? (
                <ActivityIndicator size="large" color='#fff' style={{marginTop: 50}}/>
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    
                    {/* ZONA 1: TIME FILTERS (PILLS) */}
                    <View style={styles.filterSection}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                            {TIME_FILTERS.map((filter) => (
                                <Pressable 
                                    key={filter.id}
                                    style={[
                                        styles.filterPill, 
                                        activeFilter === filter.id && styles.filterPillActive
                                    ]}
                                    onPress={() => setActiveFilter(filter.id)}
                                >
                                    <Text style={[
                                        styles.filterText,
                                        activeFilter === filter.id && styles.filterTextActive
                                    ]}>
                                        {filter.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                      {activeFilter === 'custom' && (
        <View style={styles.customDateContainer}>
            <Pressable onPress={() => openDatePicker('start')} style={styles.dateButton}>
                <MaterialCommunityIcons name="calendar-arrow-right" size={20} color="#aaa" />
                <Text style={styles.dateButtonText}>
                    {customStart.toLocaleDateString('ro-RO')}
                </Text>
            </Pressable>
            
            <Text style={{color:'#555'}}>—</Text>

            <Pressable onPress={() => openDatePicker('end')} style={styles.dateButton}>
                <Text style={styles.dateButtonText}>
                    {customEnd.toLocaleDateString('ro-RO')}
                </Text>
                <MaterialCommunityIcons name="calendar-arrow-left" size={20} color="#aaa" />
            </Pressable>
        </View>
    )}
    {showPicker && (
        <DateTimePicker
            value={pickerMode === 'start' ? customStart : customEnd}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()} 
        />
    )}
                    </View>

                    {/* ZONA 2: CATEGORY CHIPS */}
                    <View style={styles.categorySection}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                            {CATEGORII_LISTA.map((cat, index) => (
                                <Pressable
                                    key={index}
                                    style={[
                                        styles.categoryChip,
                                        activeCategory === cat && { backgroundColor: CULORI_CATEGORII[cat] || '#007AFF', borderColor: 'transparent' }
                                    ]}
                                    onPress={() => setActiveCategory(cat)}
                                >
                                    <Text style={[
                                        styles.categoryText,
                                        activeCategory === cat && { color: 'white', fontWeight: 'bold' }
                                    ]}>
                                        {cat}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    {/* ZONA 3: KPI CARDS (TOTAL & AVG) */}
                    <View style={styles.cardsRow}>
                        {/* Card Total */}
                        <View style={styles.kpiCard}>
                            <View style={styles.iconCircle}>
                                <MaterialCommunityIcons name="wallet-outline" size={24} color="#4BC0C0" />
                            </View>
                            <Text style={styles.cardLabel}>Total Spent</Text>
                            <Text style={styles.cardValue}>{totalCheltuit.toFixed(2)} <Text style={styles.currency}>RON</Text></Text>
                        </View>

                        {/* Card Average */}
                        <View style={styles.kpiCard}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 99, 132, 0.2)' }]}>
                                <MaterialCommunityIcons name="chart-timeline-variant" size={24} color="#FF6384" />
                            </View>
                            <Text style={styles.cardLabel}>Daily Avg</Text>
                            <Text style={styles.cardValue}>{dailyAverage.toFixed(2)} <Text style={styles.currency}>RON</Text></Text>
                        </View>
                    </View>

                    {/* ZONA 4: CHART */}
                    {filteredExpenses.length > 0 ? (
                        <View style={styles.chartContainer}>
                            <Text style={styles.sectionTitle}>Spending Trend</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <BarChart
                                    data={trendData}
                                    width={chartWidth}
                                    height={220}
                                    yAxisLabel=""
                                    yAxisSuffix=" RON"
                                    fromZero={true}//ca sa inceapa de la 0 axa y
                                    chartConfig={{
                                        backgroundColor: "#1E1E1E",
                                        backgroundGradientFrom: "#1E1E1E",
                                        backgroundGradientTo: "#1E1E1E",
                                        decimalPlaces: 0, //fara zecimale pe axa y
                                        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                        style: {
                                            borderRadius: 16
                                        },
                                        barPercentage: 0.5,
                                    }}
                                    style={{
                                        marginVertical: 8,
                                        borderRadius: 16,
                                        marginRight: 20,
                                    }}
                                    verticalLabelRotation={0}
                                />
                            </ScrollView>
                            <PieChart
                                data={getChartData()}
                                width={SCREEN_WIDTH - 30}
                                height={220}
                                chartConfig={{
                                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                }}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={"15"}
                                absolute
                            />
                        </View>
                    ) : (
                        <Text style={styles.noDataText}>No expenses for this period.</Text>
                    )}
                    
                    {/* Zona 5: lista a cheltuielilor */}
                    <View style={styles.listContainer}>
                        <Text style={styles.sectionTitle}>
                            {activeCategory === 'All' ? 'Top Categories' : 'Transactions List'}
                        </Text>
                        {activeCategory === 'All' ? (
                            categoryList.map((item: any, index: number) => (
                                <View key={index} style={styles.listItem}>
                                    <View style={[styles.iconCircleSmall, {backgroundColor: item.color }]}>
                                        <MaterialCommunityIcons name="shape-outline" size={20} color="#white" />
                                    </View>
                                    <Text style={styles.listItemName}>{item.name}</Text>
                                    <Text style={styles.listItemValue}>{item.population.toFixed(2)} RON</Text>
                                </View>
                            ))
                        ) : (
                            filteredExpenses.sort((a, b) =>b.data.getTime() - a.data.getTime()).map((item) => (
                                <View key={item.id} style={styles.listItem}>
                                    <View style={styles.dateBox}>
                                        <Text style={styles.dateDay}>{item.data.getDate()}</Text>
                                        <Text style={styles.dateMonth}>{item.data.toLocaleString('default', { month: 'short' })}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.listItemName}numberOfLines={1}>{item.descriere}</Text>
                                        <Text style={styles.subText}>{item.data.toLocaleString()}</Text>                                    
                                    </View>
                                    
                                    <Text style={styles.listItemValue}>{item.suma.toFixed(2)} RON</Text>
                                 </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1E1E1E',
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        paddingTop: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    // Filters Styles
    filterSection: {
        marginBottom: 15,
    },
    categorySection: {
        marginBottom: 20,
    },
    filterScroll: {
        paddingHorizontal: 20,
    },
    filterPill: {
        backgroundColor: '#333',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#444',
    },
    filterPillActive: {
        backgroundColor: '#007AFF', // Albastru cand e activ
        borderColor: '#007AFF',
    },
    filterText: {
        color: '#aaa',
        fontWeight: '600',
    },
    filterTextActive: {
        color: 'white',
    },
    // Category Chips
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 15,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#555',
        backgroundColor: 'transparent',
    },
    categoryText: {
        color: '#ccc',
        fontSize: 13,
    },
    // KPI Cards
    cardsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    kpiCard: {
        backgroundColor: '#333',
        width: '48%',
        padding: 15,
        borderRadius: 16,
        elevation: 4,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(75, 192, 192, 0.2)', // verde translucid
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardLabel: {
        color: '#aaa',
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 5,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    cardValue: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
    },
    currency: {
        fontSize: 14,
        color: '#888',
        fontWeight: 'normal',
    },
    // Chart Area
    chartContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        alignSelf: 'flex-start',
        marginLeft: 20,
    },
    noDataText: {
        color: '#aaa',
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
    },
    customDateContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
        gap: 10,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2A2A2A',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
        gap: 8,
    },
    dateButtonText: {
        color: 'white',
        fontSize: 14,
    },
    listContainer:{
        marginTop: 20,
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
    },
    iconCircleSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    listItemName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    listItemValue: {
        color: '#4BC0C0',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dateBox: {
        backgroundColor: '#222',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignItems: 'center',
        minWidth: 45,
    },
    dateDay: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    dateMonth: {
        color: '#aaa',
        fontSize: 10,
        textTransform: 'uppercase',
    },
    subText: {
        color: '#777',
        fontSize: 12,
        marginTop: 2,
    },
});