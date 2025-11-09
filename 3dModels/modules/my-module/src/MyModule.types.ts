import type { StyleProp, ViewStyle } from 'react-native';

export type OnLoadEventPayload = {
  url: string;
};

export type ChangeEventPayload = {
  value: string;
};

export type ProgressEventPayload = {
  fractionComplete: number;
  request: string;
};

export type LogEventPayload = {
  message: string;
};

export type ErrorEventPayload = {
  message: string;
};

export type PhotogrammetryOptions = {
  inputFolder: string;
  outputFile: string;
  detail?: 'preview' | 'reduced' | 'medium' | 'full' | 'raw';
  sampleOrdering?: 'unordered' | 'sequential';
  featureSensitivity?: 'normal' | 'high';
};

export type MyModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
  onProgress: (params: ProgressEventPayload) => void;
  onLog: (params: LogEventPayload) => void;
  onError: (params: ErrorEventPayload) => void;
};

export type MyModuleViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};
