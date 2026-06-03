import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const captureActions = [
  {
    title: 'Voice\nNote',
    icon: 'mic-outline' as const,
    color: '#4B86C5',
    backgroundColor: '#EEF4FC',
  },
  {
    title: 'Photo\n& Video',
    icon: 'camera-outline' as const,
    color: '#5C9A8E',
    backgroundColor: '#EFF7F4',
  },
  {
    title: 'Written\nNote',
    icon: 'file-document-outline' as const,
    color: '#225963',
    backgroundColor: '#EEF2F2',
  },
];

const recentMoments = [
  {
    title: 'Verbal incident documented',
    meta: 'Voice note · 1 photo',
    time: 'May 19 · 8:42 PM',
    color: '#E8B34E',
  },
  {
    title: 'Property damage recorded',
    meta: '3 photos · written note',
    time: 'May 17 · 3:15 PM',
    color: '#D76670',
  },
  {
    title: 'Follow-up note added',
    meta: 'Written note',
    time: 'May 15 · 10:08 AM',
    color: '#75AFA4',
  },
];

export default function HomeScreen() {
  function handleCapturePress(title: string) {
    if (title === 'Written\nNote') {
      router.push('/written-note' as Href);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <SafeAreaView edges={['top']} style={styles.heroSafeArea}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Ionicons name="moon-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.brandName}>nura</Text>
              <Pressable accessibilityRole="button" style={styles.bellButton}>
                <Ionicons name="notifications-outline" size={22} color="#B9D9D4" />
                <View style={styles.notificationDot} />
              </Pressable>
            </View>

            <View style={styles.greetingBlock}>
              <Text style={styles.eyebrow}>Good evening</Text>
              <Text style={styles.userName}>Sarah</Text>
              <Text style={styles.safetyText}>Thursday, May 21 · You are safe right now</Text>
            </View>

            <Pressable accessibilityRole="button" style={styles.recordCard}>
              <View style={styles.recordIcon}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.recordTextBlock}>
                <Text style={styles.recordTitle}>Record a moment</Text>
                <Text style={styles.recordSubtitle}>Capture evidence securely</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A6C7C2" />
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>QUICK CAPTURE</Text>
          <View style={styles.quickCaptureRow}>
            {captureActions.map((action) => (
              <Pressable
                accessibilityRole="button"
                key={action.title}
                onPress={() => handleCapturePress(action.title)}
                style={styles.captureCard}>
                <View style={[styles.captureIcon, { backgroundColor: action.backgroundColor }]}>
                  {action.icon === 'file-document-outline' ? (
                    <MaterialCommunityIcons name={action.icon} size={22} color={action.color} />
                  ) : (
                    <Ionicons name={action.icon} size={22} color={action.color} />
                  )}
                </View>
                <Text style={styles.captureTitle}>{action.title}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT MOMENTS</Text>
            <Pressable accessibilityRole="button">
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>

          <View style={styles.momentList}>
            {recentMoments.map((moment) => (
              <Pressable accessibilityRole="button" key={moment.title} style={styles.momentCard}>
                <View style={[styles.momentDot, { backgroundColor: moment.color }]} />
                <View style={styles.momentText}>
                  <Text style={styles.momentTime}>{moment.time}</Text>
                  <Text style={styles.momentTitle}>{moment.title}</Text>
                  <Text style={styles.momentMeta}>{moment.meta}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CAD3D1" />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <Pressable accessibilityRole="button" style={styles.floatingAction}>
        <MaterialCommunityIcons name="pulse" size={32} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },
  scrollContent: {
    paddingBottom: 112,
  },
  hero: {
    backgroundColor: '#1F5857',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  heroSafeArea: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingTop: 12,
  },
  brandMark: {
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  brandName: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 20,
    marginLeft: 4,
  },
  bellButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginLeft: 'auto',
    position: 'relative',
    width: 40,
  },
  notificationDot: {
    backgroundColor: '#E06468',
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    right: 10,
    top: 9,
    width: 6,
  },
  greetingBlock: {
    marginTop: 22,
  },
  eyebrow: {
    color: '#84C3BA',
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
  },
  userName: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    lineHeight: 34,
    marginTop: 2,
  },
  safetyText: {
    color: '#A8CFC8',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginTop: 4,
  },
  recordCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 26,
    minHeight: 76,
    paddingHorizontal: 18,
  },
  recordIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  recordTextBlock: {
    flex: 1,
    marginLeft: 16,
  },
  recordTitle: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
  },
  recordSubtitle: {
    color: '#B8E1DB',
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    backgroundColor: '#F5F7F5',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  sectionTitle: {
    color: '#A7ADAF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1,
  },
  quickCaptureRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  captureCard: {
    alignItems: 'center',
    aspectRatio: 0.98,
    backgroundColor: '#FFFFFF',
    borderColor: '#E9EDED',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 3,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#12312E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  captureIcon: {
    alignItems: 'center',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginBottom: 10,
    width: 38,
  },
  captureTitle: {
    color: '#020B0C',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
  },
  seeAllText: {
    color: '#79908E',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  momentList: {
    gap: 12,
    marginTop: 12,
  },
  momentCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    minHeight: 88,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#16312F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  momentDot: {
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  momentText: {
    flex: 1,
    marginLeft: 14,
  },
  momentTime: {
    color: '#A4ACAE',
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  momentTitle: {
    color: '#071314',
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    marginTop: 3,
  },
  momentMeta: {
    color: '#A4ACAE',
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginTop: 5,
  },
  floatingAction: {
    alignItems: 'center',
    backgroundColor: '#1F5857',
    borderRadius: 30,
    bottom: 74,
    elevation: 8,
    height: 60,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    shadowColor: '#12312F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    width: 60,
  },
});
