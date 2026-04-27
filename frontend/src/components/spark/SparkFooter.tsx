import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { sparkTheme } from '../../theme';

const BUILT_WITH = ['SDXL', 'Wan 2.2 I2V', 'Expo / React Native', 'FastAPI'];

const MODELS = [
  'juggernautXL_ragnarokBy',
  'wan2.2_i2v_high_noise_14B',
  'wan2.2_i2v_low_noise_14B',
  'umt5_xxl',
  'wan_2.1_vae',
];

export function SparkFooter() {
  const { width } = useWindowDimensions();
  const isStacked = width < 720;

  return (
    <View style={styles.wrap}>
      <View style={[styles.cols, isStacked && styles.colsStacked]}>
        <FooterCol heading="Built With">
          {BUILT_WITH.map((item) => (
            <Text key={item} style={styles.itemText}>{item}</Text>
          ))}
        </FooterCol>

        <FooterCol heading="Models">
          {MODELS.map((m) => (
            <Text key={m} style={styles.itemText}>{m}</Text>
          ))}
        </FooterCol>

        <FooterCol heading="About">
          <Text style={styles.itemText}>University thesis project (Licenta)</Text>
          <Text style={styles.itemText}>Local single-GPU inference</Text>
        </FooterCol>
      </View>

      <View style={styles.divider} />

      <Text style={styles.copyright}>© 2026 — Forge fantasy character cards with on-device AI</Text>
    </View>
  );
}

function FooterCol({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <View style={styles.col}>
      <Text style={styles.heading}>{heading}</Text>
      <View style={styles.colItems}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: sparkTheme.spacing[5],
    paddingVertical: sparkTheme.spacing[8],
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  cols: {
    flexDirection: 'row',
    gap: sparkTheme.spacing[8],
  },
  colsStacked: {
    flexDirection: 'column',
    gap: sparkTheme.spacing[6],
  },
  col: {
    flex: 1,
    gap: sparkTheme.spacing[4],
  },
  heading: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  colItems: {
    gap: sparkTheme.spacing[3],
  },
  itemText: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
  },
  divider: {
    height: 1,
    backgroundColor: sparkTheme.colors.border,
    marginVertical: sparkTheme.spacing[7],
  },
  copyright: {
    color: sparkTheme.colors.textDim,
    fontSize: sparkTheme.type.micro.fontSize,
    textAlign: 'center',
  },
});
