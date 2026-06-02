import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const events = [
  { date: 'May 19', title: 'Verbal incident documented', detail: 'Voice note · 1 photo' },
  { date: 'May 17', title: 'Property damage recorded', detail: '3 photos · written note' },
  { date: 'May 15', title: 'Follow-up note added', detail: 'Written note' },
];

export default function TimelineScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Timeline</Text>
        <Text style={styles.subtitle}>Review your recorded moments in order.</Text>

        <View style={styles.list}>
          {events.map((event) => (
            <View key={event.title} style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="time-outline" size={21} color="#1F5857" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.date}>{event.date}</Text>
                <Text style={styles.cardTitle}>{event.title}</Text>
                <Text style={styles.detail}>{event.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },
  content: {
    padding: 24,
    paddingBottom: 110,
  },
  title: {
    color: '#102120',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 30,
  },
  subtitle: {
    color: '#71807E',
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    marginTop: 6,
  },
  list: {
    gap: 12,
    marginTop: 26,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 16,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#EAF3F1',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardText: {
    flex: 1,
    marginLeft: 14,
  },
  date: {
    color: '#8D9998',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  cardTitle: {
    color: '#081615',
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    marginTop: 2,
  },
  detail: {
    color: '#8D9998',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginTop: 4,
  },
});
