import { ModulePage } from '../components/education/ModulePage';
import { BloodGasDiagram } from '../components/visualizations/BloodGasDiagram';
import { AcidBaseExplorer } from '../components/visualizations/AcidBaseExplorer';
import { bloodGasContent } from '../data/content/bloodGas';
import { topicById } from '../data/topics';

export default function BloodGas() {
  return (
    <ModulePage
      topic={topicById('kravno-gazov')}
      content={bloodGasContent}
      visualization={
        <>
        <BloodGasDiagram />
        <AcidBaseExplorer />
        </>
      }
    />
  );
}
