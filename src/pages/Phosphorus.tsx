import { ModulePage } from '../components/education/ModulePage';
import { PhosphorusDiagram } from '../components/visualizations/PhosphorusDiagram';
import { phosphorusContent } from '../data/content/phosphorus';
import { topicById } from '../data/topics';

export default function Phosphorus() {
  return <ModulePage topic={topicById('fosfor')} content={phosphorusContent} visualization={<PhosphorusDiagram />} />;
}
