import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Switch,
} from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '@/constants/tokens';
import { useAppStore } from '@/store/useAppStore';
import { UserPlus, X } from 'lucide-react-native';

export function AddEmergencyContactModal() {
  const { isAddContactModalOpen, openAddContactModal, addEmergencyContact } =
    useAppStore();

  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Sister');
  const [phone, setPhone] = useState('+977 98');
  const [notifyOnRisk, setNotifyOnRisk] = useState(true);

  const relations = ['Sister', 'Mother', 'Brother', 'Kin', 'Spouse', 'Elder'];

  if (!isAddContactModalOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    await addEmergencyContact({
      name: name.trim(),
      relation,
      phone: phone.trim(),
      isActive: true,
      notifyOnRisk,
    });
    setName('');
    openAddContactModal(false);
  };

  return (
    <Modal visible={isAddContactModalOpen} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <UserPlus size={20} color={Colors.meltwater} />
              <Text style={styles.title}>Add Emergency Contact</Text>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={() => openAddContactModal(false)}>
              <X size={18} color={Colors.slateFog} />
            </Pressable>
          </View>

          <Text style={styles.desc}>
            Kin instantly receive satellite distress alerts with your real-time terrain pinpoint.
          </Text>

          {/* Form */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dorjee Tamang"
              placeholderTextColor={Colors.slateFog}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Relationship</Text>
            <View style={styles.relationsRow}>
              {relations.map((rel) => (
                <Pressable
                  key={rel}
                  style={[
                    styles.relationChip,
                    relation === rel && styles.relationChipActive,
                  ]}
                  onPress={() => setRelation(rel)}>
                  <Text
                    style={[
                      styles.relationChipText,
                      relation === rel && styles.relationChipTextActive,
                    ]}>
                    {rel}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mobile / Satellite Radio Handle</Text>
            <TextInput
              style={styles.input}
              placeholder="+977 9801-XXXXXX"
              placeholderTextColor={Colors.slateFog}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelStack}>
              <Text style={styles.switchTitle}>Notify me when they are at risk</Text>
              <Text style={styles.switchSub}>
                Receive alerts if their valley basin enters Watch or Warning
              </Text>
            </View>
            <Switch
              value={notifyOnRisk}
              onValueChange={setNotifyOnRisk}
              trackColor={{ false: Colors.borderSubtle, true: Colors.cirqueTeal }}
            />
          </View>

          {/* Save Button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              !name.trim() && styles.saveButtonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={handleSave}
            disabled={!name.trim()}>
            <Text style={styles.saveButtonText}>Save Emergency Kin</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 26, 40, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadows.sheet,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.moraineInk,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.glacierMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desc: {
    fontSize: 12,
    color: Colors.slateFog,
    lineHeight: 18,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.moraineInk,
  },
  input: {
    height: 48,
    backgroundColor: Colors.glacierMist,
    borderRadius: Radii.button, borderCurve: 'continuous',
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.moraineInk,
    fontWeight: '500',
  },
  relationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  relationChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Colors.firn,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  relationChipActive: {
    backgroundColor: Colors.meltwater,
    borderColor: Colors.meltwater,
  },
  relationChipText: {
    fontSize: 12,
    color: Colors.moraineInk,
    fontWeight: '500',
  },
  relationChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  switchLabelStack: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.moraineInk,
  },
  switchSub: {
    fontSize: 11,
    color: Colors.slateFog,
    marginTop: 2,
  },
  saveButton: {
    height: 52,
    borderRadius: Radii.button, borderCurve: 'continuous',
    backgroundColor: Colors.meltwater,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
