import type { ModuleContent } from '../../types';
import { turbidimetryContent } from './turbidimetry';
import { magnesiumContent } from './magnesium';
import { phosphorusContent } from './phosphorus';
import { iseContent } from './ise';
import { bloodGasContent } from './bloodGas';
import { hplcContent } from './hplc';
import { calibrationContent } from './calibration';
import { qualityControlContent } from './qualityControl';

/** Регистър на съдържанието по идентификатор на темата (вж. src/data/topics.ts). */
export const contentById: Record<string, ModuleContent> = {
  turbidimetriya: turbidimetryContent,
  magnezii: magnesiumContent,
  fosfor: phosphorusContent,
  ise: iseContent,
  'kravno-gazov': bloodGasContent,
  hplc: hplcContent,
  kalibraciya: calibrationContent,
  'kachestven-kontrol': qualityControlContent,
};
