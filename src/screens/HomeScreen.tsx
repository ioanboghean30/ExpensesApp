import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';

export default function HomeScreen({ navigation, authStatus }: any) {
    const isFocused = useIsFocused();
    const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
    const [totalMonth, setTotalMonth] = useState(0);

    // functie pt incarcare si calculare date
    const loadHomeData = useCallback(async () => {
        try {
            let allExpenses: any[] = [];

            // verificam statusul logat sau guest
            if (authStatus === 'guest') {
                const json = await AsyncStorage.getItem('cheltuieliSalvate');
                if (json) {
                    allExpenses = JSON.parse(json).map((c: any) => ({ 
                        ...c, 
                        date: new Date(c.data) 
                    }));
                }
            } else if (authStatus === 'loggedIn') {
                // Luăm ultimele 50 de cheltuieli pentru a fi siguri că prindem luna curentă
                const { data } = await supabase
                    .from('cheltuieli')
                    .select('*')
                    .order('data', { ascending: false })
                    .limit(300);

                if (data) {
                    allExpenses = data.map((c: any) => ({ 
                        ...c, 
                        date: new Date(c.data) 
                    }));
                }
            }

            // B. Calculăm Totalul pe Luna Curentă
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const thisMonthExpenses = allExpenses.filter(e => e.date >= startOfMonth);
            const total = thisMonthExpenses.reduce((acc, curr) => acc + curr.suma, 0);
            setTotalMonth(total);

            // C. Luăm ultimele 3 pentru lista Recent Activity
            // Le sortăm din nou descrescător după dată pentru afișare
            allExpenses.sort((a, b) => b.date.getTime() - a.date.getTime());
            setRecentExpenses(allExpenses.slice(0, 3));

        } catch (e) {
            console.error("Eroare la încărcarea datelor:", e);
        }
    }, [authStatus]);

    // Reîncărcăm datele de fiecare dată când userul revine pe ecran
    useEffect(() => {
        if (isFocused) {
            loadHomeData();
        }
    }, [isFocused, loadHomeData]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
                
                {/* ZONA 1: Header */}
                <View style={styles.header}>
                    <Text style={styles.greeting}>Welcome!</Text>
                </View>

                {/* Card Principal - Total Luna Curentă */}
                <View style={styles.heroCard}>
                    <Text style={styles.heroLabel}>Spent this Month</Text>
                    <Text style={styles.heroValue}>
                        {totalMonth.toFixed(2)} <Text style={styles.currency}>RON</Text>
                    </Text>
                </View>

                {/* ZONA 2: Butoane Acțiune (Grid) */}
                <View style={styles.actionsGrid}>
                    <Pressable 
                        style={styles.actionButton} 
                        onPress={() => navigation.navigate('AddExpenseScreen')} 
                    >
                        <View style={[styles.iconBox, { backgroundColor: 'rgba(75, 192, 192, 0.2)' }]}>
                            <MaterialCommunityIcons name="plus" size={32} color="#4BC0C0" />
                        </View>
                        <Text style={styles.actionText}>Add Expense</Text>
                    </Pressable>

                    <Pressable 
                        style={styles.actionButton} 
                        onPress={() => navigation.navigate('StatisticsScreen')}
                    >
                        <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 99, 132, 0.2)' }]}>
                            <MaterialCommunityIcons name="chart-bar" size={32} color="#FF6384" />
                        </View>
                        <Text style={styles.actionText}>Statistics</Text>
                    </Pressable>
                </View>

                {/* ZONA 3: Lista Scurtă (Recent) */}
                <View style={styles.recentSection}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    
                    {recentExpenses.length === 0 ? (
                        <Text style={{ color: '#666', fontStyle: 'italic', marginTop: 10 }}>
                            No expenses yet.
                        </Text>
                    ) : (
                        recentExpenses.map((item, index) => (
                            <View key={index} style={styles.transactionItem}>
                                <View>
                                    <Text style={styles.transName}>{item.descriere}</Text>
                                    <Text style={styles.transDate}>{item.date.toLocaleDateString()}</Text>
                                </View>
                                <Text style={styles.transValue}>-{item.suma.toFixed(2)} RON</Text>
                            </View>
                        ))
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1E1E1E', 
        paddingHorizontal: 20,
    },
    header: {
        marginTop: 20,
        marginBottom: 10,
    },
    greeting: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
    },
    // HERO CARD
    heroCard: {
        backgroundColor: '#4BC0C0', 
        borderRadius: 20,
        padding: 25,
        marginBottom: 30,
        elevation: 5,
    },
    heroLabel: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        marginBottom: 5,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    heroValue: {
        color: 'white',
        fontSize: 34,
        fontWeight: 'bold',
    },
    currency: {
        fontSize: 18,
        fontWeight: 'normal',
    },
    // GRID
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    actionButton: {
        backgroundColor: '#333',
        width: '48%', 
        padding: 20,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    actionText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    // RECENT LIST
    recentSection: {
        marginTop: 10,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#2A2A2A',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
    },
    transName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    transDate: {
        color: '#888',
        fontSize: 12,
        marginTop: 2,
    },
    transValue: {
        color: '#FF6384', 
        fontSize: 16,
        fontWeight: 'bold',
    },
});