import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const steps = ['Check safe contacts', 'Review exit route', 'Pack essentials'];

export default function PlanScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Plan</Text>
        <Text style={styles.subtitle}>Keep your safety steps close and private.</Text>

        <View style={styles.primaryCard}>
          <View style={styles.shieldCircle}>
            <Ionicons name="shield-checkmark-outline" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.primaryText}>
            <Text style={styles.primaryTitle}>Safety plan</Text>
            <Text style={styles.primarySubtitle}>3 of 5 items completed</Text>
          </View>
          <Ionicons name="chevron-forward" size={21} color="#A6C7C2" />
        </View>

        <View style={styles.stepList}>
          {steps.map((step, index) => (
            <Pressable accessibilityRole="button" key={step} style={styles.stepCard}>
              <View style={[styles.checkCircle, index === 0 && styles.checkCircleDone]}>
                {index === 0 ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </Pressable>
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
  primaryCard: {
    alignItems: 'center',
    backgroundColor: '#1F5857',
    borderRadius: 18,
    flexDirection: 'row',
    marginTop: 26,
    padding: 18,
  },
  shieldCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  primaryText: {
    flex: 1,
    marginLeft: 14,
  },
  primaryTitle: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
  },
  primarySubtitle: {
    color: '#B8E1DB',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginTop: 2,
  },
  stepList: {
    gap: 12,
    marginTop: 18,
  },
  stepCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 16,
  },
  checkCircle: {
    alignItems: 'center',
    borderColor: '#C9D2D0',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  checkCircleDone: {
    backgroundColor: '#1F5857',
    borderColor: '#1F5857',
  },
  stepText: {
    color: '#102120',
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    marginLeft: 14,
  },
});
