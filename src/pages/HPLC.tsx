import { ModulePage } from '../components/education/ModulePage';
import { HPLCDiagram } from '../components/visualizations/HPLCDiagram';
import { hplcContent } from '../data/content/hplc';
import { topicById } from '../data/topics';

export default function HPLC() {
  return (
    <ModulePage
      topic={topicById('hplc')}
      content={hplcContent}
      visualization={
        <>
        <HPLCDiagram />
        </>
      }
    />
  );
}
