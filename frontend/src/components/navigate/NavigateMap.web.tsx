import React from 'react';
import { WebUnsupported } from '@/components/common/WebUnsupported';

export type { NavigateMapType, NavigateMapProps } from './NavigateMap';

export function NavigateMap(_props: Record<string, unknown>) {
  return <WebUnsupported what="The route map" />;
}
