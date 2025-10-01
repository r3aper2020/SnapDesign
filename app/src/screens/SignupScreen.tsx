import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useRoute } from '@react-navigation/native';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '../types/subscription';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SignupScreenProps {
  navigation: any;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { signup, isLoading } = useAuth();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>(SubscriptionTier.FREE);

  useEffect(() => {
    const params = route?.params as { prefillEmail?: string; prefillPassword?: string; notice?: string } | undefined;
    if (params) {
      if (params.prefillEmail) setEmail(params.prefillEmail);
      if (params.prefillPassword) {
        setPassword(params.prefillPassword);
        setConfirmPassword(params.prefillPassword);
      }
      if (params.notice) setNotice(params.notice);
    }
  }, [route?.params]);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    const result = await signup(email.trim(), password, name.trim());
    setIsSubmitting(false);

    if (result.success) {
      // Navigate back to main app
      navigation.goBack();
    } else {
      Alert.alert('Signup Failed', result.error || 'Please try again');
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  const styles = createStyles(theme);
  const isWide = width >= 600;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ paddingBottom: Math.max(insets.bottom + 48, 48) }}
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: Math.max(insets.bottom + 48, 48) }]}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join SnapDesign and start creating</Text>
          </View>

          {notice ? (
            <View style={styles.noticeContainer}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Account Details</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor={theme.colors.text.secondary}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.colors.text.secondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  placeholderTextColor={theme.colors.text.secondary}
                  secureTextEntry
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor={theme.colors.text.secondary}
                  secureTextEntry
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Subscription Plans */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Choose Your Plan</Text>
              <View style={[styles.plansGrid, isWide ? styles.plansGridWide : undefined]}>
                {[SubscriptionTier.FREE, SubscriptionTier.CREATOR, SubscriptionTier.PROFESSIONAL].map((tier) => {
                  const plan = SUBSCRIPTION_PLANS[tier];
                  const isSelected = selectedPlan === tier;

                  return (
                    <TouchableOpacity
                      key={tier}
                      style={[
                        styles.planCard,
                        isSelected && styles.selectedPlan,
                        { borderColor: isSelected ? theme.colors.primary.main : theme.colors.border.primary },
                        isWide ? { width: '48%' } : { width: '100%' }
                      ]}
                      onPress={() => setSelectedPlan(tier)}
                      activeOpacity={0.85}
                    >
                      {isSelected && (
                        <LinearGradient
                          colors={theme.colors.gradient.primary}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.planAccent}
                        />
                      )}
                      <View style={styles.planHeader}>
                        <View style={styles.planInfo}>
                          <Text style={[styles.planName, { color: theme.colors.text.primary }]}>
                            {plan.name}
                          </Text>
                          <Text style={[styles.planPrice, { color: theme.colors.text.secondary }]}>
                            {plan.price === 0 ? 'Free' : `$${plan.price}/month`}
                          </Text>
                        </View>
                        <View style={[
                          styles.radioButton,
                          { borderColor: isSelected ? theme.colors.primary.main : theme.colors.border.primary }
                        ]}>
                          {isSelected && <View style={[styles.radioSelected, { backgroundColor: theme.colors.primary.main }]} />}
                        </View>
                      </View>
                      <Text style={[styles.planDescription, { color: theme.colors.text.secondary }]}>
                        Up to {plan.tokensPerMonth} tokens/month
                        {tier === SubscriptionTier.CREATOR && ' • Token rollover • Priority support'}
                        {tier === SubscriptionTier.PROFESSIONAL && ' • Token rollover • Priority support • Early access'}
                      </Text>
                      {tier === SubscriptionTier.PROFESSIONAL && isSelected && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularText}>Most Popular</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.signupButton, isSubmitting && styles.disabledButton]}
              onPress={handleSignup}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.colors.text.primary} />
              ) : (
                <Text style={styles.signupButtonText}>
                  {selectedPlan === SubscriptionTier.FREE ? 'Create Free Account' : 'Start Subscription'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={navigateToLogin}
              disabled={isSubmitting}
            >
              <Text style={styles.loginButtonText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          <View style={{ height: Math.max(insets.bottom, 24) }} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  sectionCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  signupButton: {
    backgroundColor: theme.colors.primary.main,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  noticeContainer: {
    backgroundColor: theme.colors.background.secondary,
    borderColor: theme.colors.border.primary,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  noticeText: {
    color: theme.colors.text.primary,
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border.primary,
  },
  dividerText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginHorizontal: 16,
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  loginButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionSection: {
    marginBottom: 24,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  plansGrid: {
    width: '100%',
    gap: 12,
  },
  plansGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  planCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  selectedPlan: {
    backgroundColor: theme.colors.background.secondary,
  },
  planAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
