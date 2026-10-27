import React from 'react';
import { WebUnsupported } from '@/components/common/WebUnsupported';

export type { TerrainLayers } from './TerrainView';

export function TerrainView(_props: Record<string, unknown>) {
  return <WebUnsupported what="The 3D lake view" />;
}
