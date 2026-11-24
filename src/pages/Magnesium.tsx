import { ModulePage } from '../components/education/ModulePage';
import { MagnesiumDiagram } from '../components/visualizations/MagnesiumDiagram';
import { magnesiumContent } from '../data/content/magnesium';
import { topicById } from '../data/topics';

export default function Magnesium() {
  return (
    <ModulePage
      topic={topicById('magnezii')}
      content={magnesiumContent}
      visualization={
        <>
        <MagnesiumDiagram />
        </>
      }
    />
  );
}
