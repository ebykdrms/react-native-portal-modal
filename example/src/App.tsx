import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PortalModal,
  PortalProvider,
  RNModal,
} from 'react-native-portal-modal';

export default function App() {
  const [isPortalVisible, setIsPortalVisible] = useState(false);
  const [isRNModalVisible, setIsRNModalVisible] = useState(false);

  const closePortalModal = () => setIsPortalVisible(false);
  const closeRNModal = () => setIsRNModalVisible(false);

  return (
    <PortalProvider>
      <View style={styles.container}>
        <Text style={styles.title}>react-native-portal-modal</Text>
        <Text style={styles.subtitle}>PortalModal ve RNModal örneği</Text>

        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={() => setIsPortalVisible(true)}
        >
          <Text style={styles.buttonText}>PortalModal Aç</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setIsRNModalVisible(true)}
        >
          <Text style={styles.buttonText}>RNModal Aç</Text>
        </Pressable>

        <PortalModal
          isVisible={isPortalVisible}
          onBackdropPress={closePortalModal}
          onBackButtonPress={closePortalModal}
          enteringAnimation="slideInUp"
          exitingAnimation="slideOutDown"
          contentContainerStyle={styles.modalContentContainer}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>PortalModal</Text>
            <Text style={styles.modalDescription}>
              Bu modal, PortalProvider üzerinden render edilir.
            </Text>
            <Pressable style={styles.closeButton} onPress={closePortalModal}>
              <Text style={styles.closeButtonText}>Kapat</Text>
            </Pressable>
          </View>
        </PortalModal>

        <RNModal
          isVisible={isRNModalVisible}
          onBackdropPress={closeRNModal}
          onBackButtonPress={closeRNModal}
          enteringAnimation="zoomFadeIn"
          exitingAnimation="zoomFadeOut"
          contentContainerStyle={styles.modalContentContainer}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>RNModal</Text>
            <Text style={styles.modalDescription}>
              Bu modal, React Native Modal kullanır ve Provider gerektirmez.
            </Text>
            <Pressable style={styles.closeButton} onPress={closeRNModal}>
              <Text style={styles.closeButtonText}>Kapat</Text>
            </Pressable>
          </View>
        </RNModal>
      </View>
    </PortalProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f7f7f8',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  button: {
    minWidth: 220,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#0f766e',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalContentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalDescription: {
    color: '#374151',
    lineHeight: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
