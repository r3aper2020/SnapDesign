import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LightbulbIcon } from './icons/DesignIcons';

interface InspirationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectInspiration: (prompt: string) => void;
  theme: any;
}

const inspirationCategories = {
  'Holiday & Seasonal': [
    'Decorate this space for Christmas with lights and ornaments',
    'Add Halloween decorations and spooky elements',
    'Create a cozy Thanksgiving atmosphere with fall colors',
    'Add Easter decorations and spring elements',
    'Create a Valentine\'s Day romantic setting',
    'Design a New Year\'s Eve party space'
  ],
  'Simple Additions': [
    'Add a plant in the corner with a nice pot',
    'Place a reading chair by the window',
    'Add some artwork on the walls',
    'Put a small table and lamp in the corner',
    'Add a cozy throw blanket and pillows',
    'Place a mirror to reflect light'
  ],
  'Room Transformations': [
    'Transform into a cozy home office with plants and good lighting',
    'Create a Japanese zen garden with koi pond and bamboo',
    'Design a modern kitchen with island and pendant lights',
    'Make this a children\'s playroom with storage and bright colors',
    'Convert into a home theater with comfortable seating',
    'Create a meditation room with soft lighting'
  ],
  'Outdoor & Patio': [
    'Create a Mediterranean patio with terracotta pots and string lights',
    'Add outdoor seating and string lights for evening ambiance',
    'Design a vegetable garden with raised beds and trellises',
    'Create a cozy outdoor dining area with plants',
    'Build a fire pit area with comfortable seating',
    'Design a tropical oasis with palm plants'
  ],
  'Style & Aesthetic': [
    'Design a Scandinavian living room with light wood and plants',
    'Make this a bohemian bedroom with macrame and plants',
    'Create an industrial loft with exposed brick and metal accents',
    'Design a minimalist space with clean lines and neutral colors',
    'Create a vintage-inspired space with antique furniture',
    'Design a modern farmhouse with rustic elements'
  ],
  'Functional Spaces': [
    'Transform into a home gym with mirrors and equipment',
    'Create a craft room with storage and work surfaces',
    'Design a wine cellar with racks and tasting area',
    'Make this a home library with bookshelves and reading nook',
    'Create a home bar with seating and lighting',
    'Design a laundry room with organization systems'
  ]
};

export const InspirationModal: React.FC<InspirationModalProps> = ({
  visible,
  onClose,
  onSelectInspiration,
  theme,
}) => {
  const handleSelectPrompt = (prompt: string) => {
    onSelectInspiration(prompt);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      accessibilityLabel="Design inspiration modal"
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <LightbulbIcon size={20} color={theme.colors.accent.purple} />
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                Design Inspiration
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close inspiration modal"
              accessibilityRole="button"
            >
              <MaterialIcons 
                name="close" 
                size={20} 
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            accessibilityLabel="Inspiration categories and prompts"
          >
            {Object.entries(inspirationCategories).map(([category, prompts]) => (
              <View key={category} style={styles.categorySection}>
                <Text style={[styles.categoryTitle, { color: theme.colors.text.primary }]}>
                  {category}
                </Text>
                {prompts.map((prompt, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.promptItem, { 
                      backgroundColor: theme.colors.background.primary,
                      borderColor: theme.colors.border.light 
                    }]}
                    onPress={() => handleSelectPrompt(prompt)}
                    accessibilityLabel={`Select inspiration: ${prompt}`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.promptText, { color: theme.colors.text.primary }]}>
                      {prompt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  promptItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
