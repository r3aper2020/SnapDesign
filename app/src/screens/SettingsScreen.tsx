import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';

// Professional Icon Components
const SettingsIcon = ({ size = 24, color = '#666' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.8,
      height: size * 0.8,
      borderWidth: 2,
      borderColor: color,
      borderRadius: size * 0.1,
      backgroundColor: 'transparent',
      position: 'relative',
    }}>
      <View style={{
        position: 'absolute',
        top: size * 0.15,
        left: size * 0.15,
        width: size * 0.1,
        height: size * 0.1,
        borderRadius: size * 0.05,
        backgroundColor: color,
      }} />
      <View style={{
        position: 'absolute',
        top: size * 0.35,
        left: size * 0.15,
        width: size * 0.1,
        height: size * 0.1,
        borderRadius: size * 0.05,
        backgroundColor: color,
      }} />
      <View style={{
        position: 'absolute',
        top: size * 0.55,
        left: size * 0.15,
        width: size * 0.1,
        height: size * 0.1,
        borderRadius: size * 0.05,
        backgroundColor: color,
      }} />
    </View>
  </View>
);

const ThemeIcon = ({ size = 24, color = '#666' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.6,
      height: size * 0.6,
      borderRadius: size * 0.3,
      borderWidth: 2,
      borderColor: color,
      backgroundColor: 'transparent',
    }} />
    <View style={{
      position: 'absolute',
      top: size * 0.1,
      right: size * 0.1,
      width: size * 0.3,
      height: size * 0.3,
      borderRadius: size * 0.15,
      backgroundColor: color,
    }} />
  </View>
);

const BillingIcon = ({ size = 24, color = '#666' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.8,
      height: size * 0.5,
      borderWidth: 2,
      borderColor: color,
      borderRadius: size * 0.05,
      backgroundColor: 'transparent',
    }}>
      <View style={{
        position: 'absolute',
        top: size * 0.1,
        left: size * 0.1,
        width: size * 0.6,
        height: size * 0.1,
        backgroundColor: color,
        borderRadius: size * 0.02,
      }} />
      <View style={{
        position: 'absolute',
        top: size * 0.25,
        left: size * 0.1,
        width: size * 0.4,
        height: size * 0.1,
        backgroundColor: color,
        borderRadius: size * 0.02,
      }} />
    </View>
  </View>
);

const InfoIcon = ({ size = 24, color = '#666' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.6,
      height: size * 0.6,
      borderRadius: size * 0.3,
      borderWidth: 2,
      borderColor: color,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Text style={{
        fontSize: size * 0.3,
        fontWeight: 'bold',
        color: color,
        lineHeight: size * 0.3,
      }}>i</Text>
    </View>
  </View>
);

export const SettingsScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleBillingPress = () => {
    Alert.alert(
      'Billing Management',
      'Billing management will be available soon. This will integrate with Google Play and App Store subscription APIs.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const handleSupportPress = () => {
    Alert.alert(
      'Support',
      'Contact us at support@revibe.app for any questions or issues.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const handlePrivacyPress = () => {
    Alert.alert(
      'Privacy Policy',
      'Privacy policy will be available soon.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const handleTermsPress = () => {
    Alert.alert(
      'Terms of Service',
      'Terms of service will be available soon.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Background Image */}
      <Image 
        source={require('../../assets/background.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      {/* Fixed Header */}
      <View style={[styles.fixedHeader, { backgroundColor: 'transparent' }]}>
        <Image 
          source={require('../../assets/re-vibe.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Settings
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          Customize your app experience
        </Text>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <ThemeIcon size={20} color={theme.colors.primary.main} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Appearance
              </Text>
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                Dark Mode
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                {isDark ? 'Dark theme enabled' : 'Light theme enabled'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border.light, true: theme.colors.primary.main }}
              thumbColor={isDark ? theme.colors.primary.contrast : theme.colors.background.primary}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <SettingsIcon size={20} color={theme.colors.primary.main} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Notifications
              </Text>
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                Push Notifications
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                Get updates about new features and designs
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.colors.border.light, true: theme.colors.primary.main }}
              thumbColor={notificationsEnabled ? theme.colors.primary.contrast : theme.colors.background.primary}
            />
          </View>
        </View>

        {/* Billing Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <BillingIcon size={20} color={theme.colors.primary.main} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Billing & Subscription
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleBillingPress}
          >
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                Manage Subscription
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                View and manage your subscription
              </Text>
            </View>
            <Text style={[styles.chevron, { color: theme.colors.text.secondary }]}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <InfoIcon size={20} color={theme.colors.primary.main} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Support & Legal
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleSupportPress}
          >
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                Contact Support
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                Get help with the app
              </Text>
            </View>
            <Text style={[styles.chevron, { color: theme.colors.text.secondary }]}>
              ›
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handlePrivacyPress}
          >
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                Privacy Policy
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                How we protect your data
              </Text>
            </View>
            <Text style={[styles.chevron, { color: theme.colors.text.secondary }]}>
              ›
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleTermsPress}
          >
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                Terms of Service
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                App usage terms and conditions
              </Text>
            </View>
            <Text style={[styles.chevron, { color: theme.colors.text.secondary }]}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: theme.colors.text.secondary }]}>
            ReVibe v1.0.0
          </Text>
          <Text style={[styles.appCopyright, { color: theme.colors.text.secondary }]}>
            © 2024 ReVibe. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Fixed Header Section
  fixedHeader: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  logo: {
    width: 120,
    height: 120,
    marginTop: -30, // Crop 25% from top (120 * 0.25 = 30)
    marginBottom: -28, // Crop 25% from bottom (120 * 0.25 = 30) + original 2 margin
    overflow: 'hidden',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '300',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  appVersion: {
    fontSize: 14,
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 12,
    opacity: 0.6,
  },
});
