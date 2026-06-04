import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const resources = [
  { title: 'Emergency contacts', icon: 'call-outline' as const },
  { title: 'Legal support', icon: 'document-text-outline' as const },
  { title: 'Nearby shelters', icon: 'location-outline' as const },
];

export default function ResourcesScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Resources</Text>
        <Text style={styles.subtitle}>Find practical support when you need it.</Text>

        <View style={styles.resourceList}>
          {resources.map((resource) => (
            <Pressable accessibilityRole="button" key={resource.title} style={styles.resourceCard}>
              <View style={styles.iconCircle}>
                <Ionicons name={resource.icon} size={22} color="#1F5857" />
              </View>
              <Text style={styles.resourceTitle}>{resource.title}</Text>
              <Ionicons name="chevron-forward" size={20} color="#B5C0BE" />
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
  resourceList: {
    gap: 12,
    marginTop: 26,
  },
  resourceCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 74,
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
  resourceTitle: {
    color: '#102120',
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    marginLeft: 14,
  },
});
