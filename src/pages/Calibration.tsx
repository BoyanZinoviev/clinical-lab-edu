import { ModulePage } from '../components/education/ModulePage';
import { CalibrationManual } from '../components/visualizations/CalibrationManual';
import { CalibrationAuto } from '../components/visualizations/CalibrationAuto';
import { calibrationContent } from '../data/content/calibration';
import { topicById } from '../data/topics';

export default function Calibration() {
  return (
    <ModulePage
      topic={topicById('kalibraciya')}
      content={calibrationContent}
      visualization={
        <>
        <CalibrationManual />
        <CalibrationAuto />
        </>
      }
    />
  );
}
