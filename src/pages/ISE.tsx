import { ModulePage } from '../components/education/ModulePage';
import { ISEDiagram } from '../components/visualizations/ISEDiagram';
import { DirectVsIndirectDiagram } from '../components/visualizations/DirectVsIndirectDiagram';
import { iseContent } from '../data/content/ise';
import { topicById } from '../data/topics';

export default function ISE() {
  return (
    <ModulePage
      topic={topicById('ise')}
      content={iseContent}
      visualization={
        <>
        <ISEDiagram />
        <DirectVsIndirectDiagram />
        </>
      }
    />
  );
}
