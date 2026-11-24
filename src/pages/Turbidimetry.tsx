import { ModulePage } from '../components/education/ModulePage';
import { TurbidimetryDiagram } from '../components/visualizations/TurbidimetryDiagram';
import { turbidimetryContent } from '../data/content/turbidimetry';
import { topicById } from '../data/topics';

export default function Turbidimetry() {
  return (
    <ModulePage
      topic={topicById('turbidimetriya')}
      content={turbidimetryContent}
      visualization={
        <>
        <TurbidimetryDiagram />
        </>
      }
    />
  );
}
