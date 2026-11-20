export interface MultiChannelWaveform {
  fs: number; // Sampling rate in Hz
  channels: {
    ecgLeadII: number[];
    ppg: number[];
    abp?: number[];
    respiration?: number[];
  };
  durationSec: number;
  isSynthetic: boolean;
  patientId: string;
}

/**
 * Generates physiologically synchronized synthetic waveforms
 * ECG: Multi-Gaussian Lead II with P, Q, R, S, T complex
 * PPG: Peripheral pulse delayed by PTT, with systolic peak and dicrotic notch
 * ABP: Arterial line waveform with dicrotic notch and matching SBP/DBP
 * Resp: Thoracic impedance respiration wave matching RR
 */
export function generateSyntheticPhysiology(
  fs: number,
  durationSec: number,
  hrBpm: number,
  rrBpm: number,
  sbp: number = 120,
  dbp: number = 80,
  spo2: number = 98,
  addArtifact: boolean = false
): MultiChannelWaveform {
  const totalSamples = Math.round(fs * durationSec);
  const ecgLeadII = new Float32Array(totalSamples);
  const ppg = new Float32Array(totalSamples);
  const abp = new Float32Array(totalSamples);
  const respiration = new Float32Array(totalSamples);

  const cardiacCycleSec = 60 / Math.max(30, Math.min(220, hrBpm));
  const respCycleSec = 60 / Math.max(6, Math.min(60, rrBpm));

  // Pulse Transit Time (R-peak to peripheral pulse arrival, ~200ms depending on BP)
  const pttSec = 0.16 + (140 - Math.min(180, sbp)) * 0.0006;

  let cardiacPhase = 0;
  let respPhase = 0;
  const dt = 1 / fs;

  for (let n = 0; n < totalSamples; n++) {
    const t = n / fs;

    // Respiration wave with continuous phase
    respPhase = (respPhase + dt / respCycleSec) % 1.0;
    const respWave = Math.sin(2 * Math.PI * respPhase);
    respiration[n] = respWave;

    // Respiratory Sinus Arrhythmia (RSA) continuous integration
    const instantaneousPeriod = cardiacCycleSec * (1 + 0.03 * respWave);
    cardiacPhase = (cardiacPhase + dt / instantaneousPeriod) % 1.0;

    // 1. ECG Lead II Synthesis (Gaussian sum model)
    // P wave: center 0.18, width 0.03, amp 0.15 mV
    const pWave = 0.16 * Math.exp(-Math.pow((cardiacPhase - 0.18) / 0.03, 2));
    // Q wave: center 0.28, width 0.015, amp -0.15 mV
    const qWave = -0.15 * Math.exp(-Math.pow((cardiacPhase - 0.28) / 0.015, 2));
    // R peak: center 0.32, width 0.016, amp 1.35 mV
    const rWave = 1.35 * Math.exp(-Math.pow((cardiacPhase - 0.32) / 0.016, 2));
    // S wave: center 0.35, width 0.016, amp -0.32 mV
    const sWave = -0.32 * Math.exp(-Math.pow((cardiacPhase - 0.35) / 0.016, 2));
    // T wave: center 0.55, width 0.070, amp 0.35 mV
    const tWave = 0.32 * Math.exp(-Math.pow((cardiacPhase - 0.55) / 0.070, 2));

    let ecgSample = pWave + qWave + rWave + sWave + tWave;

    // 2. PPG Synthesis (Delayed by physiological PTT ~180-220ms)
    // PPG systolic peak arrives at cardiacPhase = 0.32 + (pttSec / cardiacCycleSec)
    const pttPhase = pttSec / cardiacCycleSec;
    const ppgPeakPhase = (0.32 + pttPhase) % 1.0;
    const ppgDist = Math.min(
      Math.abs(cardiacPhase - ppgPeakPhase),
      1.0 - Math.abs(cardiacPhase - ppgPeakPhase)
    );
    const ppgSystolic = Math.exp(-Math.pow(ppgDist / 0.12, 2));
    const ppgDiastolicPhase = (ppgPeakPhase + 0.18) % 1.0;
    const ppgDiastolicDist = Math.min(
      Math.abs(cardiacPhase - ppgDiastolicPhase),
      1.0 - Math.abs(cardiacPhase - ppgDiastolicPhase)
    );
    const ppgDiastolic = 0.20 * Math.exp(-Math.pow(ppgDiastolicDist / 0.08, 2));
    let ppgSample = (ppgSystolic + ppgDiastolic) * (spo2 / 100);

    // 3. Arterial Blood Pressure (ABP) Waveform (mmHg)
    const pulsePressure = sbp - dbp;
    let abpSample = dbp + ppgSample * pulsePressure;

    // Baseline drift or artifact if flagged (e.g. Bed 05)
    if (addArtifact) {
      // 50 Hz powerline interference + sensor disconnect
      ecgSample = 0.005 * Math.sin(2 * Math.PI * 50 * t);
      ppgSample = 0.002 * Math.sin(2 * Math.PI * 50 * t);
      abpSample = dbp;
    } else {
      // Subtle baseline wander (0.10 Hz)
      ecgSample += 0.02 * Math.sin(2 * Math.PI * 0.10 * t);
    }

    ecgLeadII[n] = ecgSample;
    ppg[n] = ppgSample;
    abp[n] = abpSample;
  }

  return {
    fs,
    channels: {
      ecgLeadII: Array.from(ecgLeadII),
      ppg: Array.from(ppg),
      abp: Array.from(abp),
      respiration: Array.from(respiration),
    },
    durationSec,
    isSynthetic: true,
    patientId: 'synthetic',
  };
}
