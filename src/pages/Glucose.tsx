import { ModulePage } from '../components/education/ModulePage';
import { GlucoseDiagram } from '../components/visualizations/GlucoseDiagram';
import { glucoseContent } from '../data/content/glucose';
import { topicById } from '../data/topics';

export default function Glucose() {
  return <ModulePage topic={topicById('glyukoza')} content={glucoseContent} visualization={<GlucoseDiagram />} />;
}
